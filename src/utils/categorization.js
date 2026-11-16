// src/utils/categorization.js — Offline smart categorization engine with preference learning
// 1. Checks explicit user-learned associations (stored in IndexedDB + fast-path sync cache)
// 2. Checks historical profile transaction patterns (token frequency)
// 3. Falls back to offline keyword heuristics (word-boundary regex)

import { db } from '../db/db.js';

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Built-in fallback heuristics matching the 10 database default categories
const FALLBACK_RULES = [
  {
    category: 'Dining',
    regex: /\b(chai|coffee|tea|dinner|lunch|breakfast|swiggy|zomato|pizza|burger|snack|snacks|restaurant|cafe|bakery|subway|mcdonald|canteen|food|drink|drinks|bar|pub)\b/i,
  },
  {
    category: 'Groceries',
    regex: /\b(grocery|groceries|zepto|blinkit|milk|vegetable|vegetables|fruit|fruits|supermarket|instamart|bigbasket|reliance\s+fresh|dmart|ration|provisions)\b/i,
  },
  {
    category: 'Transport',
    regex: /\b(uber|ola|cab|auto|metro|train|bus|fuel|petrol|diesel|toll|flight|fare|rickshaw|irctc|rapido|parking|fastag)\b/i,
  },
  {
    category: 'Shopping',
    regex: /\b(amazon|flipkart|clothes|clothing|shoes|myntra|zara|mall|store|order|h&m|ajio|electronics|book|books|stationery|novel)\b/i,
  },
  {
    category: 'Bills',
    regex: /\b(electricity|water|wifi|broadband|recharge|mobile\s+recharge|jio|airtel|vi|bill|bills|gas|cylinder|dth|utility|bescom|tneb|postpaid)\b/i,
  },
  {
    category: 'Entertainment',
    regex: /\b(movie|movies|cinema|netflix|spotify|prime|game|gaming|concert|party|theatre|bookmyshow|hotstar|pvr|inox)\b/i,
  },
  {
    category: 'Healthcare',
    regex: /\b(doctor|pharmacy|medicine|medicines|hospital|clinic|apollo|tablet|tablets|test|pathology|diagnostic|medplus|dentist)\b/i,
  },
  {
    category: 'Housing',
    regex: /\b(rent|maintenance|house|flat|apartment|broker|deposit|society)\b/i,
  },
  {
    category: 'Subscriptions',
    regex: /\b(subscription|subscriptions|membership|gym|youtube\s+premium|apple\s+music)\b/i,
  },
];

/**
 * Key for profile-specific learned rules stored in localStorage cache.
 */
export function getStorageKey(profileId) {
  return `expensify-learned-rules-${profileId || 'default'}`;
}

/**
 * Load learned merchant-to-category associations from local cache.
 */
export function getLearnedRules(profileId) {
  try {
    const raw = localStorage.getItem(getStorageKey(profileId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Load learned rules asynchronously from Dexie IndexedDB.
 */
export async function getLearnedRulesFromDB(dbInstance = db, profileId) {
  if (!dbInstance || !profileId) return getLearnedRules(profileId);
  try {
    if (dbInstance.learnedRules) {
      const records = await dbInstance.learnedRules.where('profileId').equals(profileId).toArray();
      const map = {};
      for (const r of records) {
        map[r.merchantKey] = {
          category: r.category,
          count: r.count,
          updatedAt: r.updatedAt,
        };
      }
      return map;
    }
  } catch (err) {
    console.warn('Error fetching learned rules from Dexie:', err);
  }
  return getLearnedRules(profileId);
}

/**
 * Persist an entire learned rules dictionary for a profile (used during restore/backup).
 * Syncs to both localStorage cache and IndexedDB table.
 */
export async function saveLearnedRules(rules, profileId, dbInstance = db) {
  if (!profileId || !rules || typeof rules !== 'object') return;
  try {
    localStorage.setItem(getStorageKey(profileId), JSON.stringify(rules));
  } catch (err) {
    console.warn('Failed to persist learned rules dictionary to localStorage:', err);
  }

  if (dbInstance && dbInstance.learnedRules) {
    try {
      await dbInstance.transaction('rw', dbInstance.learnedRules, async () => {
        for (const [key, val] of Object.entries(rules)) {
          const cleanKey = key.trim().toLowerCase();
          if (!cleanKey || !val?.category) continue;
          const existing = await dbInstance.learnedRules
            .where('[profileId+merchantKey]')
            .equals([profileId, cleanKey])
            .first();

          if (existing) {
            await dbInstance.learnedRules.update(existing.id, {
              category: val.category,
              count: val.count || existing.count || 1,
              updatedAt: val.updatedAt || new Date().toISOString(),
            });
          } else {
            await dbInstance.learnedRules.add({
              profileId,
              merchantKey: cleanKey,
              category: val.category,
              count: val.count || 1,
              updatedAt: val.updatedAt || new Date().toISOString(),
            });
          }
        }
      });
    } catch (err) {
      console.warn('Failed to sync learned rules to Dexie:', err);
    }
  }
}

/**
 * Record a user preference when a transaction is saved or corrected.
 * e.g., associate "blue tokai" -> "Dining"
 */
export async function recordLearnedRule(merchant, category, profileId, dbInstance = db) {
  if (!merchant || !category || !profileId) return;
  const key = merchant.trim().toLowerCase();
  if (key.length < 2) return;

  // 1. Fast local cache update
  try {
    const rules = getLearnedRules(profileId);
    rules[key] = {
      category,
      updatedAt: new Date().toISOString(),
      count: (rules[key]?.count || 0) + 1,
    };
    try {
      localStorage.setItem(getStorageKey(profileId), JSON.stringify(rules));
    } catch {}
  } catch (err) {
    console.warn('Failed to save learned category rule to cache:', err);
  }

  // 2. Persistent Dexie storage
  if (dbInstance && dbInstance.learnedRules) {
    try {
      const existing = await dbInstance.learnedRules
        .where('[profileId+merchantKey]')
        .equals([profileId, key])
        .first();

      if (existing) {
        await dbInstance.learnedRules.update(existing.id, {
          category,
          count: (existing.count || 0) + 1,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await dbInstance.learnedRules.add({
          profileId,
          merchantKey: key,
          category,
          count: 1,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn('Failed to save learned rule to Dexie:', err);
    }
  }
}

/**
 * Clear learned rules for a profile (e.g. on profile deletion or reset).
 */
export async function clearLearnedRules(profileId, dbInstance = db) {
  if (!profileId) return;
  try {
    localStorage.removeItem(getStorageKey(profileId));
  } catch (err) {
    console.warn('Failed to clear learned rules from cache:', err);
  }

  if (dbInstance && dbInstance.learnedRules) {
    try {
      await dbInstance.learnedRules.where('profileId').equals(profileId).delete();
    } catch (err) {
      console.warn('Failed to clear learned rules from Dexie:', err);
    }
  }
}

/**
 * Predict a category for a given description string.
 * Priority:
 *   1. Exact match in learned rules
 *   2. Word-boundary match in learned rules (preventing overbroad substring false-positives)
 *   3. Most frequent category from user's past transactions matching tokens
 *   4. Built-in keyword heuristics
 *
 * @param {string} text - Description / merchant text entered by user
 * @param {Array} [pastTransactions] - Recent transactions for the active profile
 * @param {number|string} [profileId] - Active profile ID
 * @param {Object} [learnedRulesData] - Optional direct dictionary of learned rules
 * @returns {string|null} - Inferred category name or null
 */
export function suggestCategory(text, pastTransactions = [], profileId = null, learnedRulesData = null) {
  if (!text || typeof text !== 'string') return null;
  const clean = text.trim().toLowerCase();
  if (clean.length < 2) return null;

  // 1. Check explicit learned rules for this profile
  const learned = learnedRulesData && typeof learnedRulesData === 'object'
    ? learnedRulesData
    : getLearnedRules(profileId);

  // Exact match
  if (learned[clean]?.category) {
    return learned[clean].category;
  }

  // Word-boundary match: check if merchantKey matches as a distinct word/phrase in clean
  for (const [merchantKey, data] of Object.entries(learned)) {
    if (merchantKey.length < 3) continue;

    // Use word boundaries so "car" does NOT match "card", "on" does NOT match "amazon"
    const boundaryRegex = new RegExp(`(^|\\s|[.,!?-])${escapeRegExp(merchantKey)}(\\s|[.,!?-]|$)`, 'i');
    if (boundaryRegex.test(clean)) {
      return data.category;
    }
  }

  // 2. Check user's transaction history for matching keyword tokens
  if (Array.isArray(pastTransactions) && pastTransactions.length > 0) {
    const tokens = clean.split(/\s+/).filter((w) => w.length >= 3);
    const categoryCounts = {};

    pastTransactions.forEach((tx) => {
      if (tx.type !== 'debit' && tx.type !== 'expense') return;
      const desc = (tx.description || '').toLowerCase();
      const cat = tx.category;
      if (!cat) return;

      const hasMatch = tokens.some((token) => {
        const tokenRegex = new RegExp(`(^|\\s|[.,!?-])${escapeRegExp(token)}(\\s|[.,!?-]|$)`, 'i');
        return tokenRegex.test(desc);
      });

      if (hasMatch) {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      }
    });

    let bestCategory = null;
    let maxCount = 0;
    for (const [cat, count] of Object.entries(categoryCounts)) {
      if (count > maxCount) {
        maxCount = count;
        bestCategory = cat;
      }
    }
    if (bestCategory) return bestCategory;
  }

  // 3. Fallback to built-in keyword regex
  for (const rule of FALLBACK_RULES) {
    if (rule.regex.test(clean)) {
      return rule.category;
    }
  }

  return null;
}
