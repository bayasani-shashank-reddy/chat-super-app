const mongoose = require('mongoose');

const GameSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  gameType: {
    type: String,
    enum: ['tictactoe', 'connect4', 'rps', 'chess'],  // ← chess added
    default: 'tictactoe',
  },
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  board: { type: mongoose.Schema.Types.Mixed },   // flexible: 1D for TTT, 2D for C4, null for chess
  turn: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  winner: { type: String, default: null },          // String: userId | 'draw' | null
  // RPS specific
  round: { type: Number, default: 1 },
  roundMoves: { type: Map, of: String },
  scores: { type: Map, of: Number },
}, { timestamps: true });

module.exports = mongoose.model('Game', GameSchema);
