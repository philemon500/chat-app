const express = require('express');
const app = express();
const cors = require('cors');

const cookieParser = require('cookie-parser');
app.use(cookieParser());

app.use(express.json());
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));

const authRouter = require('./routes.js/auth.routes');
const conversationRouter = require('./routes.js/conversation.routes');
app.use('/api/auth', authRouter);
app.use('/api/conversations', conversationRouter);

module.exports = app;

