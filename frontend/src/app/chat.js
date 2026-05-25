import React, { useState, useCallback, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {Platform, KeyboardAvoidingView} from 'react-native';
import axios from 'axios';
import { GiftedChat, Send } from 'react-native-gifted-chat';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Text,
  Alert,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import {
  initSocket,
  emitSetup,
  emitJoinConversation,
  emitSendMessage,
  emitTyping,
  emitStopTyping,
  emitSeen,
  emitGetOnlineUsers,
  onReceiveMessage,
  onTyping,
  onStopTyping,
  onOnlineUsers,
  onMessagesSeen,
  removeReceiveMessageListener,
  removeTypingListener,
  removeStopTypingListener,
  removeOnlineUsersListener,
  removeMessagesSeenListener,
} from '../utils/socket';
import { API_URL } from '../config/api';

function getUserId(user) {
  if (!user) {
    return null;
  }

  return user._id || user.id;
}

function getParam(value) {
  return Array.isArray(value) ? value[0] : value;
}

function getParticipantId(participant) {
  return participant?._id || participant?.id;
}

function getSenderId(sender, message) {
  if (message.senderId) {
    return message.senderId;
  }

  if (!sender) {
    return 'unknown';
  }

  if (typeof sender === 'object') {
    return sender._id || sender.id || 'unknown';
  }

  return sender;
}

function getSenderName(sender, message) {
  if (message.senderName) {
    return message.senderName;
  }

  if (sender && typeof sender === 'object') {
    return sender.username || sender.name || sender.email || 'User';
  }

  return 'User';
}

function toGiftedMessage(message) {
  const sender = message.sender;

  return {
    _id: message._id || message.id,
    text: message.text || '',
    status: message.status || 'sent',
    createdAt: new Date(message.createdAt || Date.now()),
    user: {
      _id: getSenderId(sender, message),
      name: getSenderName(sender, message),
      avatar: message.senderAvatar || '',
    },
  };
}

export default function Chat() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const conversationId = getParam(params.conversationId);
  const routeChatUser = {
    _id: getParam(params.userId),
    name: getParam(params.userName),
    email: getParam(params.userEmail),
  };
  const [messages, setMessages] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [chatUser, setChatUser] = useState(routeChatUser);
  const [loading, setLoading] = useState(true);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState([]);

  const currentUserId = getUserId(currentUser);
  const chatUserId = getParticipantId(chatUser);
  const chatUserName = chatUser?.name || chatUser?.username || chatUser?.email || 'Chat';

  useEffect(() => {
    let isMounted = true;
    let activeUserId = null;

    initSocket();

    async function setupChat() {
      try {
        const profileResponse = await axios.get(`${API_URL}/auth/profile`, {
          withCredentials: true,
        });

        if (!isMounted) {
          return;
        }

        const user = profileResponse.data?.user;
        const userId = getUserId(user);
        activeUserId = userId;

        setCurrentUser(user);
        emitSetup(userId);
        emitGetOnlineUsers();

        if (conversationId) {
          emitJoinConversation(conversationId);
          emitSeen(conversationId, userId);
          await fetchMessages(conversationId, userId);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.log('Chat setup error:', error.message, error.response?.status);
        Alert.alert('Error', 'Please log in again before sending messages.');
        setLoading(false);
      }
    }

    const handleReceiveMessage = (data) => {
      const receivedMessage = toGiftedMessage(data);

      setMessages((previousMessages) =>
        GiftedChat.append(previousMessages, [receivedMessage])
      );

      if (receivedMessage.user._id?.toString() !== activeUserId?.toString()) {
        emitSeen(conversationId, activeUserId);
      }
    };

    const handleTyping = (data) => {
      if (data.conversationId !== conversationId) {
        return;
      }

      setIsOtherUserTyping(true);
    };

    const handleStopTyping = (data) => {
      if (data.conversationId !== conversationId) {
        return;
      }

      setIsOtherUserTyping(false);
    };

    const handleOnlineUsers = (userIds) => {
      setOnlineUserIds(userIds.map((userId) => userId.toString()));
    };

    const handleMessagesSeen = (data) => {
      if (
        data.conversationId !== conversationId ||
        data.userId?.toString() === activeUserId?.toString()
      ) {
        return;
      }

      setMessages((previousMessages) =>
        previousMessages.map((message) => {
          if (message.user._id?.toString() !== activeUserId?.toString()) {
            return message;
          }

          return {
            ...message,
            status: 'seen',
          };
        })
      );
    };

    setupChat();
    onReceiveMessage(handleReceiveMessage);
    onTyping(handleTyping);
    onStopTyping(handleStopTyping);
    onOnlineUsers(handleOnlineUsers);
    onMessagesSeen(handleMessagesSeen);
    emitGetOnlineUsers();

    return () => {
      isMounted = false;
      removeReceiveMessageListener();
      removeTypingListener();
      removeStopTypingListener();
      removeOnlineUsersListener();
      removeMessagesSeenListener();
    };
  }, [conversationId]);

  async function fetchMessages(activeConversationId, userId) {
    setLoading(true);

    try {
      const response = await axios.get(
        `${API_URL}/conversations/${activeConversationId}/messages`,
        { withCredentials: true }
      );

      const apiMessages = response.data?.messages || [];
      const participants = response.data?.conversation?.participants || [];
      const otherParticipant = participants.find((participant) => {
        const participantId = getParticipantId(participant);
        return participantId?.toString() !== userId?.toString();
      });
      const formattedMessages = apiMessages.map(toGiftedMessage).reverse();

      if (otherParticipant) {
        setChatUser(otherParticipant);
      }

      setMessages(formattedMessages);
    } catch (error) {
      console.log('Fetch messages error:', error.message, error.response?.status);
      Alert.alert('Error', 'Unable to load messages.');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }

  const onSend = useCallback(
    (newMessages = []) => {
      const message = newMessages[0];

      if (!conversationId || !currentUserId || !message?.text?.trim()) {
        return;
      }

      emitSendMessage(conversationId, { text: message.text }, (response) => {
        if (response?.error) {
          Alert.alert('Message failed', response.error);
        }
      });

      emitStopTyping(conversationId, currentUserId);
    },
    [conversationId, currentUserId]
  );

  const handleInputChange = useCallback(
    (text) => {
      if (!conversationId || !currentUserId) {
        return;
      }

      if (text.trim().length > 0) {
        emitTyping(
          conversationId,
          currentUserId,
          currentUser?.username || currentUser?.name || 'Current User'
        );
      } else {
        emitStopTyping(conversationId, currentUserId);
      }
    },
    [conversationId, currentUserId, currentUser]
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007aff" />
      </View>
    );
  }

  const isChatUserOnline = chatUserId
    ? onlineUserIds.includes(chatUserId.toString())
    : false;
  const statusText = isOtherUserTyping
    ? 'typing...'
    : isChatUserOnline
      ? 'Online'
      : 'Offline';

  return (
    <KeyboardAvoidingView
     style={styles.container}
     behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
    <View style={styles.container}>
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/chat-list')}
            accessibilityLabel="Back to chat list"
          >
            <Text style={styles.backButtonText}>{'\u2190'}</Text>
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {chatUserName}
            </Text>

            <View style={styles.statusRow}>
              {!isOtherUserTyping && (
                <View
                  style={[
                    styles.statusDot,
                    isChatUserOnline ? styles.onlineDot : styles.offlineDot,
                  ]}
                />
              )}
              <Text
                style={[
                  styles.statusText,
                  isOtherUserTyping && styles.typingStatusText,
                ]}
              >
                {statusText}
              </Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      <SafeAreaView style={{ flex: 1 }}>          
      <GiftedChat
        messages={messages}
        onSend={onSend}
        bottomOffset={Platform.OS === 'android' ? 40 : 0}
        keyboardShouldPersistTaps="handled"
        renderSend={(props) => (
          <Send {...props} containerStyle={styles.sendContainer}>
            <View style={styles.sendButton}>
              <SymbolView
                name={{ ios: 'paperplane.fill', android: 'send', web: 'send' }}
                size={20}
                tintColor="#fff"
              />
            </View>
          </Send>
        )}
        renderTicks={(message) => {
          if (message.user._id?.toString() !== currentUserId?.toString()) {
            return null;
          }

          return (
            <Text style={styles.tickText}>
              {message.status === 'seen' ? '\u2713\u2713' : '\u2713'}
            </Text>
          );
        }}
        textInputProps={{
          onChangeText: handleInputChange,
        }}
        user={{
          _id: currentUserId || 'current-user',
        }}
        renderUsernameOnMessage
        showUserAvatar
        showAvatarForEveryMessage
      />
      </SafeAreaView>
    </View>
    </KeyboardAvoidingView>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSafeArea: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  header: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  backButtonText: {
    color: '#007aff',
    fontSize: 28,
    fontWeight: '600',
    lineHeight: 32,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  onlineDot: {
    backgroundColor: '#34c759',
  },
  offlineDot: {
    backgroundColor: '#9ca3af',
  },
  statusText: {
    fontSize: 13,
    color: '#666',
  },
  typingStatusText: {
    color: '#007aff',
    fontStyle: 'italic',
  },
  sendContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  sendButton: {
    width: 36,
    height: 34,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007aff',
  },
  tickText: {
    marginRight: 2,
    marginLeft: 6,
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
  },
});
