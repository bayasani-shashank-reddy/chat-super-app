const mongoose = require('mongoose');

const CallSchema = new mongoose.Schema({
  caller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  duration: { type: Number, default: 0 }, // seconds
  type: { type: String, enum: ['audio', 'video'], required: true }
});

module.exports = mongoose.model('Call', CallSchema);