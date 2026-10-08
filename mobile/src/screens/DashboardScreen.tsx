import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { api } from '../services/api';

export default function DashboardScreen({ onGoToSms }: { onGoToSms: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    try {
      const res = await api.get('/dashboard');
      setData(res.data);
    } catch (err) {
      console.warn('Dashboard fetch failed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    fetchDashboard();
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color="#4F46E5" size="large" />
      </View>
    );
  }

  const salary = Number(data?.salary) || 0;
  const spent = Number(data?.totalSpent) || 0;
  const remaining = data?.remaining !== undefined ? Number(data.remaining) : salary - spent;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Title */}
      <View style={styles.header}>
        <Text style={styles.title}>Overview</Text>
        <Text style={styles.subtitle}>Current month spending and budget allocation.</Text>
      </View>

      {/* Main Balance Card */}
      <View style={[styles.balanceCard, remaining < 0 && styles.balanceCardNegative]}>
        <View style={styles.balanceHeader}>
          <Text style={styles.balanceLabel}>REMAINING BALANCE</Text>
          <TouchableOpacity
            style={styles.syncShortcut}
            onPress={onGoToSms}
            activeOpacity={0.8}
          >
            <Text style={styles.syncShortcutText}>Sync Feed →</Text>
          </TouchableOpacity>
        </View>

        <Text
          style={[
            styles.balanceAmount,
            { color: remaining >= 0 ? '#10B981' : '#EF4444' },
          ]}
        >
          ₹{remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </Text>

        <View style={styles.statSplit}>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>MONTHLY SALARY</Text>
            <Text style={styles.statValue}>₹{salary.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>TOTAL SPENT</Text>
            <Text style={[styles.statValue, { color: '#F87171' }]}>
              ₹{spent.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
      </View>

      {/* Category Breakdown */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>SPENDING BY CATEGORY</Text>
      </View>

      {(data?.categories || []).length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No expenses recorded for this period yet.</Text>
        </View>
      ) : (
        (data?.categories || []).map((cat: any) => {
          const catSpent = Number(cat.spent) || 0;
          const budget = Number(cat.configuredAmount) || 0;
          const pct = Math.min(100, Math.round((catSpent / (budget || 1)) * 100));
          return (
            <View key={cat.id} style={styles.catCard}>
              <View style={styles.catTopRow}>
                <View style={styles.catTitleGroup}>
                  <View
                    style={[
                      styles.catIndicator,
                      { backgroundColor: cat.color || '#4F46E5' },
                    ]}
                  />
                  <Text style={styles.catName}>{cat.name}</Text>
                </View>
                <Text style={styles.catSpentValue}>₹{catSpent.toLocaleString('en-IN')}</Text>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${pct}%`,
                      backgroundColor: pct > 100 ? '#EF4444' : cat.color || '#4F46E5',
                    },
                  ]}
                />
              </View>

              <View style={styles.catMetaRow}>
                <Text style={styles.catBudgetHint}>
                  Budget: ₹{budget.toLocaleString('en-IN')}
                </Text>
                <Text style={styles.catPercentage}>{pct}% used</Text>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 90,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#090D16',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#8A94A6',
    lineHeight: 18,
  },
  balanceCard: {
    backgroundColor: '#121722',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    marginBottom: 28,
  },
  balanceCardNegative: {
    borderColor: 'rgba(239, 68, 68, 0.35)',
    backgroundColor: '#181216',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  syncShortcut: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#1E2536',
  },
  syncShortcutText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#818CF8',
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginBottom: 20,
  },
  statSplit: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  statCol: {
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginHorizontal: 16,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  emptyCard: {
    backgroundColor: '#121722',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
  },
  catCard: {
    backgroundColor: '#121722',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 10,
  },
  catTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  catTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  catName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  catSpentValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#090D16',
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  catMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  catBudgetHint: {
    fontSize: 11,
    color: '#64748B',
  },
  catPercentage: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8A94A6',
  },
});
