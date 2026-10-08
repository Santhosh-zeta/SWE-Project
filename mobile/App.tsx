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

type Tab = 'sms' | 'dashboard' | 'expenses';

export default function App() {
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('sms');
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
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <View style={styles.appContainer}>
      <StatusBar style="light" />

      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerBrandRow}>
          <Text style={styles.headerLogo}>💎</Text>
          <Text style={styles.headerTitle}>FinanceTracker</Text>
          <View style={styles.aiTag}>
            <Text style={styles.aiTagText}>Gemini AI</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Main Screen Content */}
      <View style={styles.content}>
        {activeTab === 'sms' && (
          <SmsSyncScreen onRefresh={() => setRefreshKey(k => k + 1)} />
        )}
        {activeTab === 'dashboard' && (
          <DashboardScreen key={refreshKey} onGoToSms={() => setActiveTab('sms')} />
        )}
        {activeTab === 'expenses' && (
          <ExpensesScreen key={refreshKey} onGoToSms={() => setActiveTab('sms')} />
        )}
      </View>

      {/* Bottom Tab Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'sms' && styles.tabButtonActive]}
          onPress={() => setActiveTab('sms')}
        >
          <Text style={styles.tabIcon}>⚡</Text>
          <Text style={[styles.tabLabel, activeTab === 'sms' && styles.tabLabelActive]}>
            SMS Sync
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'dashboard' && styles.tabButtonActive]}
          onPress={() => setActiveTab('dashboard')}
        >
          <Text style={styles.tabIcon}>📊</Text>
          <Text style={[styles.tabLabel, activeTab === 'dashboard' && styles.tabLabelActive]}>
            Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'expenses' && styles.tabButtonActive]}
          onPress={() => setActiveTab('expenses')}
        >
          <Text style={styles.tabIcon}>💳</Text>
          <Text style={[styles.tabLabel, activeTab === 'expenses' && styles.tabLabelActive]}>
            Expenses
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#0b0f19',
    paddingTop: Platform.OS === 'android' ? (StatusBarNative.currentHeight || 28) : 44,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b0f19',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#0e1320',
  },
  headerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogo: {
    fontSize: 18,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: -0.3,
  },
  aiTag: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  aiTagText: {
    color: '#818cf8',
    fontSize: 10,
    fontWeight: '700',
  },
  logoutBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  logoutText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: '#0e1320',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'android' ? 14 : 20,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabButtonActive: {
    transform: [{ scale: 1.05 }],
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 3,
  },
  tabLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#818cf8',
    fontWeight: '700',
  },
});
