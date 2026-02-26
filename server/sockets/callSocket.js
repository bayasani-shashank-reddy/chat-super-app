module.exports = (io) => {
  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;

    // ── Initiate a call ──────────────────────────────────────
    // `to` is the target userId — they have joined a room with their own userId
    socket.on('call-user', ({ from, to, offer, callerName, isVideo }) => {
      console.log(`[call] ${from} → ${to} (${isVideo ? 'video' : 'audio'})`);
      io.to(to).emit('incoming-call', { from, offer, callerName, isVideo });
    });

    // ── Accept a call ────────────────────────────────────────
    socket.on('answer-call', ({ to, answer }) => {
      io.to(to).emit('call-answered', { answer });
    });

    // ── ICE candidates (trickle ICE) ─────────────────────────
    socket.on('ice-candidate', ({ to, candidate }) => {
      io.to(to).emit('ice-candidate', { candidate });
    });

    // ── End / decline ────────────────────────────────────────
    socket.on('end-call', ({ to }) => {
      io.to(to).emit('call-ended');
    });

    socket.on('decline-call', ({ to }) => {
      io.to(to).emit('call-declined');
    });
  });
};