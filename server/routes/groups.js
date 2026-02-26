const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const Group = require('../models/Group');
const GroupMessage = require('../models/GroupMessage');
const User = require('../models/User');

// Shared io reference so we can emit from routes
let _io = null;
router.setIo = (io) => { _io = io; };

// Create group — notifies all added members in real time
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, members } = req.body;
    const allMembers = [req.userId, ...members.filter(m => m !== req.userId)];
    const group = await Group.create({
      name,
      description,
      members: allMembers,
      admins: [req.userId],
      createdBy: req.userId
    });
    const populated = await Group.findById(group._id).populate('members', 'username avatar');

    // Notify each member via socket so their GroupList updates in real time
    if (_io) {
      // Also join all members into the group socket room
      allMembers.forEach(uid => {
        _io.to(uid.toString()).emit('groupCreated', populated);
        const sockets = _io.sockets.adapter.rooms.get(uid.toString());
        if (sockets) {
          sockets.forEach(socketId => {
            _io.sockets.sockets.get(socketId)?.join(`group_${group._id}`);
          });
        }
      });
    }

    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user's groups
router.get('/', authMiddleware, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.userId }).populate('members', 'username avatar');
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single group by ID
router.get('/:groupId', authMiddleware, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate('members', 'username avatar')
      .populate('admins', 'username')
      .populate('createdBy', 'username');
    if (!group) return res.status(404).json({ error: 'Group not found' });
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update group (admin only)
router.put('/:groupId', authMiddleware, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const isAdmin = group.admins.some(a => a.toString() === req.userId);
    if (!isAdmin) return res.status(403).json({ error: 'Only admins can update the group' });

    const { name, description, avatar } = req.body;
    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    if (avatar !== undefined) group.avatar = avatar;

    await group.save();
    const populated = await Group.findById(group._id)
      .populate('members', 'username avatar')
      .populate('admins', 'username');

    // Notify all members of the update
    if (_io) {
      populated.members.forEach(m => {
        _io.to(m._id.toString()).emit('groupUpdated', populated);
      });
    }

    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add member to group (admin only)
router.post('/:groupId/members', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const isAdmin = group.admins.some(a => a.toString() === req.userId);
    if (!isAdmin) return res.status(403).json({ error: 'Only admins can add members' });

    await Group.findByIdAndUpdate(req.params.groupId, { $addToSet: { members: userId } });
    const populated = await Group.findById(req.params.groupId).populate('members', 'username avatar');

    // Notify the new member and all existing members
    if (_io) {
      // Add new member to group socket room
      const sockets = _io.sockets.adapter.rooms.get(userId.toString());
      if (sockets) {
        sockets.forEach(socketId => {
          _io.sockets.sockets.get(socketId)?.join(`group_${req.params.groupId}`);
        });
      }
      // Tell new member they were added to a group
      _io.to(userId.toString()).emit('groupCreated', populated);
      // Update all existing members' group info
      populated.members.forEach(m => {
        _io.to(m._id.toString()).emit('groupUpdated', populated);
      });
    }

    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove member from group (admin only)
router.delete('/:groupId/members/:userId', authMiddleware, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const isAdmin = group.admins.some(a => a.toString() === req.userId);
    if (!isAdmin && req.params.userId !== req.userId) {
      return res.status(403).json({ error: 'Only admins can remove members' });
    }

    await Group.findByIdAndUpdate(req.params.groupId, { $pull: { members: req.params.userId } });

    if (_io) {
      _io.to(req.params.userId).emit('groupRemoved', { groupId: req.params.groupId });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get group messages
router.get('/:groupId/messages', authMiddleware, async (req, res) => {
  try {
    const messages = await GroupMessage.find({ group: req.params.groupId })
      .populate('sender', 'username avatar')
      .sort('timestamp');
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;