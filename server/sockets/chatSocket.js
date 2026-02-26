const Message = require('../models/Message');
const User = require('../models/User');
const Group = require('../models/Group');

module.exports = (io) => {
  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    console.log('User connected:', socket.id, 'userId:', userId);

    // ── Personal room: join a room named after the userId
    //    This lets callSocket and chatSocket send to a user by their ID
    socket.on('register', (uid) => {
      socket.join(uid);
      console.log(`Socket ${socket.id} registered as user room: ${uid}`);
    });

    // Also join immediately if userId is in query (handles page refresh)
    if (userId) {
      socket.join(userId);
      // Auto-join all groups this user belongs to so they receive messages even without visiting
      Group.find({ members: userId }).then(groups => {
        groups.forEach(g => socket.join(`group_${g._id}`));
        console.log(`User ${userId} auto-joined ${groups.length} group room(s)`);
      }).catch(() => { });

      User.findByIdAndUpdate(userId, { online: true, lastSeen: new Date() }).exec();
    }

    socket.on('joinRoom', ({ userId: uid, room }) => {
      socket.join(room);
    });

    socket.on('sendMessage', async (data) => {
      const { sender, receiver, content = '', fileUrl, fileType } = data;
      try {
        const message = await Message.create({
          sender, receiver,
          content,
          fileUrl: fileUrl || null,
          fileType: fileType || null,
        });
        // Emit to receiver's personal room (joined on register)
        io.to(receiver).emit('receiveMessage', message);
        // Echo back to sender
        socket.emit('messageSent', message);
      } catch (err) {
        console.error('sendMessage error:', err.message);
        socket.emit('messageError', { error: err.message });
      }
    });

    socket.on('typing', ({ userId: uid, receiver }) => {
      socket.to(receiver).emit('typing', { userId: uid });
    });

    socket.on('disconnect', async () => {
      if (userId) {
        await User.findByIdAndUpdate(userId, { online: false, lastSeen: new Date() });
      }
      console.log('User disconnected:', socket.id);
    });
  });
};