const GroupMessage = require('../models/GroupMessage');
const Notification = require('../models/Notification');
const Group = require('../models/Group');

module.exports = (io) => {
  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;

    // Join a specific group room manually (when user opens the group chat)
    socket.on('joinGroup', (groupId) => {
      socket.join(`group_${groupId}`);
    });

    // Send group message
    socket.on('sendGroupMessage', async (data) => {
      const { groupId, sender, content, fileUrl, fileType } = data;
      try {
        const message = await GroupMessage.create({
          group: groupId,
          sender,
          content,
          fileUrl,
          fileType
        }).then(m => m.populate('sender', 'username avatar'));

        // Emit to everyone in the group room (all members auto-joined on connect via chatSocket)
        io.to(`group_${groupId}`).emit('receiveGroupMessage', message);

        // Notifications for members not in the chat room
        const group = await Group.findById(groupId).populate('members');
        const otherMembers = group.members.filter(m => m._id.toString() !== sender);
        for (let member of otherMembers) {
          io.to(member._id.toString()).emit('newNotification', {
            type: 'groupMessage',
            groupId,
            groupName: group.name,
            message: `New message in ${group.name}`
          });
        }
      } catch (err) {
        console.error('sendGroupMessage error:', err.message);
      }
    });
  });
};