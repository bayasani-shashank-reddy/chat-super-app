const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const Notification = require('../models/Notification');

// Get unread notifications
router.get('/', authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.userId, read: false }).sort('-createdAt');
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark as read
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;