const express = require('express');
const app = express();
const cors = require('cors');

const cookieParser = require('cookie-parser');
app.use(cookieParser());

app.use(express.json());
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));

const authRouter = require('./routes.js/auth.routes');
app.use('/api/auth', authRouter);

module.exports = app;

