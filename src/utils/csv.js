// src/utils/csv.js — Secure, RFC-4180 compliant CSV Export & Import with formula-injection prevention
// 100% offline client-side file generation and parsing with integer paise precision.

import { toPaise, fromPaise, roundCurrency, validateAmount } from './currency.js';

/**
 * Sanitize a string against spreadsheet formula injection (CSV Injection / CWE-1236).
 * Prepends a single quote if string begins with =, +, -, @, \t, or \r.
 */
export function sanitizeCSVCell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Format a cell for RFC-4180 CSV compliance.
 * Wraps in quotes and escapes internal double quotes if it contains comma, quote, or newline.
 */
export function escapeCSVCell(value) {
  const sanitized = sanitizeCSVCell(value);
  if (/[",\n\r]/.test(sanitized)) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}

/**
 * Export an array of transactions to a clean, RFC-4180 compliant CSV string.
 * Prepend with UTF-8 BOM (\uFEFF) for compatibility with Excel on Windows and Android.
 */
export function exportTransactionsToCSV(transactions, profileName = 'Vault') {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    throw new Error('NO_DATA: No transactions available to export.');
  }

  const headers = [
    'Date',
    'Type',
    'Amount',
    'Currency',
    'Description',
    'Category',
    'PaymentMethod',
    'Notes',
  ];

  const rows = transactions.map((t) => {
    const isIncome = t.type === 'credit' || t.type === 'income';
    const cleanAmount = (Number(t.amount) || 0).toFixed(2);
    const dateStr = t.date ? t.date.slice(0, 10) : new Date().toISOString().slice(0, 10);

    return [
      escapeCSVCell(dateStr),
      escapeCSVCell(isIncome ? 'income' : 'expense'),
      escapeCSVCell(cleanAmount),
      escapeCSVCell('INR'),
      escapeCSVCell(t.description || (isIncome ? 'Income' : t.category || 'Expense')),
      escapeCSVCell(t.category || (isIncome ? 'Income' : 'Other')),
      escapeCSVCell(t.paymentMethod || 'UPI'),
      escapeCSVCell(t.memo || ''),
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  return csvContent;
}

/**
 * Download a CSV string as a file in the browser.
 */
export function triggerCSVDownload(csvContent, filename = 'expensify-transactions.csv') {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Robust RFC-4180 CSV string parser.
 * Handles quoted fields, embedded commas, doubled quotes (""), and multiline cells.
 */
export function parseCSVString(text) {
  if (!text || typeof text !== 'string') return [];

  // Strip UTF-8 BOM if present
  const cleanText = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;

  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let insideQuotes = false;
  let i = 0;

  while (i < cleanText.length) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote: "" -> "
          currentCell += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
          insideQuotes = false;
          i++;
          continue;
        }
      } else {
        currentCell += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        currentRow.push(currentCell.trim());
        currentCell = '';
        i++;
        continue;
      } else if (char === '\r') {
        if (nextChar === '\n') i++; // Skip \r\n
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
        i++;
        continue;
      } else {
        currentCell += char;
        i++;
        continue;
      }
    }
  }

  // Push final cell and row
  if (currentCell !== '' || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }

  return rows.filter((r) => r.some((cell) => cell.length > 0));
}

/**
 * Validate and prepare CSV rows for preview and import.
 * Detects headers, maps columns, identifies valid vs invalid rows, and flags duplicates.
 *
 * @param {string} csvText - Raw text read from user file
 * @param {Array} existingTransactions - Active profile's current transactions for duplicate checking
 * @returns {{
 *   validRows: Array,
 *   invalidRows: Array,
 *   duplicateCount: number,
 *   totalRows: number,
 *   headers: Array
 * }}
 */
export function parseAndValidateCSV(csvText, existingTransactions = []) {
  const rawRows = parseCSVString(csvText);
  if (rawRows.length < 2) {
    throw new Error('INVALID_CSV: File must contain a header row and at least one data row.');
  }

  // Detect header indices (case-insensitive)
  const headerRow = rawRows[0].map((h) => h.toLowerCase().replace(/['"]/g, '').trim());
  const dateIdx = headerRow.findIndex((h) => h.includes('date'));
  const amountIdx = headerRow.findIndex((h) => h.includes('amount') || h.includes('price') || h.includes('cost'));
  const typeIdx = headerRow.findIndex((h) => h.includes('type'));
  const descIdx = headerRow.findIndex((h) => h.includes('desc') || h.includes('merchant') || h.includes('payee') || h.includes('title'));
  const catIdx = headerRow.findIndex((h) => h.includes('category') || h.includes('tag'));
  const payIdx = headerRow.findIndex((h) => h.includes('payment') || h.includes('method') || h.includes('mode'));
  const notesIdx = headerRow.findIndex((h) => h.includes('note') || h.includes('memo') || h.includes('comment'));

  if (dateIdx === -1 || amountIdx === -1) {
    throw new Error('MISSING_COLUMNS: CSV must contain at least "Date" and "Amount" columns.');
  }

  // Build existing transactions duplicate set (key: date_amountPaise_desc)
  const existingSet = new Set(
    existingTransactions.map(
      (t) => `${(t.date || '').slice(0, 10)}_${t.amountPaise || toPaise(t.amount)}_${(t.description || '').toLowerCase()}`
    )
  );

  const validRows = [];
  const invalidRows = [];
  let duplicateCount = 0;

  for (let rowIndex = 1; rowIndex < rawRows.length; rowIndex++) {
    const row = rawRows[rowIndex];
    if (row.length <= Math.max(dateIdx, amountIdx)) {
      invalidRows.push({ rowIndex, row, reason: 'Row has too few columns' });
      continue;
    }

    const rawDate = row[dateIdx];
    const rawAmount = row[amountIdx];
    const rawType = typeIdx !== -1 ? row[typeIdx] : '';
    const rawDesc = descIdx !== -1 ? row[descIdx] : '';
    const rawCat = catIdx !== -1 ? row[catIdx] : '';
    const rawPay = payIdx !== -1 ? row[payIdx] : 'UPI';
    const rawNotes = notesIdx !== -1 ? row[notesIdx] : '';

    // Validate Date
    const parsedDate = new Date(rawDate);
    if (isNaN(parsedDate.getTime())) {
      invalidRows.push({ rowIndex, row, reason: `Invalid date format: "${rawDate}"` });
      continue;
    }
    const cleanDateStr = parsedDate.toISOString();

    // Handle numeric signs and accounting formats (e.g. -450, (450), +500)
    let cleanRawAmount = String(rawAmount || '').trim();
    let isNegativeFromSign = false;
    if (cleanRawAmount.startsWith('(') && cleanRawAmount.endsWith(')')) {
      cleanRawAmount = cleanRawAmount.slice(1, -1).trim();
      isNegativeFromSign = true;
    } else if (cleanRawAmount.startsWith('-') || cleanRawAmount.startsWith("'-")) {
      cleanRawAmount = cleanRawAmount.replace(/^'?-/, '').trim();
      isNegativeFromSign = true;
    } else if (cleanRawAmount.startsWith('+') || cleanRawAmount.startsWith("'+")) {
      cleanRawAmount = cleanRawAmount.replace(/^'?\+/, '').trim();
    }

    // Validate Amount
    const valAmt = validateAmount(cleanRawAmount);
    if (!valAmt.valid) {
      invalidRows.push({ rowIndex, row, reason: `Invalid amount: "${rawAmount}" (${valAmt.error})` });
      continue;
    }

    // Determine Type (expense vs income)
    const typeStr = rawType.toLowerCase().trim();
    let finalType;
    if (typeStr) {
      const isIncome = typeStr === 'credit' || typeStr === 'income' || typeStr === 'deposit';
      finalType = isIncome ? 'credit' : 'debit';
    } else {
      // Inferred from sign if type column was not specified
      finalType = isNegativeFromSign ? 'debit' : 'debit';
    }

    const cleanDesc = (rawDesc || rawCat || (isIncome ? 'Income' : 'Expense')).replace(/^'/, '').trim();
    const cleanCat = (rawCat || (isIncome ? 'Income' : 'Shopping')).replace(/^'/, '').trim();

    // Check duplicate
    const rowKey = `${cleanDateStr.slice(0, 10)}_${valAmt.paise}_${cleanDesc.toLowerCase()}`;
    const isDuplicate = existingSet.has(rowKey);
    if (isDuplicate) {
      duplicateCount++;
    }

    validRows.push({
      rowIndex,
      date: cleanDateStr,
      type: finalType,
      amount: valAmt.amount,
      amountPaise: valAmt.paise,
      description: cleanDesc,
      category: cleanCat,
      paymentMethod: rawPay.replace(/^'/, '').trim() || 'UPI',
      memo: rawNotes.replace(/^'/, '').trim(),
      isDuplicate,
    });
  }

  return {
    validRows,
    invalidRows,
    duplicateCount,
    totalRows: rawRows.length - 1,
    headers: rawRows[0],
  };
}

/**
 * Atomically import validated CSV rows into Dexie IndexedDB.
 *
 * @param {Dexie} db - Dexie instance
 * @param {Array} rowsToImport - Filtered array of valid rows
 * @param {number} profileId - Active profile ID
 * @param {boolean} [skipDuplicates=true] - Whether to exclude rows marked as isDuplicate
 * @returns {Promise<{ importedCount: number }>}
 */
export async function importTransactionsFromCSV(db, rowsToImport, profileId, skipDuplicates = true) {
  if (!db || !profileId) throw new Error('Missing database instance or profileId');

  const filtered = skipDuplicates ? rowsToImport.filter((r) => !r.isDuplicate) : rowsToImport;
  if (filtered.length === 0) {
    return { importedCount: 0 };
  }

  const txRecords = filtered.map((r) => ({
    profileId,
    type: r.type,
    amount: r.amount,
    amountPaise: r.amountPaise,
    category: r.category,
    paymentMethod: r.paymentMethod,
    date: r.date,
    description: r.description,
    memo: r.memo,
    createdAt: new Date().toISOString(),
  }));

  // Atomic database bulk write
  await db.transaction('rw', db.transactions, async () => {
    await db.transactions.bulkAdd(txRecords);
  });

  return { importedCount: txRecords.length };
}
