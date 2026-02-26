const router = require('express').Router();
const UsageLog = require('../models/UsageLog');
const authMiddleware = require('../middleware/auth');

// Log login
router.post('/login', authMiddleware, async (req, res) => {
  try {
    const log = await UsageLog.create({ userId: req.userId, loginTime: new Date() });
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Log logout
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const log = await UsageLog.findOne({ userId: req.userId, logoutTime: null }).sort('-loginTime');
    if (log) {
      log.logoutTime = new Date();
      log.duration = Math.round((log.logoutTime - log.loginTime) / 60000); // minutes
      await log.save();
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user's total usage
router.get('/total', authMiddleware, async (req, res) => {
  try {
    const logs = await UsageLog.find({ userId: req.userId });
    const total = logs.reduce((acc, log) => acc + (log.duration || 0), 0);
    res.json({ total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;