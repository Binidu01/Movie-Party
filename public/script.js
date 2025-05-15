const socket = io();
const roomId = window.location.pathname.split('/').pop();
document.getElementById('roomDisplay').innerText = roomId;

const video = document.getElementById('video');
const chat = document.getElementById('chat');
const input = document.getElementById('chatInput');

socket.emit('join-room', roomId);

video.onplay = () => socket.emit('play');
video.onpause = () => socket.emit('pause');
video.onseeked = () => socket.emit('seek', video.currentTime);

socket.on('play', () => video.play());
socket.on('pause', () => video.pause());
socket.on('seek', (time) => video.currentTime = time);

// Chat
function sendMessage() {
  const msg = input.value;
  if (!msg.trim()) return;
  socket.emit('message', msg);
  addMessage("You: " + msg);
  input.value = '';
}

socket.on('message', (msg) => addMessage("Stranger: " + msg));

function addMessage(msg) {
  const li = document.createElement('li');
  li.innerText = msg;
  chat.appendChild(li);
}
