import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { api, setAuthToken, getApiUrl, setApiUrl } from '../services/api';

export default function AuthScreen({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('Demo User');
  const [salary, setSalary] = useState('50000');
  const [apiUrlInput, setApiUrlInput] = useState(getApiUrl());
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  async function handleSaveUrl() {
    try {
      await setApiUrl(apiUrlInput);
      Alert.alert('Server URL Updated', `API base set to: ${apiUrlInput}`);
      setShowConfig(false);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      if (isLogin) {
        const res = await api.post('/auth/login', { email: email.trim(), password });
        await setAuthToken(res.data.token);
        onAuthenticated();
      } else {
        try {
          const res = await api.post('/auth/register', {
            name: name.trim() || 'Mobile User',
            email: email.trim(),
            password,
            monthlySalary: Number(salary) || 50000,
          });
          await setAuthToken(res.data.token);
          onAuthenticated();
        } catch (regErr: any) {
          // If already registered, attempt login automatically!
          if (regErr.message && regErr.message.toLowerCase().includes('already exists')) {
            try {
              const loginRes = await api.post('/auth/login', { email: email.trim(), password });
              await setAuthToken(loginRes.data.token);
              onAuthenticated();
              return;
            } catch {
              setIsLogin(true);
              Alert.alert(
                'Account Already Exists',
                'This email is already registered. Switched to Sign In tab—please verify your password.'
              );
              return;
            }
          }
          throw regErr;
        }
      }
    } catch (err: any) {
      Alert.alert(
        'Authentication Notice',
        err.message || 'Please check your credentials or verify server URL.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Brand */}
        <View style={styles.brandBox}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>💎</Text>
          </View>
          <Text style={styles.brandTitle}>FinanceTracker</Text>
          <Text style={styles.brandSubtitle}>React Native Mobile Edition</Text>
        </View>

        {/* Tab switch */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, isLogin && styles.tabActive]}
            onPress={() => setIsLogin(true)}
          >
            <Text style={[styles.tabText, isLogin && styles.tabTextActive]}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, !isLogin && styles.tabActive]}
            onPress={() => setIsLogin(false)}
          >
            <Text style={[styles.tabText, !isLogin && styles.tabTextActive]}>Register</Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.formCard}>
          {!isLogin && (
            <>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                placeholderTextColor="#64748b"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.inputLabel}>Monthly Salary (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="50000"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                value={salary}
                onChangeText={setSalary}
              />
            </>
          )}

          <Text style={styles.inputLabel}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#64748b"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#64748b"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={{ marginTop: 14, alignItems: 'center' }}
            onPress={() => setIsLogin(!isLogin)}
          >
            <Text style={{ color: '#818cf8', fontSize: 13, fontWeight: '600' }}>
              {isLogin
                ? "Don't have an account? Tap to Register →"
                : 'Already have an account? Tap to Sign In →'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Server IP Config Toggle */}
        <TouchableOpacity
          style={styles.configToggle}
          onPress={() => setShowConfig(!showConfig)}
        >
          <Text style={styles.configToggleText}>
            ⚙️ Server URL: {getApiUrl()} {showConfig ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>

        {showConfig && (
          <View style={styles.configCard}>
            <Text style={styles.configNote}>
              Set the backend API host. Use 10.0.2.2 for Android Emulator, or your PC's LAN IP for physical device.
            </Text>
            <TextInput
              style={styles.configInput}
              value={apiUrlInput}
              onChangeText={setApiUrlInput}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.saveUrlBtn} onPress={handleSaveUrl}>
              <Text style={styles.saveUrlBtnText}>Save Server URL</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  brandBox: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#182032',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logoIcon: {
    fontSize: 26,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#131926',
    borderRadius: 12,
    padding: 4,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#6366f1',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  formCard: {
    width: '100%',
    backgroundColor: '#131926',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#0b0f19',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  submitBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  configToggle: {
    padding: 10,
  },
  configToggleText: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
  },
  configCard: {
    width: '100%',
    backgroundColor: '#182032',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  configNote: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 8,
    lineHeight: 16,
  },
  configInput: {
    backgroundColor: '#0b0f19',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#f8fafc',
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 8,
  },
  saveUrlBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  saveUrlBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
