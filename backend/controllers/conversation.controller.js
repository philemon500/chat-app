const Conversation = require('../models/conversation.model');

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

module.exports = {
  getUserConversations,
};
