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
            <View style={styles.logoMarkInner} />
          </View>
          <Text style={styles.brandTitle}>Finance</Text>
          <Text style={styles.brandSubtitle}>Personal wealth & expense tracking</Text>
        </View>

        {/* Tab switch */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, isLogin && styles.tabActive]}
            onPress={() => setIsLogin(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, isLogin && styles.tabTextActive]}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, !isLogin && styles.tabActive]}
            onPress={() => setIsLogin(false)}
            activeOpacity={0.8}
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
                placeholderTextColor="#64748B"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.inputLabel}>Monthly Salary (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="50000"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                value={salary}
                onChangeText={setSalary}
              />
            </>
          )}

          <Text style={styles.inputLabel}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="name@example.com"
            placeholderTextColor="#64748B"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#64748B"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={{ marginTop: 16, alignItems: 'center' }}
            onPress={() => setIsLogin(!isLogin)}
            activeOpacity={0.7}
          >
            <Text style={{ color: '#818CF8', fontSize: 13, fontWeight: '600' }}>
              {isLogin
                ? "Don't have an account? Create one →"
                : 'Already have an account? Sign In →'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Server Host Toggle */}
        <TouchableOpacity
          style={styles.configToggle}
          onPress={() => setShowConfig(!showConfig)}
          activeOpacity={0.7}
        >
          <Text style={styles.configToggleText}>
            Host: {getApiUrl().replace('http://', '').replace('/api', '')} {showConfig ? '▴' : '▾'}
          </Text>
        </TouchableOpacity>

        {showConfig && (
          <View style={styles.configCard}>
            <Text style={styles.configNote}>
              Configure backend endpoint. Use your local Wi-Fi IP for physical devices or 10.0.2.2 for Android emulator.
            </Text>
            <TextInput
              style={styles.configInput}
              value={apiUrlInput}
              onChangeText={setApiUrlInput}
              autoCapitalize="none"
              placeholderTextColor="#64748B"
            />
            <TouchableOpacity style={styles.saveUrlBtn} onPress={handleSaveUrl} activeOpacity={0.8}>
              <Text style={styles.saveUrlBtnText}>Update Server Endpoint</Text>
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
    backgroundColor: '#090D16',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 64,
    alignItems: 'center',
  },
  brandBox: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#121722',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoMarkInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4F46E5',
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#8A94A6',
    marginTop: 4,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#121722',
    borderRadius: 10,
    padding: 3,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#1E2536',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  formCard: {
    width: '100%',
    backgroundColor: '#121722',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#090D16',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#F8FAFC',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  submitBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 22,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  configToggle: {
    padding: 8,
  },
  configToggleText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  configCard: {
    width: '100%',
    backgroundColor: '#121722',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  configNote: {
    fontSize: 11,
    color: '#8A94A6',
    marginBottom: 10,
    lineHeight: 16,
  },
  configInput: {
    backgroundColor: '#090D16',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
  },
  saveUrlBtn: {
    backgroundColor: '#1E2536',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  saveUrlBtnText: {
    color: '#818CF8',
    fontSize: 12,
    fontWeight: '600',
  },
});
