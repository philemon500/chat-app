const { Server } = require('socket.io');
const Conversation = require('../models/conversation.model');
const Message = require('../models/message.model');

const onlineUsers = new Map();

function emitOnlineUsers(io) {
  io.emit('onlineUsers', Array.from(onlineUsers.keys()));
}

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

      const normalizedUserId = userId.toString();

      socket.userId = normalizedUserId;
      onlineUsers.set(normalizedUserId, socket.id);

      socket.emit('setupComplete', {
        userId: normalizedUserId,
        socketId: socket.id,
      });

      emitOnlineUsers(io);

      console.log(`User connected: ${normalizedUserId}`);
    });

    socket.on('joinConversation', (conversationId) => {
      if (!conversationId) {
        return;
      }

      socket.join(conversationId);
      console.log(`Socket ${socket.id} joined room: ${conversationId}`);
    });

    socket.on('typing', (conversationId) => {
      if (!socket.userId || !conversationId) {
        return;
      }

      socket.to(conversationId).emit('typing', {
        conversationId,
        userId: socket.userId,
      });
    });

    socket.on('stopTyping', (conversationId) => {
      if (!socket.userId || !conversationId) {
        return;
      }

      socket.to(conversationId).emit('stopTyping', {
        conversationId,
        userId: socket.userId,
      });
    });

    socket.on('seen', async (data) => {
      try {
        const { conversationId, userId } = data || {};

        if (!socket.userId || !conversationId || !userId) {
          return;
        }

        await Message.updateMany(
          {
            conversationId,
            sender: { $ne: userId },
          },
          { $set: { status: 'seen' } }
        );

        io.to(conversationId).emit('messagesSeen', {
          conversationId,
          userId,
        });
      } catch (error) {
        console.error('Message seen error:', error);
      }
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

        io.to(conversationId).emit('receiveMessage', savedMessage);

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
      if (socket.userId && onlineUsers.get(socket.userId) === socket.id) {
        onlineUsers.delete(socket.userId);
        emitOnlineUsers(io);
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
