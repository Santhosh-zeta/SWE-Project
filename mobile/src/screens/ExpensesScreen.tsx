import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { api } from '../services/api';

export default function ExpensesScreen({ onGoToSms }: { onGoToSms: () => void }) {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchExpenses();
  }, []);

  async function fetchExpenses() {
    try {
      const res = await api.get('/expenses?limit=50');
      setExpenses(res.data?.expenses || []);
    } catch (err) {
      console.warn('Failed to fetch expenses:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    fetchExpenses();
  }

  function getInitials(name: string): string {
    const clean = (name || '').replace(/[^a-zA-Z0-9\s]/g, '').trim();
    const words = clean.split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase() || 'TX';
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color="#4F46E5" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Expenses</Text>
          <Text style={styles.subtitle}>{expenses.length} recorded transactions</Text>
        </View>
        <TouchableOpacity style={styles.syncBtn} onPress={onGoToSms} activeOpacity={0.8}>
          <Text style={styles.syncBtnText}>+ Sync SMS</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No transactions recorded</Text>
            <Text style={styles.emptySubtitle}>
              Sync your bank SMS notifications or log expenses to populate this ledger.
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={onGoToSms} activeOpacity={0.85}>
              <Text style={styles.emptyBtnText}>Sync SMS Statements</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const category = item.category || {};
          const catColor = category.color || '#4F46E5';
          const initials = getInitials(item.description || 'Expense');
          const amount = Number(item.amount) || 0;

          return (
            <View style={styles.expenseItem}>
              <View style={[styles.avatarBox, { borderColor: catColor + '40' }]}>
                <Text style={[styles.avatarText, { color: catColor }]}>{initials}</Text>
              </View>

              <View style={styles.itemLeft}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {item.description || 'Expense'}
                </Text>
                <Text style={styles.itemDate}>
                  {new Date(item.date).toLocaleDateString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}{' '}
                  · <Text style={{ color: catColor }}>{category.name || 'General'}</Text>
                </Text>
              </View>

              <Text style={styles.itemAmount}>
                - ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#090D16',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#8A94A6',
    marginTop: 2,
  },
  syncBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  syncBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 90,
  },
  expenseItem: {
    backgroundColor: '#121722',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 12,
  },
  avatarBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#1A2130',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
  },
  itemLeft: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  itemDate: {
    fontSize: 11,
    color: '#64748B',
  },
  itemAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
