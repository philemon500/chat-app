import React, { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { API_URL } from '../config/api';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const registerInFlight = useRef(false);

  async function handleRegister() {
    if (registerInFlight.current) {
      return;
    }

    const username = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!username || !normalizedEmail || !password) {
      Alert.alert('Missing fields', 'Please enter name, email and password');
      return;
    }

    registerInFlight.current = true;
    console.log('Register submit', { username, email: normalizedEmail });
    setLoading(true);
    try {
      const res = await axios.post(
        `${API_URL}/auth/register`,
        {
          username,
          email: normalizedEmail,
          password,
        },
        { withCredentials: true }
      );

      if (res.status === 201 || res.status === 200) {
        Alert.alert('Success', 'Registration successful', [
          { text: 'OK', onPress: () => router.replace('/login') },
        ]);
      } else {
        Alert.alert('Registration failed', res.data?.message || 'Unknown error');
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Network error';
      Alert.alert('Registration failed', message);
    } finally {
      registerInFlight.current = false;
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Create Account</Text>

        <TextInput
          style={styles.input}
          placeholder="Name"
          value={name}
          onChangeText={setName}
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={[styles.button, (!(name && email && password) || loading) && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={!(name && email && password) || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Register</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/login')} style={styles.linkButton}>
          <Text style={styles.linkText}>Already have an account? Log in</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f2f2f7',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  input: {
    height: 44,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  button: {
    height: 44,
    backgroundColor: '#007aff',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#9cc3ff',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  linkText: {
    color: '#007aff',
  },
});
