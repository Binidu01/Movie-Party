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

// Map<roomId, { users: Map<socketId, { name }>, admin: socketId, chatHistory: [], currentSubtitle: string }>
const RoomUsers = new Map();

// Helper function to convert SRT to VTT
function convertSrtToVtt(srtContent) {
  let vttContent = 'WEBVTT\n\n';
  
  // Replace SRT timestamps with VTT timestamps
  vttContent += srtContent
    .replace(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/g, '$1:$2:$3.$4') // Convert comma to dot
    .replace(/^\d+\s*$/gm, '') // Remove sequence numbers
    .replace(/\n\n\n+/g, '\n\n'); // Clean up extra newlines

  return vttContent;
}

// Helper function to convert ASS/SSA to VTT (basic conversion)
function convertAssToVtt(assContent) {
  let vttContent = 'WEBVTT\n\n';
  
  const lines = assContent.split('\n');
  let dialogueSection = false;
  
  lines.forEach(line => {
    if (line.trim().startsWith('[V4+ Styles]') || line.trim().startsWith('[V4 Styles]')) {
      dialogueSection = false;
    } else if (line.trim().startsWith('[Events]')) {
      dialogueSection = true;
    } else if (dialogueSection && line.startsWith('Dialogue:')) {
      // Parse dialogue line: Dialogue: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
      const parts = line.split(',');
      if (parts.length >= 10) {
        const start = parts[1].trim();
        const end = parts[2].trim();
        const text = parts.slice(9).join(',').replace(/{[^}]*}/g, ''); // Remove ASS tags
        
        // Convert ASS time format (H:MM:SS.CC) to VTT format (HH:MM:SS.CCC)
        const startTime = start.replace(/(\d):(\d{2}):(\d{2})\.(\d{2})/, '0$1:$2:$3.$4' + '0');
        const endTime = end.replace(/(\d):(\d{2}):(\d{2})\.(\d{2})/, '0$1:$2:$3.$4' + '0');
        
        vttContent += `${startTime} --> ${endTime}\n${text.trim()}\n\n`;
      }
    }
  });
  
  return vttContent;
}

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

// Serve subtitles with proper headers
app.use(
  '/subtitles',
  express.static(path.join(__dirname, 'subtitles'), {
    etag: false,
    maxAge: 0,
    setHeaders: (res, filePath) => {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Access-Control-Allow-Origin', '*');
      if (filePath.endsWith('.vtt')) {
        res.setHeader('Content-Type', 'text/vtt');
      }
    },
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

// Get chat history for a room
app.get('/chat-history/:roomId', (req, res) => {
  const roomId = req.params.roomId;
  const roomData = RoomUsers.get(roomId);
  const chatHistory = roomData ? (roomData.chatHistory || []) : [];
  res.json({ chatHistory });
});

// Get available subtitles for a room
app.get('/subtitles/:roomId', (req, res) => {
  const roomId = req.params.roomId;
  const subtitleDir = path.join(__dirname, 'subtitles', roomId);
  
  if (!fs.existsSync(subtitleDir)) {
    return res.json({ subtitles: [] });
  }
  
  fs.readdir(subtitleDir, (err, files) => {
    if (err) return res.json({ subtitles: [] });
    
    const subtitles = files
      .filter(f => /\.(vtt|srt|ass|ssa)$/i.test(f))
      .map(file => ({
        name: path.basename(file, path.extname(file)),
        file: file,
        type: path.extname(file).toLowerCase()
      }));
    
    res.json({ subtitles });
  });
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

// Multer config for subtitle uploads
const subtitleStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'subtitles', req.params.roomId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Convert to VTT if needed and save
    const ext = path.extname(file.originalname).toLowerCase();
    let filename = file.originalname;
    
    if (ext === '.srt' || ext === '.ass' || ext === '.ssa') {
      filename = path.basename(file.originalname, ext) + '.vtt';
    }
    
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 * 1024 }, // 10GB max
  fileFilter: (req, file, cb) => {
    // Check both MIME type and file extension for better compatibility
    const allowedMimes = [
      'video/mp4', 
      'video/webm', 
      'video/x-matroska', // Correct MIME type for .mkv
      'video/quicktime', 
      'video/x-msvideo', // .avi files
      'video/x-ms-wmv', // .wmv files
      'video/x-flv', // .flv files
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg'
    ];
    
    const allowedExtensions = ['.mp4', '.mkv', '.webm', '.mov', '.avi', '.wmv', '.flv', '.mp3', '.wav', '.ogg', '.m4v'];
    
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    // Accept if either MIME type is allowed OR file extension is allowed
    const mimeAllowed = allowedMimes.includes(file.mimetype);
    const extensionAllowed = allowedExtensions.includes(fileExtension);
    
    if (mimeAllowed || extensionAllowed) {
      cb(null, true);
    } else {
      console.log(`Rejected file: ${file.originalname}, MIME: ${file.mimetype}, Extension: ${fileExtension}`);
      return cb(new Error(`Invalid file type. Allowed: ${allowedExtensions.join(', ')}`));
    }
  },
});

const subtitleUpload = multer({
  storage: subtitleStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max for subtitles
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.srt', '.vtt', '.ass', '.ssa'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      return cb(new Error(`Invalid subtitle file type. Allowed: ${allowedExtensions.join(', ')}`));
    }
  },
});

// Handle video upload
app.post('/upload/:roomId', upload.single('video'), (req, res) => {
  const roomId = req.params.roomId;
  
  // Emit media change event to all users in the room
  io.to(roomId).emit('media-changed');
  
  res.redirect(`/room/${roomId}`);
});

// Handle subtitle upload with conversion
app.post('/upload-subtitles/:roomId', subtitleUpload.array('subtitles', 10), (req, res) => {
  const roomId = req.params.roomId;
  const files = req.files;
  
  if (!files || files.length === 0) {
    return res.status(400).json({ success: false, error: 'No files uploaded' });
  }
  
  try {
    // Process each uploaded subtitle file
    files.forEach(file => {
      const filePath = file.path;
      const originalExt = path.extname(file.originalname).toLowerCase();
      
      if (originalExt === '.srt' || originalExt === '.ass' || originalExt === '.ssa') {
        // Read the original file
        const originalContent = fs.readFileSync(filePath, 'utf8');
        let vttContent;
        
        if (originalExt === '.srt') {
          vttContent = convertSrtToVtt(originalContent);
        } else if (originalExt === '.ass' || originalExt === '.ssa') {
          vttContent = convertAssToVtt(originalContent);
        }
        
        // Write the converted VTT file
        fs.writeFileSync(filePath, vttContent, 'utf8');
      }
    });
    
    // Notify all users in the room about new subtitles
    io.to(roomId).emit('subtitles-updated');
    
    res.json({ 
      success: true, 
      message: `Successfully uploaded ${files.length} subtitle file(s)` 
    });
  } catch (error) {
    console.error('Subtitle processing error:', error);
    res.status(500).json({ success: false, error: 'Failed to process subtitle files' });
  }
});

// List files
app.get('/files/:roomId', (req, res) => {
  const dir = path.join(__dirname, 'uploads', req.params.roomId);
  if (!fs.existsSync(dir)) return res.json({ video: null });
  fs.readdir(dir, (err, files) => {
    if (err) return res.json({ video: null });
    const vids = files.filter(f => /\.(mp4|mkv|webm|mov|avi|wmv|flv|m4v|mp3|wav|ogg)$/i.test(f));
    res.json({ video: vids[0] || null });
  });
});

// End session
app.post('/end/:roomId', (req, res) => {
  const roomId = req.params.roomId;
  const uploadDir = path.join(__dirname, 'uploads', roomId);
  const subtitleDir = path.join(__dirname, 'subtitles', roomId);
  
  // Clean up both upload and subtitle directories
  fs.rm(uploadDir, { recursive: true, force: true }, err => {
    if (err) console.error('Error cleaning uploads:', err);
  });
  
  fs.rm(subtitleDir, { recursive: true, force: true }, err => {
    if (err) console.error('Error cleaning subtitles:', err);
  });
  
  io.to(roomId).emit('session-ended');
  RoomUsers.delete(roomId);
  res.json({ success: true });
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
        chatHistory: [], // Initialize empty chat history
        currentSubtitle: null, // Track current subtitle
      });
    }

    const roomData = RoomUsers.get(roomId);
    roomData.users.set(socket.id, { name });

    // Send chat history to the newly joined user
    socket.emit('chat-history', roomData.chatHistory);

    // Send current subtitle to the newly joined user
    if (roomData.currentSubtitle) {
      socket.emit('subtitle-change', { subtitle: roomData.currentSubtitle });
    }

    // Send admin status to the user
    socket.emit('admin-status', { isAdminUser: roomData.admin === socket.id });

    // Add system message about user joining (except for the first user)
    if (roomData.users.size > 1) {
      const joinMessage = {
        name: 'System',
        message: `${name} joined the room`,
        timestamp: new Date().toISOString()
      };
      roomData.chatHistory.push(joinMessage);
      socket.to(roomId).emit('chat-message', joinMessage);
    }

    io.to(roomId).emit('users-updated', Array.from(roomData.users.values()));
  });

  socket.on('leave-room', ({ roomId }) => {
    handleUserLeaving(socket, roomId);
  });

  socket.on('disconnect', () => {
    const { roomId } = socket;
    if (roomId) {
      handleUserLeaving(socket, roomId);
    }
  });

  // Helper function to handle user leaving (either disconnect or explicit leave)
  function handleUserLeaving(socket, roomId) {
    if (roomId && RoomUsers.has(roomId)) {
      const roomData = RoomUsers.get(roomId);
      const leavingUser = roomData.users.get(socket.id);
      roomData.users.delete(socket.id);

      // Add system message about user leaving
      if (leavingUser && roomData.users.size > 0) {
        const leaveMessage = {
          name: 'System',
          message: `${leavingUser.name} left the room`,
          timestamp: new Date().toISOString()
        };
        roomData.chatHistory.push(leaveMessage);
        io.to(roomId).emit('chat-message', leaveMessage);
      }

      // If admin left, reassign to another user
      if (roomData.admin === socket.id) {
        const remaining = Array.from(roomData.users.keys());
        const newAdmin = remaining[0] || null;
        roomData.admin = newAdmin;
        
        // Notify the new admin
        if (newAdmin) {
          io.to(newAdmin).emit('admin-status', { isAdminUser: true });
          
          // Add system message about admin change
          const adminUser = roomData.users.get(newAdmin);
          if (adminUser) {
            const systemMessage = {
              name: 'System',
              message: `${adminUser.name} is now the room admin`,
              timestamp: new Date().toISOString()
            };
            roomData.chatHistory.push(systemMessage);
            io.to(roomId).emit('chat-message', systemMessage);
          }
        }
      }

      // Update user list for remaining users
      io.to(roomId).emit('users-updated', Array.from(roomData.users.values()));

      // Clean up empty rooms
      if (roomData.users.size === 0) {
        RoomUsers.delete(roomId);
      }
    }
  }

  socket.on('chat-message', ({ roomId, msg }) => {
    const roomData = RoomUsers.get(roomId);
    if (roomData) {
      const message = {
        name: socket.name,
        message: msg,
        timestamp: new Date().toISOString()
      };

      // Store in server-side chat history
      roomData.chatHistory.push(message);

      // Broadcast to all users in the room (including sender)
      io.to(roomId).emit('chat-message', message);
    }
  });

  socket.on('video-action', ({ roomId, action, time }) => {
    socket.to(roomId).emit('video-action', { action, time });
  });

  // Handle subtitle changes
  socket.on('subtitle-change', ({ roomId, subtitle }) => {
    const roomData = RoomUsers.get(roomId);
    if (roomData) {
      roomData.currentSubtitle = subtitle;
      // Broadcast subtitle change to all other users
      socket.to(roomId).emit('subtitle-change', { subtitle });
    }
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
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large (max 10GB for videos, 50MB for subtitles)' });
    }
  }
  res.status(500).send(`Server Error: ${err.message}`);
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
