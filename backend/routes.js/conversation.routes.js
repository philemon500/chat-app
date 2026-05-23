const { Router } = require('express');
const conversationController = require('../controllers/conversation.controller');
const authMiddleware = require('../middleware/auth.middleware');

const conversationRouter = Router();

conversationRouter.post(
  '/',
  authMiddleware.authenticateToken,
  conversationController.createOrGetOneToOneConversation
);
conversationRouter.get(
  '/',
  authMiddleware.authenticateToken,
  conversationController.getUserConversations
);
conversationRouter.get(
  '/:conversationId/messages',
  authMiddleware.authenticateToken,
  conversationController.getConversationMessages
);

module.exports = conversationRouter;
