const Game = require('../models/Game');

/* ── Connect Four win detection ─────────────────────────── */
function checkConnectFourWin(board, lastRow, lastCol, playerId) {
  const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (let [dx, dy] of directions) {
    let count = 1;
    for (let step = 1; step < 4; step++) {
      const r = lastRow + dx * step, c = lastCol + dy * step;
      if (r < 0 || r >= 6 || c < 0 || c >= 7 || board[r][c] !== playerId) break;
      count++;
    }
    for (let step = 1; step < 4; step++) {
      const r = lastRow - dx * step, c = lastCol - dy * step;
      if (r < 0 || r >= 6 || c < 0 || c >= 7 || board[r][c] !== playerId) break;
      count++;
    }
    if (count >= 4) return true;
  }
  return false;
}

function freshBoard(gameType) {
  if (gameType === 'tictactoe') return ['', '', '', '', '', '', '', '', ''];
  if (gameType === 'connect4') return Array(6).fill(null).map(() => Array(7).fill(null));
  return null;
}

/* ── In-memory game rooms (supplements DB) ──────────────── */
// This handles the case where DB calls are slow and both clients
// race to create the same room simultaneously.
const rooms = {};  // roomId -> { players, gameType }

module.exports = (io) => {
  io.on('connection', (socket) => {

    console.log('[game] socket connected:', socket.id);

    // ────────────────────────────────────────────────────────
    // CREATE / JOIN GAME
    // Both players emit this when they load the game page.
    // ────────────────────────────────────────────────────────
    socket.on('createGame', async ({ roomId, userId, gameType = 'tictactoe' }) => {
      console.log(`[game] createGame  room=${roomId} user=${userId} type=${gameType}`);
      try {
        socket.join(roomId);

        // ── In-memory room management ──
        if (!rooms[roomId]) {
          rooms[roomId] = { players: [userId], gameType, finished: false };
        } else {
          const room = rooms[roomId];

          // If game was finished, reset it
          if (room.finished) {
            rooms[roomId] = { players: [userId], gameType, finished: false };
            // Also reset in DB
            await Game.deleteOne({ roomId }).catch(() => { });
          }
          // Already has 2 players (reconnect)
          else if (room.players.length >= 2) {
            // Both players already joined — re-send gameStarted
            const game = await Game.findOne({ roomId });
            if (game) {
              io.to(roomId).emit('gameStarted', buildPayload(game));
            }
            return;
          }
          // First player rejoining before game starts
          else if (room.players.includes(userId)) {
            socket.emit('waitingForOpponent', { roomId });
            return;
          }
          // Second player joining
          else {
            room.players.push(userId);
          }
        }

        const room = rooms[roomId];

        // Player 1: create DB record and wait
        if (room.players.length === 1) {
          // Upsert-style: delete any old record then create fresh
          await Game.deleteOne({ roomId }).catch(() => { });
          const game = await Game.create({
            roomId,
            gameType,
            players: [userId],
            board: freshBoard(gameType),
            ...(gameType === 'rps' && { roundMoves: {}, scores: {} }),
          });
          console.log(`[game] room ${roomId}: player 1 waiting`);
          socket.emit('waitingForOpponent', { roomId });
          return;
        }

        // Player 2: add to DB record and start game
        const game = await Game.findOne({ roomId });
        if (!game) {
          socket.emit('gameError', 'Game room disappeared. Please refresh.');
          return;
        }

        // Add player 2 if not already there
        const p2Id = userId;
        if (!game.players.map(p => p.toString()).includes(p2Id)) {
          game.players.push(p2Id);
        }

        // Set initial turn / round state
        if (gameType === 'tictactoe' || gameType === 'connect4' || gameType === 'chess') {
          game.turn = game.players[0];
        } else if (gameType === 'rps') {
          game.round = 1;
          game.roundMoves = new Map();
          game.scores = new Map([
            [game.players[0].toString(), 0],
            [game.players[1].toString(), 0],
          ]);
        }
        await game.save();

        console.log(`[game] room ${roomId}: game started with ${game.players.length} players`);
        io.to(roomId).emit('gameStarted', buildPayload(game));

      } catch (err) {
        console.error('[game] createGame error:', err.message);
        socket.emit('gameError', 'Server error. Please refresh and try again.');
      }
    });

    // ────────────────────────────────────────────────────────
    // RESET GAME (Play Again)
    // ────────────────────────────────────────────────────────
    socket.on('resetGame', async ({ roomId, userId, gameType }) => {
      console.log(`[game] resetGame room=${roomId}`);
      try {
        // Mark in-memory room as finished (triggers reset on next createGame)
        if (rooms[roomId]) rooms[roomId].finished = true;

        await Game.deleteOne({ roomId }).catch(() => { });

        // Re-create for the resetting player
        rooms[roomId] = { players: [userId], gameType, finished: false };
        const game = await Game.create({
          roomId,
          gameType: gameType || 'tictactoe',
          players: [userId],
          board: freshBoard(gameType || 'tictactoe'),
          ...(gameType === 'rps' && { roundMoves: {}, scores: {} }),
        });

        socket.emit('waitingForOpponent', { roomId });
        socket.to(roomId).emit('gameReset', { roomId }); // tell opponent to rejoin
      } catch (err) {
        console.error('[game] resetGame error:', err.message);
      }
    });

    // ────────────────────────────────────────────────────────
    // TIC TAC TOE MOVE
    // ────────────────────────────────────────────────────────
    socket.on('makeMove', async ({ roomId, index, userId }) => {
      try {
        const game = await Game.findOne({ roomId });
        if (!game || game.gameType !== 'tictactoe') return;
        if (game.winner) return;
        if (game.turn?.toString() !== userId) return;
        if (game.board[index] !== '') return;

        const symbol = game.players[0].toString() === userId ? 'X' : 'O';
        game.board[index] = symbol;
        game.markModified('board');

        const wins = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
        let winner = null;
        for (let [a, b, c] of wins) {
          if (game.board[a] && game.board[a] === game.board[b] && game.board[a] === game.board[c]) {
            winner = userId; break;
          }
        }

        if (winner) {
          game.winner = userId;
          await game.save();
          if (rooms[roomId]) rooms[roomId].finished = true;
          io.to(roomId).emit('gameOver', { winner: userId, board: game.board });
        } else if (game.board.every(c => c !== '')) {
          game.winner = 'draw';
          await game.save();
          if (rooms[roomId]) rooms[roomId].finished = true;
          io.to(roomId).emit('gameOver', { winner: null, board: game.board });
        } else {
          game.turn = game.players.find(p => p.toString() !== userId);
          await game.save();
          io.to(roomId).emit('updateBoard', { board: game.board, turn: game.turn.toString() });
        }
      } catch (err) {
        console.error('[game] makeMove error:', err.message);
      }
    });

    // ────────────────────────────────────────────────────────
    // CONNECT FOUR MOVE
    // ────────────────────────────────────────────────────────
    socket.on('makeConnectFourMove', async ({ roomId, column, userId }) => {
      try {
        const game = await Game.findOne({ roomId });
        if (!game || game.gameType !== 'connect4') return;
        if (game.winner) return;
        if (game.turn?.toString() !== userId) return;

        const board = game.board;
        let row = -1;
        for (let r = 5; r >= 0; r--) {
          if (!board[r][column]) { row = r; break; }
        }
        if (row === -1) return;

        board[row][column] = userId;
        game.markModified('board');

        if (checkConnectFourWin(board, row, column, userId)) {
          game.winner = userId;
          await game.save();
          if (rooms[roomId]) rooms[roomId].finished = true;
          io.to(roomId).emit('connectFourGameOver', { winner: userId, board });
        } else if (board.every(r => r.every(c => c))) {
          game.winner = 'draw';
          await game.save();
          if (rooms[roomId]) rooms[roomId].finished = true;
          io.to(roomId).emit('connectFourGameOver', { winner: null, board });
        } else {
          game.turn = game.players.find(p => p.toString() !== userId);
          await game.save();
          io.to(roomId).emit('connectFourUpdate', { board, turn: game.turn.toString() });
        }
      } catch (err) {
        console.error('[game] makeConnectFourMove error:', err.message);
      }
    });

    // ────────────────────────────────────────────────────────
    // ROCK PAPER SCISSORS MOVE
    // ────────────────────────────────────────────────────────
    socket.on('makeRPSMove', async ({ roomId, move, userId }) => {
      try {
        const game = await Game.findOne({ roomId });
        if (!game || game.gameType !== 'rps') return;
        if (game.winner) return;
        if (game.roundMoves?.get(userId)) return;

        if (!game.roundMoves) game.roundMoves = new Map();
        game.roundMoves.set(userId, move);
        game.markModified('roundMoves');

        if (game.roundMoves.size === 2) {
          const [p1, p2] = game.players.map(p => p.toString());
          const m1 = game.roundMoves.get(p1);
          const m2 = game.roundMoves.get(p2);

          let roundWinner = 'draw';
          if (m1 !== m2) {
            const p1wins = (m1 === 'rock' && m2 === 'scissors') || (m1 === 'scissors' && m2 === 'paper') || (m1 === 'paper' && m2 === 'rock');
            roundWinner = p1wins ? p1 : p2;
          }

          if (!game.scores) game.scores = new Map([[p1, 0], [p2, 0]]);
          if (roundWinner !== 'draw') {
            game.scores.set(roundWinner, (game.scores.get(roundWinner) || 0) + 1);
            game.markModified('scores');
          }

          const scoresObj = { [p1]: game.scores.get(p1) || 0, [p2]: game.scores.get(p2) || 0 };
          io.to(roomId).emit('rpsRoundResult', {
            round: game.round || 1,
            moves: { [p1]: m1, [p2]: m2 },
            winner: roundWinner,
            scores: scoresObj,
          });

          const p1Score = game.scores.get(p1) || 0;
          const p2Score = game.scores.get(p2) || 0;

          if (p1Score >= 3 || p2Score >= 3) {
            const finalWinner = p1Score >= 3 ? p1 : p2;
            game.winner = finalWinner;
            await game.save();
            if (rooms[roomId]) rooms[roomId].finished = true;
            io.to(roomId).emit('rpsGameOver', { winner: finalWinner });
          } else {
            game.round = (game.round || 1) + 1;
            game.roundMoves = new Map();
            game.markModified('roundMoves');
            await game.save();
          }
        } else {
          await game.save();
        }
      } catch (err) {
        console.error('[game] makeRPSMove error:', err.message);
      }
    });

    // ────────────────────────────────────────────────────────
    // CHESS MOVE (pure-React board relay — no chess.js)
    // ────────────────────────────────────────────────────────
    socket.on('chessMove', ({ roomId, board, turnColor, lastPawnDouble }) => {
      socket.to(roomId).emit('chessMove', { board, turnColor, lastPawnDouble });
    });

    socket.on('chessGameOver', async ({ roomId, winner }) => {
      try {
        if (rooms[roomId]) rooms[roomId].finished = true;
        await Game.findOneAndUpdate({ roomId }, { winner }).catch(() => { });
        socket.to(roomId).emit('chessGameOver', { winner });
      } catch (err) {
        console.error('[game] chessGameOver error:', err.message);
      }
    });

    // Cleanup in-memory room when socket disconnects
    socket.on('disconnect', () => {
      console.log('[game] socket disconnected:', socket.id);
    });
  });
};

/* ── Payload helper ──────────────────────────────────────── */
function buildPayload(game) {
  return {
    roomId: game.roomId,
    gameType: game.gameType,
    players: game.players.map(p => p.toString()),
    board: game.board,
    turn: game.turn?.toString() || null,
    round: game.round || 1,
    scores: game.scores ? Object.fromEntries(game.scores) : {},
  };
}