const express = require('express');
const app = express();
const cors = require('cors');

const cookieParser = require('cookie-parser');
app.use(cookieParser());

app.use(express.json());

app.use(cors({ origin: true, credentials: true }));

const authRouter = require('./routes.js/auth.routes');
const conversationRouter = require('./routes.js/conversation.routes');
const userRouter = require('./routes.js/user.routes');
app.use('/api/auth', authRouter);
app.use('/api/conversations', conversationRouter);
app.use('/api/users', userRouter);

module.exports = app;

