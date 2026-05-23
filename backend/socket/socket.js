const { Server } = require('socket.io');
const mongoose = require('mongoose');
const Conversation = require('../models/conversation.model');
const Message = require('../models/message.model');

const onlineUsers = new Map();

function emitOnlineUsers(io) {
  io.emit('onlineUsers', Array.from(onlineUsers.keys()));
}

function emitConversationUpdated(io, conversation) {
  conversation.participants.forEach((participantId) => {
    io.to(`user:${participantId.toString()}`).emit('conversationUpdated', {
      conversationId: conversation._id.toString(),
      lastMessage: conversation.lastMessage,
      lastMessageTime: conversation.lastMessageTime,
    });
  });
}

function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('setup', (data) => {
      const userId = typeof data === 'object' ? data?.userId : data;

      if (!userId) {
        return;
      }

      const normalizedUserId = userId.toString();

      if (!mongoose.Types.ObjectId.isValid(normalizedUserId)) {
        socket.emit('setupError', { message: 'Invalid user ID' });
        return;
      }

      socket.userId = normalizedUserId;
      socket.join(`user:${normalizedUserId}`);
      onlineUsers.set(normalizedUserId, socket.id);

      socket.emit('setupComplete', {
        userId: normalizedUserId,
        socketId: socket.id,
      });

      emitOnlineUsers(io);

      console.log(`User connected: ${normalizedUserId}`);
    });

    socket.on('joinConversation', (data) => {
      const conversationId = typeof data === 'object' ? data?.conversationId : data;

      if (!conversationId) {
        return;
      }

      socket.join(conversationId.toString());
      console.log(`Socket ${socket.id} joined room: ${conversationId}`);
    });

    socket.on('getOnlineUsers', () => {
      socket.emit('onlineUsers', Array.from(onlineUsers.keys()));
    });

    socket.on('typing', (data) => {
      const conversationId = typeof data === 'object' ? data?.conversationId : data;
      const userName = typeof data === 'object' ? data?.userName : undefined;
      const userId = socket.userId || data?.userId?.toString();

      if (!userId || !conversationId) {
        return;
      }

      socket.to(conversationId.toString()).emit('typing', {
        conversationId: conversationId.toString(),
        userId,
        userName,
      });
    });

    socket.on('stopTyping', (data) => {
      const conversationId = typeof data === 'object' ? data?.conversationId : data;
      const userId = socket.userId || data?.userId?.toString();

      if (!userId || !conversationId) {
        return;
      }

      socket.to(conversationId.toString()).emit('stopTyping', {
        conversationId: conversationId.toString(),
        userId,
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

        const conversation = await Conversation.findById(conversationId);

        if (conversation) {
          emitConversationUpdated(io, conversation);
        }
      } catch (error) {
        console.error('Message seen error:', error);
      }
    });

    socket.on('sendMessage', async (data, callback) => {
      try {
        const { conversationId } = data || {};
        const text = data?.text || data?.message?.text;
        const trimmedText = text?.trim();

        if (!socket.userId) {
          if (callback) {
            callback({ error: 'User is not set up' });
          }
          return;
        }

        if (!conversationId || !trimmedText) {
          if (callback) {
            callback({ error: 'conversationId and text are required' });
          }
          return;
        }

        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: socket.userId,
        });

        if (!conversation) {
          if (callback) {
            callback({ error: 'Conversation not found' });
          }
          return;
        }

        const savedMessage = await Message.create({
          conversationId,
          sender: socket.userId,
          text: trimmedText,
          status: 'sent',
        });

        const populatedMessage = await savedMessage.populate('sender', 'username email');

        conversation.lastMessage = trimmedText;
        conversation.lastMessageTime = new Date();
        await conversation.save();

        io.to(conversationId).emit('receiveMessage', populatedMessage);
        emitConversationUpdated(io, conversation);

        if (callback) {
          callback(populatedMessage);
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
