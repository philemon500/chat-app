const mongoose = require('mongoose');
const Conversation = require('../models/conversation.model');
const Message = require('../models/message.model');

async function getUserConversations(req, res) {
  try {
    const userId = req.user.userId;

    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate('participants', 'username email')
      .sort({ updatedAt: -1 });

    const cleanConversations = conversations.map((conversation) => ({
      id: conversation._id,
      participants: conversation.participants.map((participant) => ({
        id: participant._id,
        name: participant.username,
        email: participant.email,
      })),
      lastMessage: conversation.lastMessage,
      lastMessageTime: conversation.lastMessageTime,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    }));

    return res.status(200).json({
      conversations: cleanConversations,
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    return res.status(500).json({
      message: 'Server error',
    });
  }
}

async function getConversationMessages(req, res) {
  try {
    const { conversationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({
        message: 'Invalid conversation ID',
      });
    }

    const currentPage = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (currentPage - 1) * limit;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user.userId,
    });

    if (!conversation) {
      return res.status(404).json({
        message: 'Conversation not found',
      });
    }

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    const totalMessages = await Message.countDocuments({ conversationId });

    return res.status(200).json({
      currentPage,
      totalMessages,
      messages,
    });
  } catch (error) {
    console.error('Get conversation messages error:', error);
    return res.status(500).json({
      message: 'Server error',
    });
  }
}

module.exports = {
  getUserConversations,
  getConversationMessages,
};
