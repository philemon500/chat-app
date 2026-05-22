const { Router } = require('express');
const conversationController = require('../controllers/conversation.controller');
const authMiddleware = require('../middleware/auth.middleware');

const conversationRouter = Router();

conversationRouter.get(
  '/',
  authMiddleware.authenticateToken,
  conversationController.getUserConversations
);

module.exports = conversationRouter;
