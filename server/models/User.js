const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  displayName: { type: String, default: '' },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: { type: String, default: '' },
  totalUsage: { type: Number, default: 0 }, // minutes
  online: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);