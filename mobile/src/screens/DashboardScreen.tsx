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
        <ActivityIndicator color="#6366f1" size="large" />
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
    >
      {/* KPI Cards */}
      <View style={styles.kpiContainer}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>MONTHLY SALARY</Text>
          <Text style={styles.kpiValue}>₹{salary.toLocaleString('en-IN')}</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>TOTAL SPENT</Text>
          <Text style={[styles.kpiValue, { color: '#f87171' }]}>
            ₹{spent.toLocaleString('en-IN')}
          </Text>
        </View>
      </View>

      <View style={[styles.kpiCardFull, remaining < 0 && styles.kpiCardNegative]}>
        <View>
          <Text style={styles.kpiLabel}>REMAINING BALANCE</Text>
          <Text style={[styles.kpiValueLarge, { color: remaining >= 0 ? '#10b981' : '#ef4444' }]}>
            ₹{remaining.toLocaleString('en-IN')}
          </Text>
        </View>
        <TouchableOpacity style={styles.quickSyncBtn} onPress={onGoToSms} activeOpacity={0.8}>
          <Text style={styles.quickSyncText}>⚡ Sync SMS</Text>
        </TouchableOpacity>
      </View>

      {/* Category Spending Breakdown */}
      <Text style={styles.sectionTitle}>CATEGORY SPENDING</Text>
      {(data?.categories || []).length === 0 ? (
        <Text style={styles.emptyText}>No spending recorded for this month yet.</Text>
      ) : (
        (data?.categories || []).map((cat: any) => {
          const catSpent = Number(cat.spent) || 0;
          const budget = Number(cat.configuredAmount) || 0;
          const pct = Math.min(100, Math.round((catSpent / (budget || 1)) * 100));
          return (
            <View key={cat.id} style={styles.catCard}>
              <View style={styles.catHeader}>
                <View style={styles.catTitleRow}>
                  <View style={[styles.colorDot, { backgroundColor: cat.color || '#6366f1' }]} />
                  <Text style={styles.catName}>{cat.name}</Text>
                </View>
                <Text style={styles.catSpentText}>₹{catSpent.toLocaleString('en-IN')}</Text>
              </View>

              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${pct}%`,
                      backgroundColor: pct > 100 ? '#ef4444' : cat.color || '#6366f1',
                    },
                  ]}
                />
              </View>

              <View style={styles.catFooter}>
                <Text style={styles.catBudgetLabel}>
                  Budget: ₹{budget.toLocaleString('en-IN')}
                </Text>
                <Text style={styles.catPercent}>{pct}%</Text>
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
    backgroundColor: '#0b0f19',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b0f19',
  },
  kpiContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#131926',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  kpiCardFull: {
    backgroundColor: '#131926',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  kpiCardNegative: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  kpiValueLarge: {
    fontSize: 24,
    fontWeight: '800',
  },
  quickSyncBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  quickSyncText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    fontStyle: 'italic',
  },
  catCard: {
    backgroundColor: '#182032',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 10,
  },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  catTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  catName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f8fafc',
  },
  catSpentText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0e1320',
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  catFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  catBudgetLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  catPercent: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
});
