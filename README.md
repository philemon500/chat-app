
# Realtime Chat Application
A full-stack realtime chat application built using React Native (Expo Router), Node.js, Express.js, MongoDB Atlas, and
Socket.io.

Features
- User Registration & Login (JWT Authentication)
- Realtime Messaging with Socket.io
- One-to-One Conversations
- Online Users
- Typing Indicator
- Message Seen Status
- Conversation List
- Realtime Chat Updates (message counts)
- MongoDB Atlas Integration
- Expo Framework and Router Navigation
- Gifted Chat UI

# Tech Stack
Frontend
- React Native
- Expo Router
- Axios
- Socket.io Client
- React Native Gifted Chat

Backend
- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- Socket.io
- JWT Authentication
- bcryptjs

# Project Structure
chat-app/
    backend/
    frontend/
    README.md

# Backend Setup
cd backend
 npm install
 Create .env

MONGO_URI=mongodb://phil:phil1234@ac-in99lgm-shard-00-00.o4owdww.mongodb.net:27017,ac-in99lgm-shard-00-01.o4owdww.mongodb.net:27017,ac-in99lgm-shard-00-02.o4owdww.mongodb.net:27017/?ssl=true&replicaSet=atlas-jq1euo-shard-0&authSource=admin&appName=Cluster0

JWT_SECRET=6b036873f3bf8836b8a0422fa55923764db53534b241340066d5c882373f5366

# Start backend server
npm run dev

# Frontend Setup
cd frontend
npm install
Create .env
EXPO_PUBLIC_API_URL=http://localhost:3000

# Run Frontend
npx expo start --web
or 
npx expo start (wait for initialbuild)

# Authentication Flow
Register → Login → JWT Token Generated → Access Chat List → Create Conversation → Realtime Messaging

# Architecture Decisions
- Socket.io was used for realtime messaging, typing indicators, seen status, and online user tracking.
- MongoDB Atlas was chosen because it is cloud hosted, scalable, and easy to set up.
- Expo Framework suggested by React Expo offcial Doc an Router was used for file-based routing and simple navigation.
- Gifted Chat was used to simplify chat UI and message handling.

# API Endpoints
POST /api/auth/register
POST /api/auth/login
POST /api/conversations
GET /api/conversations
GET /api/conversations/:conversationId/messages

# Demo Credentials
User 1:
test@test.com
password = test
User 2:
test3@test.com
password = test

# Author
Philemon Anand