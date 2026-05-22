const { Server } = require('socket.io');
const Conversation = require('../models/conversation.model');
const Message = require('../models/message.model');

const onlineUsers = new Map();

function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: 'http://localhost:5173',
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('setup', (userId) => {
      if (!userId) {
        return;
      }

      socket.userId = userId;
      onlineUsers.set(userId, socket.id);

      console.log(`User connected: ${userId}`);
    });

    socket.on('joinConversation', (conversationId) => {
      if (!conversationId) {
        return;
      }

      socket.join(conversationId);
      console.log(`Socket ${socket.id} joined room: ${conversationId}`);
    });

    socket.on('sendMessage', async (data, callback) => {
      try {
        const { conversationId, text } = data || {};

        if (!socket.userId) {
          if (callback) {
            callback({ error: 'User is not set up' });
          }
          return;
        }

        if (!conversationId || !text) {
          if (callback) {
            callback({ error: 'conversationId and text are required' });
          }
          return;
        }

        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
          if (callback) {
            callback({ error: 'Conversation not found' });
          }
          return;
        }

        const savedMessage = await Message.create({
          conversationId,
          sender: socket.userId,
          text,
          status: 'sent',
        });

        conversation.lastMessage = text;
        conversation.lastMessageTime = new Date();
        await conversation.save();

        const receiverId = conversation.participants.find(
          (participantId) => participantId.toString() !== socket.userId
        );

        if (receiverId) {
          const receiverSocketId = onlineUsers.get(receiverId.toString());

          if (receiverSocketId) {
            io.to(receiverSocketId).emit('receiveMessage', savedMessage);
          }
        }

        if (callback) {
          callback(savedMessage);
        }
      } catch (error) {
        console.error('Send message error:', error);

        if (callback) {
          callback({ error: 'Failed to send message' });
        }
      }
    });

    socket.on('disconnect', () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        console.log(`User disconnected: ${socket.userId}`);
      } else {
        console.log(`Socket disconnected: ${socket.id}`);
      }
    });
  });

  return io;
}

module.exports = {
  setupSocket,
  onlineUsers,
};
