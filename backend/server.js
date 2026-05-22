require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/database');
const { setupSocket } = require('./socket/socket');

const PORT = process.env.PORT || 3000;
connectDB();

const server = http.createServer(app);

setupSocket(server);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
