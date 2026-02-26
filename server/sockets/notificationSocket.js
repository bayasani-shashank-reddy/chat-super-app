module.exports = (io) => {
  io.on('connection', (socket) => {
    // When user connects, join their personal room for notifications
    const userId = socket.handshake.query.userId;
    if (userId) {
      socket.join(userId.toString());
    }
  });
};