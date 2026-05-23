const User = require('../models/user.model');

async function getAllUsersExceptCurrent(req, res) {
  try {
    const currentUserId = req.user.userId;

    const users = await User.find({ _id: { $ne: currentUserId } })
      .select('_id username email')
      .lean();

    const formattedUsers = users.map((user) => ({
      _id: user._id,
      name: user.username,
      email: user.email,
    }));

    res.status(200).json({ users: formattedUsers });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { getAllUsersExceptCurrent };
