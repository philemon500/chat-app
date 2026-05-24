import io from 'socket.io-client';
import { SOCKET_URL } from '../config/api';

let socket = null;

export function initSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('error', (error) => {
      console.log('Socket error:', error);
    });
  }

  return socket;
}

export function getSocket() {
  return socket;
}

export function emitSetup(userId) {
  if (socket) {
    console.log('Emitting setup with userId:', userId);
    socket.emit('setup', userId);
  }
}

export function emitJoinConversation(conversationId) {
  if (socket) {
    console.log('Emitting joinConversation:', conversationId);
    socket.emit('joinConversation', conversationId);
  }
}

export function emitSendMessage(conversationId, message, callback) {
  if (socket) {
    const text = typeof message === 'string' ? message : message?.text;

    console.log('Emitting sendMessage:', { conversationId, text });
    socket.emit('sendMessage', { conversationId, text }, callback);
  }
}

export function emitTyping(conversationId, userId, userName) {
  if (socket) {
    socket.emit('typing', { conversationId, userId, userName });
  }
}

export function emitStopTyping(conversationId, userId) {
  if (socket) {
    socket.emit('stopTyping', { conversationId, userId });
  }
}

export function emitSeen(conversationId, userId) {
  if (socket) {
    console.log('Emitting seen:', { conversationId, userId });
    socket.emit('seen', { conversationId, userId });
  }
}

export function emitGetOnlineUsers() {
  if (socket) {
    socket.emit('getOnlineUsers');
  }
}

export function onReceiveMessage(callback) {
  if (socket) {
    socket.on('receiveMessage', (data) => {
      console.log('Received message:', data);
      callback(data);
    });
  }
}

export function onTyping(callback) {
  if (socket) {
    socket.on('typing', (data) => {
      console.log('User typing:', data);
      callback(data);
    });
  }
}

export function onStopTyping(callback) {
  if (socket) {
    socket.on('stopTyping', (data) => {
      console.log('User stopped typing:', data);
      callback(data);
    });
  }
}

export function onOnlineUsers(callback) {
  if (socket) {
    socket.on('onlineUsers', (userIds) => {
      console.log('Online users:', userIds);
      callback(userIds);
    });
  }
}

export function onMessagesSeen(callback) {
  if (socket) {
    socket.on('messagesSeen', (data) => {
      console.log('Messages seen:', data);
      callback(data);
    });
  }
}

export function onConversationUpdated(callback) {
  if (socket) {
    socket.on('conversationUpdated', (data) => {
      console.log('Conversation updated:', data);
      callback(data);
    });
  }
}

export function removeReceiveMessageListener() {
  if (socket) {
    socket.off('receiveMessage');
  }
}

export function removeTypingListener() {
  if (socket) {
    socket.off('typing');
  }
}

export function removeStopTypingListener() {
  if (socket) {
    socket.off('stopTyping');
  }
}

export function removeOnlineUsersListener() {
  if (socket) {
    socket.off('onlineUsers');
  }
}

export function removeMessagesSeenListener() {
  if (socket) {
    socket.off('messagesSeen');
  }
}

export function removeConversationUpdatedListener() {
  if (socket) {
    socket.off('conversationUpdated');
  }
}
