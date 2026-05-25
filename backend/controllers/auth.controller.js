const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const tokenBlacklist = require('../models/blacklist.model');
const jwt = require('jsonwebtoken');
async function register (req, res) {
  try {
    const { username, email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    const trimmedUsername = username?.trim();

    if (!trimmedUsername || !normalizedEmail || !password) {
      return res.status(400).json({ message: 'Username, email and password are required' });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already in use' });
    } else {
      const hashedPassword = await bcrypt.hash(password, 10); // In production, hash the password using bcrypt
      const newUser = await User.create({ username: trimmedUsername, email: normalizedEmail, password: hashedPassword });
      const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
      res.cookie('token', token, {
           httpOnly: true,
           secure: true,
           sameSite: 'none',
           maxAge: 24* 60* 60* 1000, // 1 day
          });
      res.status(201).json({ message: 'User registered successfully', user: { id: newUser._id, username: newUser.username, email: newUser.email } });
    }
  }
  catch (error) {
    if (error.code === 11000 && error.keyPattern?.email) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    res.status(500).json({ message: 'Server error' });
  }
}
async function login (req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    } else {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      } else {
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.cookie('token', token, {
           httpOnly: true,
           secure: true,
           sameSite: 'none',
           maxAge: 24* 60* 60* 1000, // 1 day
          });
        res.status(200).json({ message: 'Login successful', user: { id: user._id, username: user.username, email: user.email } });
      }
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
}
async function logout (req, res) {
  if (!req.cookies.token) {
    {
      const istokenBlacklisted = await tokenBlacklist.findOne({ token: req.cookies.token });
      if (!istokenBlacklisted) {
        await tokenBlacklist.create({ token: req.cookies.token });
      }
    }
  }
  res.clearCookie('token');
  res.status(200).json({ message: 'Logout successful' });
}

async function getProfile (req, res) {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
}



module.exports = { register, login, logout, getProfile };
