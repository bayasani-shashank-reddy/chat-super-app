const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['message', 'call', 'game_invite', 'group_invite', 'system'], required: true },
  content: { type: String, required: true },
  relatedId: { type: mongoose.Schema.Types.ObjectId }, // e.g., messageId, callId, gameId
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', NotificationSchema);