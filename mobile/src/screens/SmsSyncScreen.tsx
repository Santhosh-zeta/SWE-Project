import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import {
  readDeviceSms,
  readClipboardSms,
  analyzeSmsMessages,
  checkSmsPermission,
  requestSmsPermission,
  DeviceSmsMessage,
} from '../services/smsService';

interface SelectableMessage extends DeviceSmsMessage {
  id: string;
  selected: boolean;
}

function getMerchantIcon(name: string): string {
  const lower = (name || '').toLowerCase();
  if (lower.includes('instamart') || lower.includes('blinkit') || lower.includes('zepto') || lower.includes('grocer')) return '🛒';
  if (lower.includes('swiggy') || lower.includes('zomato') || lower.includes('food')) return '🍕';
  if (lower.includes('uber') || lower.includes('ola') || lower.includes('rapido')) return '🚗';
  if (lower.includes('bescom') || lower.includes('bill') || lower.includes('electric')) return '💡';
  if (lower.includes('amazon') || lower.includes('flipkart')) return '🛍️';
  return '💳';
}

export default function SmsSyncScreen({ onRefresh }: { onRefresh?: () => void }) {
  const [selectedSpan, setSelectedSpan] = useState<number>(7);
  const [autoImport, setAutoImport] = useState<boolean>(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Step 1: Fetched messages state
  const [fetchedMessages, setFetchedMessages] = useState<SelectableMessage[]>([]);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  // Step 2: Gemini Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analyzedExpenses, setAnalyzedExpenses] = useState<any[]>([]);
  const [analysisStatus, setAnalysisStatus] = useState<string | null>(null);

  useEffect(() => {
    // Non-blocking permission check
    checkSmsPermission().then(setHasPermission).catch(() => {});
  }, []);

  // STEP 1: Fetch SMS from phone first (never hangs)
  async function handleFetchSms() {
    setIsFetching(true);
    setAnalyzedExpenses([]);
    setAnalysisStatus(null);

    try {
      // Non-blocking background permission prompt
      requestSmsPermission().then(setHasPermission).catch(() => {});

      const rawMessages = await readDeviceSms(selectedSpan);
      const selectable: SelectableMessage[] = rawMessages.map((m, i) => ({
        ...m,
        id: `sms-${i}-${Date.now()}`,
        selected: true,
      }));

      setFetchedMessages(selectable);
    } catch (err: any) {
      Alert.alert('Fetch Notice', err.message || 'Could not fetch device SMS');
    } finally {
      setIsFetching(false);
    }
  }

  // Quick 1-Tap Clipboard paste
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
        Alert.alert('Pasted from Clipboard', 'Added your copied SMS! Review it below and tap "Analyse with Gemini AI".');
      } else {
        Alert.alert(
          'Clipboard Empty',
          'Copy your bank or UPI transaction SMS in your messaging app first, then tap this button!'
        );
      }
    } catch (err: any) {
      Alert.alert('Clipboard Notice', err.message || 'Could not read clipboard');
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

  // STEP 2: Explicitly Analyse Selected SMS with Gemini AI
  async function handleAnalyzeWithGemini() {
    const selected = fetchedMessages.filter(m => m.selected);
    if (selected.length === 0) {
      Alert.alert('Selection Required', 'Please select at least one SMS message to analyze.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const texts = selected.map(m => m.body);
      const res = await analyzeSmsMessages(texts, selectedSpan, autoImport);
      const items = res.data || [];
      setAnalyzedExpenses(items);

      const count = res.importedCount ?? items.length;
      setAnalysisStatus(`✓ Gemini AI analyzed ${selected.length} SMS and imported ${count} expense(s)!`);

      Alert.alert(
        '✨ Gemini AI Complete',
        `Successfully extracted and categorized ${count} expense(s) (Swiggy Instamart, UPI debits, etc.)!`
      );
      if (onRefresh) onRefresh();
    } catch (err: any) {
      Alert.alert('Gemini Analysis Failed', err.message || 'Error communicating with backend');
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
      {/* Header Banner */}
      <View style={styles.headerCard}>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>✦ GEMINI 2.5 FLASH</Text>
        </View>
        <Text style={styles.headerTitle}>SMS Expense Extractor</Text>
        <Text style={styles.headerSubtitle}>
          1. Choose span &amp; fetch SMS messages.
          {'\n'}2. Preview the messages on screen.
          {'\n'}3. Click &quot;Analyse with Gemini AI&quot; to categorize &amp; import!
        </Text>
      </View>

      {/* STEP 1: Fetch SMS Card */}
      <View style={styles.stepCard}>
        <View style={styles.stepHeader}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>STEP 1</Text>
          </View>
          <Text style={styles.stepTitle}>Choose Span &amp; Fetch SMS</Text>
        </View>

        <Text style={styles.spanLabel}>TIMEFRAME:</Text>
        <View style={styles.spanRow}>
          {[7, 14, 30, 60].map(days => (
            <TouchableOpacity
              key={days}
              style={[styles.spanPill, selectedSpan === days && styles.spanPillActive]}
              onPress={() => setSelectedSpan(days)}
            >
              <Text style={[styles.spanPillText, selectedSpan === days && styles.spanPillTextActive]}>
                Last {days}d
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.fetchBtn, isFetching && styles.btnDisabled]}
            onPress={handleFetchSms}
            disabled={isFetching}
            activeOpacity={0.85}
          >
            {isFetching ? (
              <View style={styles.btnRow}>
                <ActivityIndicator color="#ffffff" size="small" />
                <Text style={styles.fetchBtnText}>Reading SMS...</Text>
              </View>
            ) : (
              <Text style={styles.fetchBtnText}>
                📥 Fetch SMS (Last {selectedSpan} Days)
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.clipboardBtn}
            onPress={handlePasteClipboard}
            activeOpacity={0.85}
          >
            <Text style={styles.clipboardBtnText}>📋 Paste from Clipboard</Text>
          </TouchableOpacity>
        </View>

        {/* Permission status note */}
        <View style={styles.permissionNote}>
          <Text style={styles.noteIcon}>ℹ️</Text>
          <Text style={styles.noteText}>
            {Platform.OS === 'android'
              ? 'Expo Go note: The generic Google Play Expo Go app restricts system permission popups. Standalone APK builds (npx expo run:android) prompt Android system permission automatically.'
              : 'SMS engine ready.'}
          </Text>
        </View>
      </View>

      {/* STEP 2: Preview Fetched SMS (Visible after fetching) */}
      {fetchedMessages.length > 0 && (
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepBadge, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
              <Text style={[styles.stepBadgeText, { color: '#10b981' }]}>STEP 2</Text>
            </View>
            <Text style={styles.stepTitle}>
              Preview Fetched SMS ({fetchedMessages.length})
            </Text>
          </View>

          <View style={styles.selectionBar}>
            <Text style={styles.selectedCountText}>
              {selectedCount} of {fetchedMessages.length} selected
            </Text>
            <TouchableOpacity
              onPress={() => toggleSelectAll(selectedCount < fetchedMessages.length)}
            >
              <Text style={styles.selectToggleText}>
                {selectedCount === fetchedMessages.length ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Messages list */}
          <View style={styles.messagesList}>
            {fetchedMessages.map(msg => (
              <TouchableOpacity
                key={msg.id}
                style={[styles.msgCard, msg.selected && styles.msgCardSelected]}
                onPress={() => toggleMessageSelection(msg.id)}
                activeOpacity={0.85}
              >
                <View style={styles.msgTopRow}>
                  <View style={styles.msgCheckRow}>
                    <View style={[styles.msgCheck, msg.selected && styles.msgCheckActive]}>
                      {msg.selected && <Text style={styles.msgCheckMark}>✓</Text>}
                    </View>
                    <Text style={styles.msgSender}>{msg.address || 'BANK-SMS'}</Text>
                  </View>
                  <Text style={styles.msgDate}>
                    {new Date(msg.date).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </View>

                <Text style={styles.msgBody} numberOfLines={3}>
                  {msg.body}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Auto-import toggle */}
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setAutoImport(!autoImport)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, autoImport && styles.checkboxActive]}>
              {autoImport && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.toggleText}>Auto-import directly into Expenses</Text>
          </TouchableOpacity>

          {/* STEP 3 Button: Analyse with Gemini AI */}
          <TouchableOpacity
            style={[styles.geminiBtn, isAnalyzing && styles.btnDisabled]}
            onPress={handleAnalyzeWithGemini}
            disabled={isAnalyzing || selectedCount === 0}
            activeOpacity={0.85}
          >
            {isAnalyzing ? (
              <View style={styles.btnRow}>
                <ActivityIndicator color="#ffffff" size="small" />
                <Text style={styles.geminiBtnText}>Gemini AI is analyzing...</Text>
              </View>
            ) : (
              <Text style={styles.geminiBtnText}>
                ✨ Analyse {selectedCount} SMS with Gemini AI
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Analysis Status */}
      {analysisStatus && (
        <View style={styles.statusBox}>
          <Text style={styles.statusBoxText}>{analysisStatus}</Text>
        </View>
      )}

      {/* Detected Expenses */}
      {analyzedExpenses.length > 0 && (
        <View style={styles.resultsCard}>
          <Text style={styles.resultsTitle}>
            DETECTED EXPENSES ({analyzedExpenses.length})
          </Text>

          {analyzedExpenses.map((item, idx) => {
            const icon = getMerchantIcon(item.merchant || item.description);
            const catName = item.category?.name || item.categoryName || 'General';
            return (
              <View key={item.id || idx} style={styles.expenseItem}>
                <View style={styles.merchantIconBox}>
                  <Text style={styles.merchantIcon}>{icon}</Text>
                </View>

                <View style={styles.expenseDetails}>
                  <Text style={styles.merchantTitle} numberOfLines={1}>
                    {item.merchant || item.description || 'Expense'}
                  </Text>
                  <Text style={styles.expenseSubtitle}>
                    {new Date(item.date).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    · {catName}
                  </Text>
                </View>

                <View style={styles.amountBox}>
                  <Text style={styles.amountText}>₹{Number(item.amount).toFixed(2)}</Text>
                  <Text style={styles.catBadge}>{catName}</Text>
                </View>
              </View>
            );
          })}
        </View>
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
    paddingBottom: 90, // Prevent cut-off
  },
  headerCard: {
    backgroundColor: '#131926',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    marginBottom: 16,
  },
  headerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderColor: 'rgba(168, 85, 247, 0.4)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 8,
  },
  headerBadgeText: {
    color: '#c084fc',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: '#94a3b8',
    lineHeight: 18,
  },
  stepCard: {
    backgroundColor: '#182032',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  stepBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stepBadgeText: {
    color: '#818cf8',
    fontSize: 10,
    fontWeight: '800',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  spanLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  spanRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  spanPill: {
    flex: 1,
    backgroundColor: '#0e1320',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  spanPillActive: {
    backgroundColor: '#6366f1',
    borderColor: '#818cf8',
  },
  spanPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  spanPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  actionRow: {
    gap: 10,
  },
  fetchBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fetchBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  clipboardBtn: {
    backgroundColor: '#131926',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  clipboardBtnText: {
    color: '#818cf8',
    fontSize: 13,
    fontWeight: '700',
  },
  geminiBtn: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8b5cf6',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  geminiBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  permissionNote: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    padding: 10,
    backgroundColor: '#0e1320',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  noteIcon: {
    fontSize: 14,
  },
  noteText: {
    flex: 1,
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
  },
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedCountText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  selectToggleText: {
    fontSize: 12,
    color: '#818cf8',
    fontWeight: '700',
  },
  messagesList: {
    gap: 8,
    marginBottom: 16,
  },
  msgCard: {
    backgroundColor: '#131926',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    padding: 12,
  },
  msgCardSelected: {
    borderColor: 'rgba(139, 92, 246, 0.5)',
    backgroundColor: 'rgba(139, 92, 246, 0.06)',
  },
  msgTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  msgCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  msgCheck: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#64748b',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0e1320',
  },
  msgCheckActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  msgCheckMark: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  msgSender: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
  },
  msgDate: {
    fontSize: 11,
    color: '#64748b',
  },
  msgBody: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 17,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#64748b',
    backgroundColor: '#0e1320',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  toggleText: {
    fontSize: 13,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  statusBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  statusBoxText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  resultsCard: {
    backgroundColor: '#182032',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  resultsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  expenseItem: {
    backgroundColor: '#131926',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  merchantIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#182032',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  merchantIcon: {
    fontSize: 19,
  },
  expenseDetails: {
    flex: 1,
  },
  merchantTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 3,
  },
  expenseSubtitle: {
    fontSize: 11.5,
    color: '#94a3b8',
  },
  amountBox: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10b981',
    marginBottom: 3,
  },
  catBadge: {
    fontSize: 10,
    color: '#c084fc',
    fontWeight: '600',
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
