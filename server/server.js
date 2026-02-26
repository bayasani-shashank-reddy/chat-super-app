require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();

// Accept requests from any origin (Vercel, localhost, etc.)
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

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

// Socket.io — accept connections from any origin
const io = new Server(server, {
  cors: {
    origin: true,
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