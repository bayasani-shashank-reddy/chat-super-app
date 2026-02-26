const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) return res.status(400).json({ error: 'User already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hashed });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ token, user: { id: user._id, username, email, avatar: user.avatar, displayName: user.displayName } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ token, user: { id: user._id, username: user.username, email, avatar: user.avatar, displayName: user.displayName } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user profile
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user._id, username: user.username, email: user.email, avatar: user.avatar, displayName: user.displayName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update current user profile
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { username, displayName, avatar, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // If updating password, verify current password first
    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: 'Current password required' });
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
      user.password = await bcrypt.hash(newPassword, 10);
    }

    if (username && username !== user.username) {
      const taken = await User.findOne({ username });
      if (taken) return res.status(400).json({ error: 'Username already taken' });
      user.username = username;
    }
    if (displayName !== undefined) user.displayName = displayName;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();
    res.json({ id: user._id, username: user.username, email: user.email, avatar: user.avatar, displayName: user.displayName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all users except the currently logged-in user
router.get('/users', authMiddleware, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.userId } }).select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single user by their ID (for the chat header)
router.get('/users/:userId', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;