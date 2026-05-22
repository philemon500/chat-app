const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');
const User = require('../models/user.model');
//const bcrypt = require('bcryptjs');
//const jwt = require('jsonwebtoken');

const authRouter = Router();

authRouter.post('/register', authController.register);
authRouter.post('/login', authController.login);
authRouter.post('/logout', authController.logout);
authRouter.get('/profile', authMiddleware.authenticateToken, authController.getProfile);
module.exports = authRouter;