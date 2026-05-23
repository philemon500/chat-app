const { Router } = require('express');
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth.middleware');

const userRouter = Router();

userRouter.get('/', authMiddleware.authenticateToken, userController.getAllUsersExceptCurrent);

module.exports = userRouter;
