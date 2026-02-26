require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const allowedOrigins = [
  'http://localhost:5173',
  process.env.CLIENT_URL,   // set this to your Vercel URL in Render env vars
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => cb(null, allowedOrigins.includes(origin) || !origin),
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // increased limit for base64 avatars

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/usage', require('./routes/usage'));
app.use('/api/upload', require('./routes/upload'));
const groupsRouter = require('./routes/groups');
app.use('/api/groups', groupsRouter);
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/messages', require('./routes/messages'));

// Create HTTP server
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Give groups route access to io for real-time events
groupsRouter.setIo(io);

// Socket handlers
require('./sockets/chatSocket')(io);
require('./sockets/callSocket')(io);
require('./sockets/gameSocket')(io);
require('./sockets/groupSocket')(io);
require('./sockets/notificationSocket')(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));