import { parse, getISOWeek } from 'date-fns';
import { 
  ProcessedFeedback, 
  FeedbackRow, 
  ISSUE_CATEGORIES,
  IssueCategory
} from './types';

export function parseVNDate(str: string): Date | null {
  if (!str) return null;
  try {
    // Format: "26/09/2025 17:05:09"
    return parse(str, 'dd/MM/yyyy HH:mm:ss', new Date());
  } catch (e) {
    console.error('Error parsing date:', str, e);
    return null;
  }
}

export function getWeekKey(date: Date): string {
  const year = date.getFullYear();
  const week = getISOWeek(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function classifyFeedback(feedbackText: string, rating?: number, customCategories?: Record<string, IssueCategory>): string[] {
  if (!feedbackText) return ['unclassified'];
  const text = feedbackText.toLowerCase();
  const matched: string[] = [];
  const categories = customCategories || ISSUE_CATEGORIES;
  
  // Negative prefixes to avoid false positives in positive category
  const negativePrefixes = ['không', 'ko', 'chưa', 'chẳng', 'không hề', 'k'];

  for (const [key, cat] of Object.entries(categories)) {
    // Rule 1: Skip positive category if rating is low (1-3 stars)
    // Positive label should only be for 4-5 stars
    if (key === 'positive' && rating !== undefined && rating <= 3) {
      continue;
    }

    if (cat.keywords.some(kw => {
      const lowerKw = kw.toLowerCase();
      const index = text.indexOf(lowerKw);
      
      if (index === -1) return false;

      // Special check for positive category to avoid "không tốt", "ko hay"
      if (key === 'positive') {
        const textBefore = text.substring(0, index).trim();
        const wordsBefore = textBefore.split(/\s+/);
        const lastWord = wordsBefore[wordsBefore.length - 1];
        
        if (negativePrefixes.includes(lastWord)) {
          return false;
        }
      }

      return true;
    })) {
      matched.push(key);
    }
  }
  return matched.length ? matched : ['unclassified'];
}

export function isActionable(feedback: Partial<FeedbackRow>): boolean {
  const text = (feedback.Feedback || '').trim();
  
  // Filter 1: Too short
  if (text.length < 5) return false;
  
  // Filter 2: Only emojis
  if (/^[\p{Emoji}\s]+$/u.test(text)) return false;
  
  // Filter 3: Spam patterns
  const spamPatterns = [
    /OTP.*\d{6}/,
    /call\.whatsapp/,
    /Shopeepay/i,
    /^\d+$/,
    /^[a-z]{1,3}$/i,
    /SJC|VÀNG.*TRIỆU/i
  ];
  if (spamPatterns.some(p => p.test(text))) return false;
  
  // Filter 4: Too generic
  const genericPhrases = ['ok', 'tốt', 'hay', 'oke', 'good', 'ổn', 'không', 'k', 'yes', 'no', 'có'];
  if (genericPhrases.includes(text.toLowerCase())) return false;
  
  return true;
}

export function priorityScore(feedback: Partial<FeedbackRow>): number {
  let score = 0;
  const text = feedback.Feedback || '';
  const rating = parseInt(feedback.Rating || '0');
  
  // 1★ with long content = highest priority
  if (rating === 1 && text.length > 50) score += 10;
  
  // Has email = can follow up
  if (feedback.Email && feedback.Email.includes('@')) score += 5;
  
  // Mention specific bug
  if (/âm thanh|tiếng|video|load|lỗi|bug/i.test(text)) score += 3;
  
  // Feature request
  if (/nên có|cần thêm|thêm tính năng|đề xuất/i.test(text)) score += 2;
  
  // Rating 4-5 with specific feedback
  if (rating >= 4 && text.length > 30) score += 4;
  
  return score;
}

export function parseLatency(row: Partial<FeedbackRow>): string {
  const latencyText = row['Latency Text'] || '';
  if (latencyText.includes('Nhanh')) return 'fast';
  if (latencyText.includes('Bình thường')) return 'normal';  
  if (latencyText.includes('Hơi chậm')) return 'slow';
  if (latencyText.includes('Chậm') && !latencyText.includes('Hơi')) return 'very_slow';
  if (latencyText.includes('Rất chậm')) return 'critical';
  return 'unknown';
}

export function parseDevice(row: Partial<FeedbackRow>) {
  return {
    deviceType: row['Device Type'] || 'Unknown',
    os: row['OS'] || 'Unknown',
    browser: row['Browser'] || 'Unknown',
    isMobile: row['Device Type'] === 'Mobile'
  };
}

export function processData(rows: FeedbackRow[], customCategories?: Record<string, IssueCategory>): ProcessedFeedback[] {
  return rows.map(row => {
    const date = parseVNDate(row.Timestamp) || new Date();
    const rating = parseInt(row.Rating) || 0;
    return {
      ...row,
      _id: `${row.Feedback}${row.Timestamp}`.replace(/[\/\s\.]/g, '_').substring(0, 500),
      _date: date,
      _week: getWeekKey(date),
      _rating: rating,
      _categories: classifyFeedback(row.Feedback, rating, customCategories),
      _isActionable: isActionable(row),
      _priority: priorityScore(row),
      _latencyBucket: parseLatency(row),
      _deviceInfo: parseDevice(row)
    };
  }).filter(obj => obj._rating > 0);
}
