const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const Message = require('../models/Message');

// Get messages between current user and another user
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.userId, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.userId }
      ]
    }).sort('timestamp');
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;