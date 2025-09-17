<div align="center">
  
# Movie-Party 🎬
**A real-time synchronized movie watching experience with friends** 🚀

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white) 
![HTML](https://img.shields.io/badge/HTML-e34c26?style=for-the-badge&logo=html5&logoColor=white) 
![JavaScript](https://img.shields.io/badge/JavaScript-f1e05a?style=for-the-badge&logo=javascript&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)

[![Stars](https://img.shields.io/github/stars/Binidu01/Movie-Party?style=for-the-badge&logo=github)](https://github.com/Binidu01/Movie-Party/stargazers)
[![Forks](https://img.shields.io/github/forks/Binidu01/Movie-Party?style=for-the-badge&logo=github)](https://github.com/Binidu01/Movie-Party/network/members)
[![Issues](https://img.shields.io/github/issues/Binidu01/Movie-Party?style=for-the-badge&logo=github)](https://github.com/Binidu01/Movie-Party/issues)
[![License](https://img.shields.io/github/license/Binidu01/Movie-Party?style=for-the-badge)](https://github.com/Binidu01/Movie-Party/blob/main/LICENSE)

</div>

---

## 📋 Table of Contents
- [🚀 Features](#-features)
- [🎭 What's New](#-whats-new)
- [🛠️ Installation](#️-installation)
- [💻 Usage](#-usage)
- [🏗️ Built With](#️-built-with)
- [📁 Project Structure](#-project-structure)
- [🎮 How It Works](#-how-it-works)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [📞 Contact](#-contact)
- [🙏 Acknowledgments](#-acknowledgments)

---

## 🚀 Features

### 🎬 **Video Synchronization**
- ✨ Real-time video playback synchronization across all participants
- 🎯 Automatic time sync to keep everyone perfectly aligned
- 📱 Support for multiple video formats (MP4, MKV, WebM, AVI, etc.)
- 🔄 Admin controls with permission system

### 📝 **Advanced Subtitle Support**
- 🌐 Multi-format subtitle support (.srt, .vtt, .ass, .ssa)
- 🔄 Automatic format conversion to WebVTT
- 🎨 Customizable subtitle styling with background overlay
- 📤 Upload multiple subtitle files simultaneously
- 🔗 Synchronized subtitle selection across all users

### 💬 **Live Chat System**
- 💬 YouTube-style live chat interface
- 👤 User avatars with color-coded identification
- ⏰ Timestamp support for all messages
- 📜 Persistent chat history during sessions
- 🔔 System notifications for user events

### 🎛️ **Room Management**
- 🏠 Unique room codes for private sessions
- 👑 Admin system with permission controls
- 🚪 User join/leave notifications
- 🛑 Session termination by admin
- 📊 Real-time user list display

### 🎨 **Modern UI/UX**
- 🌙 Dark theme optimized for movie watching
- 📱 Fully responsive design for all devices
- 🎯 Intuitive controls with hover effects
- 🔧 Resizable chat panel with drag support
- 📤 Progress indicators for uploads
- 🎨 Auto-hiding top bar for immersive viewing

---

## 🎭 What's New

### 🆕 Latest Updates
- 📝 **Multi-format subtitle support** with automatic conversion
- 🎨 **Enhanced UI** with better visual hierarchy
- 🔄 **Improved synchronization** algorithm
- 📤 **Bulk subtitle upload** capability
- 🎯 **Better error handling** and user feedback
- 🚀 **Performance optimizations** for large files
- 🔧 **Resizable interface** components

---

## 🛠️ Installation

### Prerequisites
- **Node.js** (v14 or higher)
- **npm** or **yarn**
- Modern web browser with WebRTC support

### Quick Start
```bash
# Clone the repository
git clone https://github.com/Binidu01/Movie-Party.git

# Navigate to project directory
cd Movie-Party

# Install dependencies
npm install

# Create required directories
mkdir uploads subtitles

# Start the server
npm start
```

The application will be available at [http://localhost:3000](http://localhost:3000)

### Development Mode
```bash
# Start with auto-reload for development
npm run dev
```

---

## 💻 Usage

### Creating a Room
1. Visit the homepage
2. Click "Create Room" to generate a unique room code
3. Upload your video file
4. Share the room code with friends

### Joining a Room
1. Enter the room code on the homepage
2. Choose your username
3. Join the synchronized viewing experience

### Subtitle Management
1. Click the "📝 Subtitles" button in the room
2. Upload subtitle files (.srt, .vtt, .ass, .ssa)
3. Select desired subtitle track
4. All users will see the same subtitles

### Admin Controls
- **Change Media**: Upload new video/audio files
- **Grant Permissions**: Allow others to change media
- **End Session**: Terminate the room for everyone

---

## 🏗️ Built With

- **Backend**: Node.js, Express.js
- **Real-time Communication**: Socket.io
- **File Handling**: Multer
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Video Processing**: HTML5 Video API
- **Subtitle Processing**: Custom conversion algorithms

### 📊 Language Breakdown
- **JavaScript** - 65% (Server + Client logic)
- **HTML** - 25% (Structure & Templates)
- **CSS** - 10% (Styling & Animations)

---

## 📁 Project Structure

```
Movie-Party/
├── server.js              # Main server file
├── public/
│   ├── room.html          # Watch room interface
│   └── upload.html        # Upload page
├── uploads/               # Video files by room
│   └── [roomId]/
│       └── video_files
├── subtitles/             # Subtitle files by room
│   └── [roomId]/
│       └── subtitle_files.vtt
├── package.json           # Dependencies & scripts
└── README.md             # This file
```

---

## 🎮 How It Works

### 🔄 Synchronization Algorithm
1. **Master-Slave Model**: Admin controls playback state
2. **Time Drift Correction**: Automatic sync every second
3. **Buffer Management**: Smart buffering for smooth playback
4. **Network Resilience**: Handles connection drops gracefully

### 📡 Real-time Features
- **WebSocket Communication** via Socket.io
- **Event-Driven Architecture** for instant updates
- **Room-based Isolation** for multiple concurrent sessions
- **Automatic Cleanup** when sessions end

### 🎭 Subtitle Processing
```javascript
// Automatic format conversion
SRT → WebVTT (Time format conversion)
ASS/SSA → WebVTT (Style tag removal)
VTT → Direct serving
```

---

## 🤝 Contributing

We love contributions! Here's how you can help:

### 🐛 Bug Reports
- Use GitHub Issues with detailed descriptions
- Include browser/OS information
- Provide reproduction steps

### 💡 Feature Requests
- Discuss new ideas in Issues first
- Consider backward compatibility
- Think about user experience impact

### 🔧 Development Workflow
1. Fork the Project
2. Create your Feature Branch `git checkout -b feature/AmazingFeature`
3. Commit your Changes `git commit -m 'Add some AmazingFeature'`
4. Push to the Branch `git push origin feature/AmazingFeature`
5. Open a Pull Request

### 🎯 Areas for Contribution
- [ ] Mobile app development
- [ ] Additional video format support
- [ ] Advanced chat features (emojis, reactions)
- [ ] User authentication system
- [ ] Video quality selection
- [ ] Screen sharing capabilities

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 Contact

**Binidu01** - [@Binidu01](https://github.com/Binidu01)

Project Link: [https://github.com/Binidu01/Movie-Party](https://github.com/Binidu01/Movie-Party)

---

## 🙏 Acknowledgments

- 🎬 Inspired by Netflix Party and similar synchronized viewing platforms
- 🚀 Built with the amazing open-source community
- 💡 Special thanks to Socket.io team for real-time capabilities
- 🎨 UI/UX inspiration from modern streaming platforms
- 📝 Subtitle format specifications from W3C and community standards
- ☕ Fueled by countless hours of coffee and determination

---

<div align="center">
  
### 🌟 **Show Your Support**

If this project helped you, please consider:
- ⭐ **Starring** this repository
- 🍴 **Forking** for your own modifications  
- 📢 **Sharing** with friends who love movie nights
- 🐛 **Reporting** any bugs you find
- 💡 **Suggesting** new features

**[⬆ Back to Top](#movie-party-)**

---

**Made with ❤️ by [Binidu01](https://github.com/Binidu01)**

*"Bringing people together, one movie at a time"* 🎬✨

</div>
