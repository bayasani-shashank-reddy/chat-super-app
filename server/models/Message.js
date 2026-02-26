const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // content is NOT required — file-only messages (photos, videos, docs) have no text body
  content: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
  fileUrl: { type: String, default: null },
  fileType: { type: String, default: null },
});

module.exports = mongoose.model('Message', MessageSchema);
