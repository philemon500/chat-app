import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import axios from 'axios';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  initSocket,
  emitSetup,
  onReceiveMessage,
  onMessagesSeen,
  onConversationUpdated,
  removeReceiveMessageListener,
  removeMessagesSeenListener,
  removeConversationUpdatedListener,
} from '../utils/socket';
import { API_URL } from '../config/api';

function getUserId(user) {
  return user?._id || user?.id;
}

function formatTime(value) {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ChatList() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initSocket();
    setupChatList();

    onReceiveMessage(fetchConversations);
    onMessagesSeen(fetchConversations);
    onConversationUpdated(fetchConversations);

    return () => {
      removeReceiveMessageListener();
      removeMessagesSeenListener();
      removeConversationUpdatedListener();
    };
  }, []);

  async function setupChatList() {
    setLoading(true);

    try {
      const profileResponse = await axios.get(`${API_URL}/auth/profile`, {
        withCredentials: true,
      });

      const userId = getUserId(profileResponse.data?.user);
      setCurrentUserId(userId);

      if (userId) {
        initSocket();
        emitSetup(userId);
      }

      await fetchConversations();
    } catch (error) {
      const message = error.response?.data?.message || 'Unable to load conversations';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchConversations() {
    try {
      const response = await axios.get(`${API_URL}/conversations`, {
        withCredentials: true,
      });

      setConversations(response.data.conversations || []);
    } catch (error) {
      console.log('Fetch conversations error:', error.message);
    }
  }

  function getOtherParticipant(conversation) {
    return conversation.participants.find((participant) => {
      return participant.id?.toString() !== currentUserId?.toString();
    });
  }

  function openConversation(conversation) {
    const otherUser = getOtherParticipant(conversation);

    router.push({
      pathname: '/chat',
      params: {
        conversationId: conversation.id,
        userId: otherUser?.id,
        userName: otherUser?.name,
        userEmail: otherUser?.email,
      },
    });
  }

  function renderConversation({ item }) {
    const otherUser = getOtherParticipant(item);
    const unreadCount = item.unreadCount || 0;
    const lastMessage = item.lastMessage || 'No messages yet';

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => openConversation(item)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {otherUser?.name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>

        <View style={styles.conversationInfo}>
          <View style={styles.conversationTopRow}>
            <Text style={styles.userName} numberOfLines={1}>
              {otherUser?.name || 'User'}
            </Text>
            <Text style={styles.timeText}>{formatTime(item.lastMessageTime)}</Text>
          </View>

          <View style={styles.conversationBottomRow}>
            <Text
              style={[
                styles.lastMessage,
                unreadCount > 0 && styles.unreadLastMessage,
              ]}
              numberOfLines={1}
            >
              {lastMessage}
            </Text>

            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#007aff" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chats</Text>
      </View>

      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.centerContent}>
            <Text style={styles.emptyText}>No conversations yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyText: {
    fontSize: 16,
    color: '#777',
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#007aff',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  conversationInfo: {
    flex: 1,
  },
  conversationTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  timeText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#888',
  },
  conversationBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  unreadLastMessage: {
    color: '#111',
    fontWeight: '700',
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
    backgroundColor: '#007aff',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
});
