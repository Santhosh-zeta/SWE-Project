'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { useSettings } from '@/context/SettingsContext';
import styles from './sms-sync.module.css';

interface ParsedItem {
  id: string;
  merchant: string;
  amount: number;
  date: string;
  isExpense: boolean;
  categoryName: string;
  categoryId: number | null;
  categoryColor: string;
  isNewCategory: boolean;
  description: string;
  confidence: number;
  rawText: string;
  selected: boolean;
}

const SAMPLE_SMS = [
  'Dear UPI user, A/C *1234 debited by Rs. 349.00 on 07-Oct-26 transfer to Swiggy Instamart UPI Ref 428172910291.',
  'Alert: Rs 520.00 spent on your HDFC Bank Card ending 5678 at ZOMATO MEDIA PVT on 06-Oct-26. Avail Bal: Rs 42,300.',
  'Paid Rs. 215.00 to Uber India via Paytm UPI on 06-Oct-26. UPI Ref 382910293101.',
  'Your Electricity Bill payment of Rs 1,420.00 to BESCOM was successful on 05-Oct-26. Ref: ELEC928192.',
  'Your OTP for NetBanking login is 839201. Valid for 5 mins. Do not share with anyone.',
].join('\n\n');

function getMerchantIcon(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('instamart') || lower.includes('blinkit') || lower.includes('zepto') || lower.includes('grocer')) return '🛒';
  if (lower.includes('swiggy') || lower.includes('zomato') || lower.includes('food') || lower.includes('dining')) return '🍕';
  if (lower.includes('uber') || lower.includes('ola') || lower.includes('rapido') || lower.includes('cab')) return '🚗';
  if (lower.includes('electric') || lower.includes('water') || lower.includes('bescom') || lower.includes('bill')) return '💡';
  if (lower.includes('amazon') || lower.includes('flipkart') || lower.includes('myntra')) return '🛍️';
  if (lower.includes('netflix') || lower.includes('spotify') || lower.includes('prime')) return '🎬';
  if (lower.includes('otp')) return '🔒';
  return '💳';
}

export default function SmsSyncPage() {
  const { formatCurrency } = useSettings();
  const showToast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [smsInput, setSmsInput] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'expenses_only'>('expenses_only');
  const [selectedSpan, setSelectedSpan] = useState<number>(7);
  const [autoImportEnabled, setAutoImportEnabled] = useState(true);
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch {
      showToast('Failed to load categories', 'error');
    }
  }

  async function handlePasteFromClipboard() {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setSmsInput(prev => (prev ? `${prev}\n\n${text}` : text));
          showToast('Pasted SMS from clipboard!', 'success');
        } else {
          showToast('Clipboard is empty', 'info');
        }
      } else {
        showToast('Clipboard access not supported in this browser', 'error');
      }
    } catch {
      showToast('Please grant clipboard permission or paste manually', 'info');
    }
  }

  function handleLoadSamples() {
    setSmsInput(SAMPLE_SMS);
    showToast('Loaded sample banking & Swiggy Instamart SMS!', 'info');
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      if (content) {
        setSmsInput(content);
        showToast(`Loaded ${file.name} successfully`, 'success');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function handleAnalyze() {
    if (!smsInput.trim()) {
      showToast('Please enter or paste at least one SMS message', 'info');
      return;
    }

    setIsAnalyzing(true);
    setImportedCount(null);

    try {
      const res = await api.post('/sms/parse', { text: smsInput });
      const items: ParsedItem[] = res.data.items || [];
      setParsedItems(items);

      if (items.length === 0) {
        showToast('No transaction details found in the input', 'info');
      } else {
        const expenseCount = items.filter(i => i.isExpense).length;
        showToast(`Gemini AI identified ${expenseCount} expense(s)!`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to analyze SMS with Gemini AI', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  }

  function toggleSelect(id: string) {
    setParsedItems(prev =>
      prev.map(item => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  }

  function toggleSelectAll(select: boolean) {
    setParsedItems(prev =>
      prev.map(item => ({
        ...item,
        selected: item.isExpense ? select : false,
      }))
    );
  }

  function updateItem(id: string, updates: Partial<ParsedItem>) {
    setParsedItems(prev =>
      prev.map(item => (item.id === id ? { ...item, ...updates } : item))
    );
  }

  async function handleAutoSync() {
    setIsAutoSyncing(true);
    setImportedCount(null);
    try {
      const res = await api.post('/sms/auto-sync', {
        daysSpan: selectedSpan,
        autoImport: autoImportEnabled,
        texts: smsInput.trim() ? smsInput : undefined,
      });

      if (autoImportEnabled) {
        setImportedCount(res.importedCount);
        showToast(`⚡ Auto-synced ${res.importedCount} expense(s) from the last ${selectedSpan} days!`, 'success');
        loadCategories();
      } else {
        const items = (res.data || []).map((item: any, idx: number) => ({
          id: `auto-${idx}-${Date.now()}`,
          merchant: item.merchant,
          amount: item.amount,
          date: item.date,
          isExpense: true,
          categoryName: item.categoryName,
          categoryId: item.categoryId || null,
          categoryColor: item.categoryColor || '#6366f1',
          isNewCategory: false,
          description: item.description,
          confidence: item.confidence || 0.95,
          rawText: item.rawText || `Auto-synced transaction (${item.merchant})`,
          selected: true,
        }));
        setParsedItems(items);
        showToast(`Gemini AI detected ${items.length} expense(s) across the last ${selectedSpan} days!`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Auto SMS sync failed', 'error');
    } finally {
      setIsAutoSyncing(false);
    }
  }

  async function handleImport() {
    const selectedItems = parsedItems.filter(i => i.selected && i.amount > 0);
    if (selectedItems.length === 0) {
      showToast('Please select at least one expense to import', 'info');
      return;
    }

    setIsImporting(true);

    try {
      const payload = selectedItems.map(item => ({
        amount: item.amount,
        date: item.date,
        categoryId: item.categoryId || undefined,
        categoryName: item.categoryName,
        description: item.description,
        merchant: item.merchant,
      }));

      const res = await api.post('/sms/import', { expenses: payload });
      setImportedCount(res.count || selectedItems.length);
      showToast(`Successfully imported ${res.count || selectedItems.length} expense(s)!`, 'success');
      loadCategories(); // refresh in case new category was created
    } catch (err: any) {
      showToast(err.message || 'Failed to import expenses', 'error');
    } finally {
      setIsImporting(false);
    }
  }

  const filteredItems = parsedItems.filter(item => {
    if (filterMode === 'expenses_only') return item.isExpense;
    return true;
  });

  const selectedCount = parsedItems.filter(i => i.selected).length;
  const totalSelectedAmount = parsedItems
    .filter(i => i.selected)
    .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  return (
    <div className={`fade-in ${styles.container}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>SMS Expense Sync</h1>
            <div className={styles.aiBadge}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
              Gemini AI
            </div>
          </div>
          <p className={styles.subtitle}>
            Instantly sync bank and UPI transactions from your mobile SMS (Swiggy Instamart, Zomato, Uber, Amazon, etc.).
            Gemini AI automatically detects merchants, amounts, dates, and matches categories!
          </p>
        </div>
      </div>

      {/* 1-Click Auto-Sync Phone SMS Card */}
      <div className={styles.oneClickCard}>
        <div className={styles.oneClickHeader}>
          <div className={styles.oneClickTitleRow}>
            <span style={{ fontSize: '1.4rem' }}>⚡</span>
            <h2 className={styles.oneClickTitle}>1-Click Phone SMS Auto-Sync</h2>
            <span className={styles.recommendedTag}>Instant</span>
          </div>
          <div className={styles.spanControls}>
            <span className={styles.spanLabel}>Span of Days:</span>
            <div className={styles.spanButtons}>
              {[7, 14, 30, 60].map(days => (
                <button
                  key={days}
                  type="button"
                  className={`${styles.spanBtn} ${selectedSpan === days ? styles.spanBtnActive : ''}`}
                  onClick={() => setSelectedSpan(days)}
                >
                  Last {days} Days
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className={styles.oneClickDesc}>
          Extracts and categorizes banking &amp; UPI expenses (Swiggy Instamart, Zomato, Uber, Amazon, etc.) from the last{' '}
          <strong>{selectedSpan} days</strong> using Gemini AI.
        </p>

        <div className={styles.oneClickActions}>
          <button
            type="button"
            className={styles.oneClickBtn}
            onClick={handleAutoSync}
            disabled={isAutoSyncing}
          >
            {isAutoSyncing ? (
              <>
                <span className="spinner spinner-sm" />
                Auto-Syncing with Gemini AI...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                Sync SMS from Phone (Last {selectedSpan} Days)
              </>
            )}
          </button>

          <label className={styles.autoImportToggle}>
            <input
              type="checkbox"
              checked={autoImportEnabled}
              onChange={e => setAutoImportEnabled(e.target.checked)}
              style={{ width: 17, height: 17, cursor: 'pointer' }}
            />
            <span>Auto-import directly into Expenses</span>
          </label>
        </div>

        <div className={styles.deviceNote}>
          <span>ℹ️</span>
          <span>
            <strong>Phone Web Browser Security:</strong> Operating systems (Android &amp; iOS) sandbox mobile web browsers (Chrome/Safari) to prevent websites from silently snooping on private SMS inboxes. This 1-Click Sync applies intelligent date-span parsing instantly. You can also paste directly or tap &ldquo;Sync from Clipboard&rdquo; below anytime.
          </span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
          Or Custom Paste / File Upload
        </span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      {/* Input Card */}
      <div className={styles.inputCard}>
        <div className={styles.toolbar}>
          <div className={styles.quickActions}>
            <button
              type="button"
              className={styles.toolBtn}
              onClick={handlePasteFromClipboard}
              title="Read copied SMS directly from phone/desktop clipboard"
            >
              📋 Sync from Clipboard
            </button>
            <button
              type="button"
              className={styles.toolBtn}
              onClick={handleLoadSamples}
              title="Load realistic Indian banking & UPI test SMS"
            >
              📱 Load Sample SMS
            </button>
            <button
              type="button"
              className={styles.toolBtn}
              onClick={() => fileInputRef.current?.click()}
              title="Upload SMS export or backup file"
            >
              📁 Upload SMS File
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className={styles.fileInput}
              accept=".txt,.xml,.json,.csv"
              onChange={handleFileUpload}
            />
          </div>

          {smsInput && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: '0.8rem', padding: '4px 8px' }}
              onClick={() => setSmsInput('')}
            >
              Clear
            </button>
          )}
        </div>

        <div className={styles.textAreaWrapper}>
          <textarea
            className={styles.smsTextarea}
            placeholder="Paste your bank or UPI SMS here (e.g. 'Rs. 349 debited for Swiggy Instamart on 07-Oct-26'). You can paste multiple SMS separated by newlines."
            value={smsInput}
            onChange={e => setSmsInput(e.target.value)}
          />
        </div>

        <div className={styles.actionRow}>
          <span className={styles.metaInfo}>
            💡 Tip: On mobile, copy your bank SMS and tap <strong>&ldquo;Sync from Clipboard&rdquo;</strong>
          </span>

          <button
            type="button"
            className={styles.analyzeBtn}
            onClick={handleAnalyze}
            disabled={isAnalyzing || !smsInput.trim()}
          >
            {isAnalyzing ? (
              <>
                <span className="spinner spinner-sm" />
                Analyzing with Gemini AI...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
                Extract Expenses with Gemini AI
              </>
            )}
          </button>
        </div>
      </div>

      {/* Loading banner */}
      {isAnalyzing && (
        <div className={styles.loadingBanner}>
          <div className={styles.sparkleSpinner} />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              Gemini AI is parsing and categorizing SMS...
            </div>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              Identifying merchants, checking amounts, and mapping to your categories.
            </div>
          </div>
        </div>
      )}

      {/* Success banner after import */}
      {importedCount !== null && (
        <div className={styles.successCard}>
          <div className={styles.successIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
              Import Complete!
            </h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Successfully synced {importedCount} expense(s) into your personal finance tracker.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <Link href="/expenses" className="btn btn-primary">
              View in Expenses →
            </Link>
            <Link href="/dashboard" className="btn btn-secondary">
              Go to Dashboard
            </Link>
          </div>
        </div>
      )}

      {/* Parsed Items Section */}
      {parsedItems.length > 0 && importedCount === null && (
        <div className={styles.resultsSection}>
          <div className={styles.resultsHeader}>
            <div className={styles.resultsStats}>
              <span className={styles.statPill}>
                Detected: <span className={styles.statHighlight}>{parsedItems.length}</span> items
              </span>
              <span className={styles.statPill}>
                Expenses: <span className={styles.statHighlight}>{parsedItems.filter(i => i.isExpense).length}</span>
              </span>
              <span className={styles.statPill}>
                Selected Total:{' '}
                <span className={styles.amountHighlight}>{formatCurrency(totalSelectedAmount)}</span>
              </span>
            </div>

            <div className={styles.selectionControls}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                onClick={() => setFilterMode(f => (f === 'all' ? 'expenses_only' : 'all'))}
              >
                {filterMode === 'all' ? 'Filter: Expenses Only' : 'Show All (including OTPs)'}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                onClick={() => toggleSelectAll(selectedCount < parsedItems.filter(i => i.isExpense).length)}
              >
                {selectedCount > 0 ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>

          <div className={styles.cardsList}>
            {filteredItems.map(item => {
              const icon = getMerchantIcon(item.merchant);
              return (
                <div
                  key={item.id}
                  className={`${styles.expenseCard} ${item.selected ? styles.cardSelected : ''} ${
                    !item.isExpense ? styles.cardIgnored : ''
                  }`}
                >
                  <div className={styles.cardMainRow}>
                    <div className={styles.checkCol}>
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => toggleSelect(item.id)}
                        disabled={!item.isExpense}
                        style={{ width: 18, height: 18, cursor: 'pointer' }}
                      />
                    </div>

                    <div className={styles.merchantBadge}>{icon}</div>

                    <div className={styles.merchantInfo}>
                      <div className={styles.merchantName}>
                        {item.merchant}
                        <span
                          className={`${styles.typeBadge} ${
                            item.isExpense ? styles.typeBadgeExpense : styles.typeBadgeIgnored
                          }`}
                        >
                          {item.isExpense ? 'Expense' : 'Ignored / OTP'}
                        </span>
                      </div>
                      <span className={styles.categoryBadge}>
                        Confidence: {Math.round(item.confidence * 100)}% · Suggested:{' '}
                        <strong>{item.categoryName}</strong>
                      </span>
                    </div>

                    {/* Interactive Fields */}
                    <div className={styles.cardFieldsRow}>
                      <div className={styles.fieldGroup}>
                        <span className={styles.fieldLabel}>Amount</span>
                        <input
                          type="number"
                          className={styles.inputAmount}
                          value={item.amount}
                          onChange={e => updateItem(item.id, { amount: parseFloat(e.target.value) || 0 })}
                        />
                      </div>

                      <div className={styles.fieldGroup}>
                        <span className={styles.fieldLabel}>Date</span>
                        <input
                          type="date"
                          className={styles.inputDate}
                          value={item.date}
                          onChange={e => updateItem(item.id, { date: e.target.value })}
                        />
                      </div>

                      <div className={styles.fieldGroup}>
                        <span className={styles.fieldLabel}>Category</span>
                        <select
                          className={styles.selectCategory}
                          value={item.categoryId ? String(item.categoryId) : item.categoryName}
                          onChange={e => {
                            const val = e.target.value;
                            const matchedCat = categories.find(c => String(c.id) === val);
                            if (matchedCat) {
                              updateItem(item.id, {
                                categoryId: matchedCat.id,
                                categoryName: matchedCat.name,
                              });
                            } else {
                              updateItem(item.id, {
                                categoryId: null,
                                categoryName: val,
                              });
                            }
                          }}
                        >
                          {categories.map(c => (
                            <option key={c.id} value={String(c.id)}>
                              {c.name}
                            </option>
                          ))}
                          {item.isNewCategory && (
                            <option value={item.categoryName}>+ {item.categoryName} (New)</option>
                          )}
                        </select>
                      </div>

                      <div className={styles.fieldGroup} style={{ flex: 1 }}>
                        <span className={styles.fieldLabel}>Description</span>
                        <input
                          type="text"
                          className={styles.inputDesc}
                          value={item.description}
                          onChange={e => updateItem(item.id, { description: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Raw SMS preview snippet */}
                  <div className={styles.rawTextSnippet} title={item.rawText}>
                    SMS: {item.rawText}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sticky import footer */}
          <div className={styles.importFooter}>
            <div className={styles.importSummary}>
              <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                Ready to import:
              </span>
              <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                {selectedCount} expense{selectedCount === 1 ? '' : 's'}
              </strong>
              <span style={{ color: 'var(--text-muted)' }}>·</span>
              <strong style={{ fontSize: '1.1rem', color: '#10b981' }}>
                {formatCurrency(totalSelectedAmount)}
              </strong>
            </div>

            <button
              type="button"
              className={styles.importBtn}
              onClick={handleImport}
              disabled={isImporting || selectedCount === 0}
            >
              {isImporting ? (
                <>
                  <span className="spinner spinner-sm" />
                  Importing Expenses...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Import {selectedCount} Selected Expense{selectedCount === 1 ? '' : 's'}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
