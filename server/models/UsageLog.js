const mongoose = require('mongoose');

const UsageLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  loginTime: { type: Date, required: true },
  logoutTime: { type: Date },
  duration: { type: Number, default: 0 } // minutes
});

module.exports = mongoose.model('UsageLog', UsageLogSchema);