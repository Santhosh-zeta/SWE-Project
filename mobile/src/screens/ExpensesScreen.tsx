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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color="#6366f1" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>All Expenses ({expenses.length})</Text>
        <TouchableOpacity style={styles.syncBtn} onPress={onGoToSms}>
          <Text style={styles.syncBtnText}>⚡ Sync SMS</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No expenses logged yet.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={onGoToSms}>
              <Text style={styles.emptyBtnText}>Sync your first SMS</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const category = item.category || {};
          const catColor = category.color || '#6366f1';
          return (
            <View style={[styles.expenseItem, { borderLeftColor: catColor }]}>
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
                ₹{Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
    backgroundColor: '#0b0f19',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b0f19',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  syncBtn: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  syncBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  expenseItem: {
    backgroundColor: '#131926',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderLeftWidth: 4,
  },
  itemLeft: {
    flex: 1,
    marginRight: 10,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 4,
  },
  itemDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  itemAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10b981',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    marginBottom: 14,
  },
  emptyBtn: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
