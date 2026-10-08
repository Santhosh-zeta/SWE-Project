import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  StatusBar as StatusBarNative,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { initApi, getAuthToken, setAuthToken } from './src/services/api';
import AuthScreen from './src/screens/AuthScreen';
import SmsSyncScreen from './src/screens/SmsSyncScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ExpensesScreen from './src/screens/ExpensesScreen';

type Tab = 'dashboard' | 'sms' | 'expenses';

export default function App() {
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    initApp();
  }, []);

  async function initApp() {
    await initApi();
    const token = getAuthToken();
    setIsAuthenticated(Boolean(token));
    setReady(true);
  }

  async function handleLogout() {
    await setAuthToken(null);
    setIsAuthenticated(false);
  }

  if (!ready) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <View style={styles.appContainer}>
      <StatusBar style="light" />

      {/* Clean Minimalist Header */}
      <View style={styles.topHeader}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark} />
          <Text style={styles.brandText}>Finance</Text>
        </View>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Screen View */}
      <View style={styles.content}>
        {activeTab === 'dashboard' && (
          <DashboardScreen key={refreshKey} onGoToSms={() => setActiveTab('sms')} />
        )}
        {activeTab === 'sms' && (
          <SmsSyncScreen onRefresh={() => setRefreshKey(k => k + 1)} />
        )}
        {activeTab === 'expenses' && (
          <ExpensesScreen key={refreshKey} onGoToSms={() => setActiveTab('sms')} />
        )}
      </View>

      {/* Clean Bottom Navigation Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'dashboard' && styles.tabButtonActive]}
          onPress={() => setActiveTab('dashboard')}
          activeOpacity={0.8}
        >
          <Text
            style={[styles.tabLabel, activeTab === 'dashboard' && styles.tabLabelActive]}
          >
            Dashboard
          </Text>
          {activeTab === 'dashboard' && <View style={styles.activeDot} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'sms' && styles.tabButtonActive]}
          onPress={() => setActiveTab('sms')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabLabel, activeTab === 'sms' && styles.tabLabelActive]}>
            SMS Sync
          </Text>
          {activeTab === 'sms' && <View style={styles.activeDot} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'expenses' && styles.tabButtonActive]}
          onPress={() => setActiveTab('expenses')}
          activeOpacity={0.8}
        >
          <Text
            style={[styles.tabLabel, activeTab === 'expenses' && styles.tabLabelActive]}
          >
            Expenses
          </Text>
          {activeTab === 'expenses' && <View style={styles.activeDot} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#090D16',
    paddingTop: Platform.OS === 'android' ? (StatusBarNative.currentHeight || 28) : 44,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#090D16',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: '#090D16',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandMark: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4F46E5',
  },
  brandText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  signOutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#121722',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  signOutText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: '#0D111C',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'android' ? 14 : 20,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabButtonActive: {},
  tabLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4F46E5',
    marginTop: 2,
  },
});
