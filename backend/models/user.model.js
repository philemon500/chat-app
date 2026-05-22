const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: [true, "username must be unique"],
  },
  email: {
    type: String,
    required: true,
    unique: [true, "email must be unique"],
  },
  password: {
    type: String,
    required: true,
  },
});

const User = mongoose.model('User', userSchema);
module.exports = User;