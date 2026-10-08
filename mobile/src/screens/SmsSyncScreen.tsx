import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  readDeviceSms,
  readClipboardSms,
  analyzeSmsMessages,
  DeviceSmsMessage,
} from '../services/smsService';

interface SelectableMessage extends DeviceSmsMessage {
  id: string;
  selected: boolean;
}

function getMerchantInitials(name: string): string {
  const clean = (name || '').replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const words = clean.split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase() || 'TX';
}

function formatSender(address: string): string {
  const clean = (address || '').toUpperCase();
  if (clean.includes('HDFC')) return 'HDFC Bank';
  if (clean.includes('SBI')) return 'SBI UPI';
  if (clean.includes('ICICI')) return 'ICICI Bank';
  if (clean.includes('KOTAK')) return 'Kotak Bank';
  if (clean.includes('PAYTM')) return 'Paytm UPI';
  if (clean.includes('AMAZON')) return 'Amazon Pay';
  if (clean.includes('ZEPTO')) return 'Zepto';
  if (clean.includes('SWIGGY')) return 'Swiggy';
  if (clean.includes('ZOMATO')) return 'Zomato';
  return clean || 'Bank SMS';
}

export default function SmsSyncScreen({ onRefresh }: { onRefresh?: () => void }) {
  const [selectedSpan, setSelectedSpan] = useState<number>(7);
  const [autoImport, setAutoImport] = useState<boolean>(true);

  // Messages state
  const [fetchedMessages, setFetchedMessages] = useState<SelectableMessage[]>([]);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analyzedExpenses, setAnalyzedExpenses] = useState<any[]>([]);

  useEffect(() => {
    // Initial fetch on mount for a zero-effort first impression
    handleFetchSms();
  }, [selectedSpan]);

  async function handleFetchSms() {
    setIsFetching(true);
    try {
      const rawMessages = await readDeviceSms(selectedSpan);
      const selectable: SelectableMessage[] = rawMessages.map((m, i) => ({
        ...m,
        id: `sms-${i}-${m.date}`,
        selected: true,
      }));
      setFetchedMessages(selectable);
    } catch (err: any) {
      console.warn('Could not read messages:', err.message);
    } finally {
      setIsFetching(false);
    }
  }

  async function handlePasteClipboard() {
    try {
      const clip = await readClipboardSms();
      if (clip) {
        const newMsg: SelectableMessage = {
          ...clip,
          id: `clip-${Date.now()}`,
          selected: true,
        };
        setFetchedMessages(prev => [newMsg, ...prev]);
      } else {
        Alert.alert(
          'Clipboard Empty',
          'Copy a bank or UPI transaction message from your messages app, then tap Paste.'
        );
      }
    } catch (err: any) {
      Alert.alert('Notice', 'Unable to access clipboard.');
    }
  }

  function toggleMessageSelection(id: string) {
    setFetchedMessages(prev =>
      prev.map(m => (m.id === id ? { ...m, selected: !m.selected } : m))
    );
  }

  function toggleSelectAll(select: boolean) {
    setFetchedMessages(prev => prev.map(m => ({ ...m, selected: select })));
  }

  async function handleAnalyze() {
    const selected = fetchedMessages.filter(m => m.selected);
    if (selected.length === 0) {
      Alert.alert('Selection Required', 'Select at least one message to process.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const texts = selected.map(m => m.body);
      const res = await analyzeSmsMessages(texts, selectedSpan, autoImport);
      const items = res.data || [];
      setAnalyzedExpenses(items);

      const count = res.importedCount ?? items.length;
      Alert.alert(
        'Transactions Recorded',
        `Successfully imported ${count} transaction(s) into your expenses.`
      );
      if (onRefresh) onRefresh();
    } catch (err: any) {
      Alert.alert('Processing Error', err.message || 'Could not reach server.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  const selectedCount = fetchedMessages.filter(m => m.selected).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Title & Overview */}
      <View style={styles.header}>
        <Text style={styles.title}>SMS Sync</Text>
        <Text style={styles.subtitle}>
          Parse your bank notifications and automatically record expenses.
        </Text>
      </View>

      {/* Control Card */}
      <View style={styles.card}>
        <View style={styles.controlHeader}>
          <Text style={styles.sectionLabel}>TIMEFRAME</Text>
          <View style={styles.segmentedControl}>
            {[7, 14, 30].map(days => (
              <TouchableOpacity
                key={days}
                style={[
                  styles.segmentButton,
                  selectedSpan === days && styles.segmentButtonActive,
                ]}
                onPress={() => setSelectedSpan(days)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.segmentText,
                    selectedSpan === days && styles.segmentTextActive,
                  ]}
                >
                  {days}d
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Action Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.primaryButton, isFetching && styles.buttonDisabled]}
            onPress={handleFetchSms}
            disabled={isFetching}
            activeOpacity={0.85}
          >
            {isFetching ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Scan Messages</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handlePasteClipboard}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryButtonText}>Paste from Clipboard</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages Feed */}
      {fetchedMessages.length > 0 && (
        <View style={styles.section}>
          <View style={styles.listHeaderRow}>
            <Text style={styles.sectionLabel}>
              DETECTED NOTIFICATIONS ({fetchedMessages.length})
            </Text>
            <TouchableOpacity
              onPress={() => toggleSelectAll(selectedCount < fetchedMessages.length)}
            >
              <Text style={styles.actionLink}>
                {selectedCount === fetchedMessages.length ? 'Deselect all' : 'Select all'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.messageList}>
            {fetchedMessages.map(msg => (
              <TouchableOpacity
                key={msg.id}
                style={[
                  styles.messageCard,
                  msg.selected && styles.messageCardActive,
                ]}
                onPress={() => toggleMessageSelection(msg.id)}
                activeOpacity={0.85}
              >
                <View style={styles.messageHeader}>
                  <View style={styles.messageHeaderLeft}>
                    <View
                      style={[
                        styles.checkbox,
                        msg.selected && styles.checkboxSelected,
                      ]}
                    >
                      {msg.selected && <View style={styles.checkboxDot} />}
                    </View>
                    <Text style={styles.senderText}>{formatSender(msg.address)}</Text>
                  </View>
                  <Text style={styles.timeText}>
                    {new Date(msg.date).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </View>

                <Text style={styles.bodyText} numberOfLines={2}>
                  {msg.body}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Sync Trigger Card */}
          <View style={styles.processCard}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setAutoImport(!autoImport)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, autoImport && styles.checkboxSelected]}>
                {autoImport && <View style={styles.checkboxDot} />}
              </View>
              <Text style={styles.checkboxLabel}>Auto-categorize and save to ledger</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.syncActionButton,
                (isAnalyzing || selectedCount === 0) && styles.buttonDisabled,
              ]}
              onPress={handleAnalyze}
              disabled={isAnalyzing || selectedCount === 0}
              activeOpacity={0.85}
            >
              {isAnalyzing ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.syncActionButtonText}>Processing...</Text>
                </View>
              ) : (
                <Text style={styles.syncActionButtonText}>
                  Record {selectedCount} Transaction{selectedCount === 1 ? '' : 's'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Imported Transactions View */}
      {analyzedExpenses.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            RECORDED EXPENSES ({analyzedExpenses.length})
          </Text>

          <View style={styles.expenseList}>
            {analyzedExpenses.map((item, idx) => {
              const name = item.merchant || item.description || 'Expense';
              const catName = item.category?.name || item.categoryName || 'General';
              const initials = getMerchantInitials(name);
              const amount = Number(item.amount) || 0;

              return (
                <View key={item.id || idx} style={styles.expenseRow}>
                  <View style={styles.monogram}>
                    <Text style={styles.monogramText}>{initials}</Text>
                  </View>

                  <View style={styles.expenseMeta}>
                    <Text style={styles.expenseTitle} numberOfLines={1}>
                      {name}
                    </Text>
                    <Text style={styles.expenseSub}>
                      {new Date(item.date).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      · {catName}
                    </Text>
                  </View>

                  <Text style={styles.expenseAmount}>
                    - ₹{amount.toFixed(2)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
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
  card: {
    backgroundColor: '#121722',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    marginBottom: 24,
  },
  controlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#090D16',
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  segmentButton: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  segmentButtonActive: {
    backgroundColor: '#1E2536',
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    flex: 1.2,
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#1A2130',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  section: {
    marginBottom: 24,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#818CF8',
  },
  messageList: {
    gap: 10,
    marginBottom: 16,
  },
  messageCard: {
    backgroundColor: '#121722',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  messageCardActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#141A28',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  messageHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#475569',
    backgroundColor: '#090D16',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  checkboxDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  senderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  timeText: {
    fontSize: 11,
    color: '#64748B',
  },
  bodyText: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 17,
    paddingLeft: 28,
  },
  processCard: {
    backgroundColor: '#121722',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  checkboxLabel: {
    fontSize: 13,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  syncActionButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncActionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expenseList: {
    backgroundColor: '#121722',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
    gap: 12,
  },
  monogram: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#1A2130',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  monogramText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#818CF8',
    letterSpacing: 0.5,
  },
  expenseMeta: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  expenseSub: {
    fontSize: 11,
    color: '#64748B',
  },
  expenseAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F1F5F9',
  },
});
