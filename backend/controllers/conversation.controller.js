const mongoose = require('mongoose');
const Conversation = require('../models/conversation.model');
const Message = require('../models/message.model');
const User = require('../models/user.model');

function formatConversation(conversation) {
  return {
    _id: conversation._id,
    participants: conversation.participants.map((participant) => ({
      _id: participant._id,
      name: participant.username,
      email: participant.email,
    })),
    lastMessage: conversation.lastMessage,
    lastMessageTime: conversation.lastMessageTime,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}

async function createOrGetOneToOneConversation(req, res) {
  try {
    const currentUserId = req.user.userId;
    const { participantId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(participantId)) {
      return res.status(400).json({
        message: 'Invalid participant ID',
      });
    }

    if (participantId === currentUserId) {
      return res.status(400).json({
        message: 'You cannot create a conversation with yourself',
      });
    }

    const participant = await User.findById(participantId);

    if (!participant) {
      return res.status(404).json({
        message: 'Participant not found',
      });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, participantId], $size: 2 },
    }).populate('participants', 'username email');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [currentUserId, participantId],
      });

      conversation = await conversation.populate('participants', 'username email');
    }

    return res.status(200).json({
      conversation: formatConversation(conversation),
    });
  } catch (error) {
    console.error('Create or get conversation error:', error);
    return res.status(500).json({
      message: 'Server error',
    });
  }
}

async function getUserConversations(req, res) {
  try {
    const userId = req.user.userId;

    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate('participants', 'username email')
      .sort({ updatedAt: -1 });

    const cleanConversations = await Promise.all(
      conversations.map(async (conversation) => {
        const unreadCount = await Message.countDocuments({
          conversationId: conversation._id,
          sender: { $ne: userId },
          status: 'sent',
        });

        return {
          id: conversation._id,
          participants: conversation.participants.map((participant) => ({
            id: participant._id,
            name: participant.username,
            email: participant.email,
          })),
          lastMessage: conversation.lastMessage,
          lastMessageTime: conversation.lastMessageTime,
          unreadCount,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        };
      })
    );

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

    // parse query params to numbers with sensible defaults
    const parsedPage = parseInt(req.query.page, 10);
    const parsedLimit = parseInt(req.query.limit, 10);

    const currentPage = Number.isNaN(parsedPage) ? 1 : parsedPage;
    const limit = Number.isNaN(parsedLimit) ? 20 : parsedLimit;

    // ensure positive integers
    const page = Math.max(1, currentPage);
    const perPage = Math.max(1, limit);
    const skip = (page - 1) * perPage;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user.userId,
    }).populate('participants', 'username email');

    if (!conversation) {
      return res.status(404).json({
        message: 'Conversation not found',
      });
    }

    await Message.updateMany(
      {
        conversationId,
        sender: { $ne: req.user.userId },
        status: 'sent',
      },
      { $set: { status: 'seen' } }
    );

    const messages = await Message.find({ conversationId })
      .populate('sender', 'username email')
      .sort({ createdAt: 1 }) // oldest first for chat rendering
      .skip(skip)
      .limit(perPage);

    const totalMessages = await Message.countDocuments({ conversationId });

    return res.status(200).json({
      currentPage: page,
      totalMessages,
      conversation: formatConversation(conversation),
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
  createOrGetOneToOneConversation,
  getUserConversations,
  getConversationMessages,
};
