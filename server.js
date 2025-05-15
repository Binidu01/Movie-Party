// server.js
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { customAlphabet } = require('nanoid');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 6);

// Map<roomId, { users: Map<socketId, { name }>, admin: socketId }>
const RoomUsers = new Map();

// Serve the watch room page if the uploads folder exists
app.get('/room/:roomId', (req, res) => {
  const dir = path.join(__dirname, 'uploads', req.params.roomId);
  if (!fs.existsSync(dir)) {
    return res.status(404).send(`
      <div style="font-family:sans-serif;text-align:center;margin-top:50px;">
        <h1 style="color:#ff5555;">❌ Invalid Room Code</h1>
        <a href="/">Go Home</a>
      </div>`);
  }
  res.sendFile(path.join(__dirname, 'public', 'room.html'));
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'), {
    etag: false,
    maxAge: 0,
    setHeaders: res => res.setHeader('Cache-Control', 'no-store'),
  })
);

// Create a new room
app.get('/create-room', (req, res) => {
  res.json({ roomId: nanoid() });
});

// Upload page
app.get('/upload/:roomId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'upload.html'));
});

// Multer config for handling file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads', req.params.roomId);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, file.originalname),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 * 1024 }, // 10GB max
  fileFilter: (req, file, cb) => {
    const allowed = ['video/mp4', 'video/webm', 'video/mkv', 'video/quicktime', 'audio/mpeg'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Invalid file type'));
    }
    cb(null, true);
  },
});

app.post('/upload/:roomId', upload.single('video'), (req, res) => {
  const roomId = req.params.roomId;
  
  // Emit media change event to all users in the room
  io.to(roomId).emit('media-changed');
  
  res.redirect(`/room/${roomId}`);
});

// List files
app.get('/files/:roomId', (req, res) => {
  const dir = path.join(__dirname, 'uploads', req.params.roomId);
  if (!fs.existsSync(dir)) return res.json({ video: null });
  fs.readdir(dir, (err, files) => {
    if (err) return res.json({ video: null });
    const vids = files.filter(f => /\.(mp4|mkv|webm|mov|mp3)$/i.test(f));
    res.json({ video: vids[0] || null });
  });
});

// End session
app.post('/end/:roomId', (req, res) => {
  const roomId = req.params.roomId;
  const dir = path.join(__dirname, 'uploads', roomId);
  fs.rm(dir, { recursive: true, force: true }, err => {
    if (err) return res.status(500).json({ success: false });
    io.to(roomId).emit('session-ended');
    RoomUsers.delete(roomId);
    res.json({ success: true });
  });
});

// WebSocket handling
io.on('connection', socket => {
  socket.on('join-room', ({ roomId, name }) => {
    socket.join(roomId);
    socket.name = name;
    socket.roomId = roomId;

    if (!RoomUsers.has(roomId)) {
      RoomUsers.set(roomId, {
        users: new Map(),
        admin: socket.id, // first joiner is admin
      });
    }

    const roomData = RoomUsers.get(roomId);
    roomData.users.set(socket.id, { name });

    io.to(roomId).emit('users-updated', Array.from(roomData.users.values()));
  });

  socket.on('disconnect', () => {
    const { roomId } = socket;
    if (roomId && RoomUsers.has(roomId)) {
      const roomData = RoomUsers.get(roomId);
      roomData.users.delete(socket.id);

      // If admin left, reassign
      if (roomData.admin === socket.id) {
        const remaining = Array.from(roomData.users.keys());
        roomData.admin = remaining[0] || null;
      }

      io.to(roomId).emit('users-updated', Array.from(roomData.users.values()));

      if (roomData.users.size === 0) {
        RoomUsers.delete(roomId);
      }
    }
  });

  socket.on('chat-message', ({ roomId, msg }) => {
    socket.to(roomId).emit('chat-message', { name: socket.name, msg });
  });

  socket.on('video-action', ({ roomId, action, time }) => {
    socket.to(roomId).emit('video-action', { action, time });
  });

  socket.on('request-change', ({ roomId, name }) => {
    const roomData = RoomUsers.get(roomId);
    if (roomData && roomData.admin && socket.id !== roomData.admin) {
      io.to(roomData.admin).emit('change-request', {
        from: name,
        requesterId: socket.id,
      });
    }
  });

  socket.on('grant-change', ({ roomId, requesterId }) => {
    io.to(requesterId).emit('change-granted');
  });

  socket.on('deny-request', ({ roomId, userId }) => {
    io.to(userId).emit('request-denied');
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).send('Server Error');
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  const cmd =
    process.platform === 'win32'
      ? 'start'
      : process.platform === 'darwin'
      ? 'open'
      : 'xdg-open';
  require('child_process').exec(`${cmd} http://localhost:${PORT}`);
});
