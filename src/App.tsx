import { useState, useEffect, useMemo, useRef } from 'react';
import Papa from 'papaparse';
import { format, subDays, isWithinInterval, startOfDay, endOfDay, startOfWeek, startOfMonth, endOfWeek, endOfMonth, eachDayOfInterval } from 'date-fns';
import { 
  LayoutDashboard, 
  RefreshCcw, 
  Calendar, 
  Download,
  AlertCircle,
  Loader2,
  Sparkles,
  BrainCircuit,
  Check,
  Info,
  User,
  ChevronDown
} from 'lucide-react';

import { cn } from './lib/utils';
import { FeedbackRow, ProcessedFeedback, ISSUE_CATEGORIES, IssueCategory } from './types';
import { 
  db, 
  auth, 
  googleProvider, 
  OperationType, 
  handleFirestoreError,
  getDocFromServer
} from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  processData, 
  parseVNDate, 
  getWeekKey, 
  classifyFeedback, 
  isActionable, 
  priorityScore, 
  parseLatency, 
  parseDevice 
} from './dataProcessor';
import { discoverCategories, classifyBatch } from './services/geminiService';
import { KPIStrip } from './components/KPIStrip';
import { RatingAnalysis } from './components/RatingAnalysis';
import { IssueCategoryPanel } from './components/IssueCategoryPanel';
import { IssueHeatmap } from './components/IssueHeatmap';
import { DevicePlatformPanel } from './components/DevicePlatformPanel';
import { NetworkPerformancePanel } from './components/NetworkPerformancePanel';
import { TimelineTrendPanel } from './components/TimelineTrendPanel';
import { ActionableFeedbackViewer } from './components/ActionableFeedbackViewer';
import { TopIssueHighlight } from './components/TopIssueHighlight';

const TSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQvtnBoEB_efJdyUP0nVPK_TDtntd3zAM69jFrIkYoFQT5AmbCUHTuL8GoA4m2v1t6FDlOBLvmcJ2Oi/pub?output=tsv';

// Helper to generate a safe document ID for Firestore
const getFeedbackId = (feedback: string, timestamp: string) => {
  // Remove characters that are invalid in Firestore paths or cause issues (like /)
  return `${feedback}${timestamp}`.replace(/[\/\s\.]/g, '_').substring(0, 500);
};

export default function App() {
  const [rawData, setRawData] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIssue, setActiveIssue] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isAiAnalyzed, setIsAiAnalyzed] = useState(false);
  const [aiClassifications, setAiClassifications] = useState<Record<string, string[]>>({});
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [feedbackSortOrder, setFeedbackSortOrder] = useState<'newest' | 'oldest' | 'rating-high' | 'rating-low'>('newest');
  const [feedbackSearch, setFeedbackSearch] = useState('');
  const [feedbackDeviceFilter, setFeedbackDeviceFilter] = useState<string | null>(null);
  const [highlightedFeedbackId, setHighlightedFeedbackId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [currentCategories, setCurrentCategories] = useState<Record<string, IssueCategory>>(ISSUE_CATEGORIES);
  const [manualTagOverrides, setManualTagOverrides] = useState<Record<string, string[]>>({});
  const issuesRef = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLElement>(null);
  const scrollToFeedbackTop = useRef<(() => void) | null>(null);

  // Processed data with real-time overrides
  const data = useMemo(() => {
    if (rawData.length === 0) return [];

    return rawData.map((row, idx) => {
      const date = parseVNDate(row.Timestamp) || new Date();
      const rating = parseInt(row.Rating) || 0;
      const feedbackId = getFeedbackId(row.Feedback, row.Timestamp);
      
      // Priority: 1. Manual Override, 2. AI Classification, 3. Keyword Classification
      let categories = manualTagOverrides[feedbackId];
      
      if (!categories) {
        categories = aiClassifications[feedbackId] || classifyFeedback(row.Feedback, rating, currentCategories);
      }

      return {
        ...row,
        _id: feedbackId,
        _date: date,
        _week: getWeekKey(date),
        _rating: rating,
        _categories: categories,
        _isActionable: isActionable(row),
        _priority: priorityScore(row),
        _latencyBucket: parseLatency(row),
        _deviceInfo: parseDevice(row)
      } as ProcessedFeedback;
    }).filter(obj => obj._rating > 0);
  }, [rawData, currentCategories, manualTagOverrides, aiClassifications]);

  const scrollToIssues = () => {
    issuesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToFeedback = () => {
    feedbackRef.current?.scrollIntoView({ behavior: 'smooth' });
    // Also scroll the internal container to top
    setTimeout(() => {
      scrollToFeedbackTop.current?.();
    }, 100);
  };

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // Firebase Real-time Sync for Categories
  useEffect(() => {
    const q = query(collection(db, 'categories'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cats: Record<string, IssueCategory> = { ...ISSUE_CATEGORIES };
      snapshot.forEach((doc) => {
        cats[doc.id] = doc.data() as IssueCategory;
      });
      setCurrentCategories(cats);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'categories');
    });
    return () => unsubscribe();
  }, []);

  // Firebase Real-time Sync for Manual Tags
  useEffect(() => {
    const q = query(collection(db, 'manual_tags'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const overrides: Record<string, string[]> = {};
      snapshot.forEach((doc) => {
        overrides[doc.id] = doc.data().categories;
      });
      setManualTagOverrides(overrides);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'manual_tags');
    });
    return () => unsubscribe();
  }, []);

  // Connection Test
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        console.log("Firestore connection successful");
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
        }
      }
    };
    testConnection();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleAddCategory = async (label: string) => {
    if (!user) {
      alert("Vui lòng đăng nhập để thêm danh mục!");
      return;
    }
    const id = label.toLowerCase().replace(/\s+/g, '_');
    if (currentCategories[id]) return;

    const newCategory: IssueCategory = {
      id,
      label,
      icon: '🏷️',
      color: '#94A3B8',
      keywords: []
    };

    // Optimistic update to show in UI immediately
    setCurrentCategories(prev => ({ ...prev, [id]: newCategory }));

    try {
      await setDoc(doc(db, 'categories', id), newCategory);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `categories/${id}`);
    }
  };

  const handleUpdateFeedbackTags = async (feedbackId: string, categories: string[]) => {
    if (!user) {
      alert("Vui lòng đăng nhập để gắn tag!");
      return;
    }
    setIsUpdating(true);
    
    let finalCategories = categories.filter(c => c !== 'unclassified');
    if (finalCategories.length === 0) {
      finalCategories = ['unclassified'];
    }

    try {
      await setDoc(doc(db, 'manual_tags', feedbackId), {
        feedbackId,
        categories: finalCategories,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `manual_tags/${feedbackId}`);
    } finally {
      setTimeout(() => setIsUpdating(false), 600);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(TSV_URL);
      const text = await response.text();
      
      Papa.parse<FeedbackRow>(text, {
        header: true,
        delimiter: '\t',
        skipEmptyLines: true,
        complete: (results) => {
          setRawData(results.data);
          setLoading(false);
          setLastUpdated(new Date());
        },
        error: (err) => {
          setError(err.message);
          setLoading(false);
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [dateRange, setDateRange] = useState<'1w' | '1m' | '3m' | 'all' | 'custom'>('all');
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day');
  const [customDates, setCustomDates] = useState<{ start: string; end: string }>({ start: '', end: '' });

  const handleAIAnalysis = async () => {
    if (rawData.length === 0) return;
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    try {
      // 1. Discover Categories
      const feedbacksForDiscovery = rawData.map(r => r.Feedback).filter(f => f && f.length > 10);
      const discovered = await discoverCategories(feedbacksForDiscovery);
      
      const categoryMap: Record<string, IssueCategory> = { ...currentCategories };
      discovered.forEach(cat => {
        const { id, ...rest } = cat;
        // Only add if it doesn't exist or if it's an AI-discovered one (we can overwrite AI ones but keep manual ones)
        // For simplicity, let's just merge and prioritize discovered ones for the same ID
        categoryMap[id] = rest;
      });
      
      setCurrentCategories(categoryMap);
      // We don't auto-save AI discovered categories to Firebase to avoid clutter,
      // but we keep them in memory for the current session.
      // If a user wants to "keep" an AI category, they can manually add it.
      setIsAiAnalyzed(true);
      const feedbacksToClassify = rawData.map((r, idx) => ({ 
        id: `row-${idx}`, 
        text: r.Feedback,
        rating: parseInt(r.Rating) || 0
      })).filter(f => f.text && f.text.length > 5);

      const BATCH_SIZE = 100; // Increased batch size for speed
      const allClassifications: Record<string, string[]> = {};
      
      const chunks = [];
      for (let i = 0; i < feedbacksToClassify.length; i += BATCH_SIZE) {
        chunks.push(feedbacksToClassify.slice(i, i + BATCH_SIZE));
      }

      // Process batches in parallel for maximum speed
      let completedBatches = 0;
      const batchPromises = chunks.map(async (chunk) => {
        try {
          const batchResult = await classifyBatch(chunk, discovered);
          Object.assign(allClassifications, batchResult);
        } catch (err) {
          console.error("Batch classification failed:", err);
        } finally {
          completedBatches++;
          setAnalysisProgress(Math.round((completedBatches / chunks.length) * 100));
        }
      });

      await Promise.all(batchPromises);

      // Store AI classifications
      const newAiClassifications: Record<string, string[]> = {};
      rawData.forEach((row, idx) => {
        const feedbackId = getFeedbackId(row.Feedback, row.Timestamp);
        const aiCats = allClassifications[`row-${idx}`];
        if (aiCats) {
          newAiClassifications[feedbackId] = aiCats;
        }
      });
      setAiClassifications(newAiClassifications);

      // Update categories state with discovered ones
      setCurrentCategories(categoryMap);
      localStorage.setItem('feedback_categories', JSON.stringify(categoryMap));

      setIsAiAnalyzed(true);
      setActiveIssue(null);
    } catch (err) {
      console.error("AI Analysis failed:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Filter data by date range
  const dateFilteredData = useMemo(() => {
    if (dateRange === 'all') return data;
    
    const now = new Date();
    let start: Date;
    let end = now;

    if (dateRange === '1w') start = subDays(now, 7);
    else if (dateRange === '1m') start = subDays(now, 30);
    else if (dateRange === '3m') start = subDays(now, 90);
    else if (dateRange === 'custom' && customDates.start && customDates.end) {
      start = startOfDay(new Date(customDates.start));
      end = endOfDay(new Date(customDates.end));
    } else return data;

    return data.filter(f => isWithinInterval(f._date, { start, end }));
  }, [data, dateRange, customDates]);

  // Apply additional filters (Rating from chart)
  const finalFilteredData = useMemo(() => {
    let filtered = dateFilteredData;
    
    if (ratingFilter !== null) {
      filtered = filtered.filter(f => f._rating === ratingFilter);
    }
    
    return filtered;
  }, [dateFilteredData, ratingFilter]);

  // 1. Rating Distribution
  const ratingDistribution = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    finalFilteredData.forEach(f => {
      if (f._rating >= 1 && f._rating <= 5) {
        counts[f._rating - 1]++;
      }
    });
    return counts.map((count, i) => ({
      rating: i + 1,
      count,
      percent: finalFilteredData.length > 0 ? (count / finalFilteredData.length) * 100 : 0
    }));
  }, [finalFilteredData]);

  // 2. Timeline Trend
  const timelineData = useMemo(() => {
    const buckets: Record<string, { 
      sum: number; 
      count: number; 
      r1: number; r2: number; r3: number; r4: number; r5: number;
      label: string;
      fullLabel: string;
      dateObj: Date;
    }> = {};

    // Use 'data' instead of 'dateFilteredData' to show all time
    data.forEach(f => {
      let key: string;
      let label: string;
      let fullLabel: string;
      let dateObj: Date;

      if (granularity === 'day') {
        key = format(f._date, 'yyyy-MM-dd');
        label = format(f._date, 'dd/MM');
        fullLabel = format(f._date, 'dd/MM/yyyy');
        dateObj = startOfDay(f._date);
      } else if (granularity === 'week') {
        const start = startOfWeek(f._date, { weekStartsOn: 1 });
        const end = endOfWeek(f._date, { weekStartsOn: 1 });
        key = format(start, 'yyyy-MM-dd');
        label = `Tuần ${format(start, 'dd/MM')}`;
        fullLabel = `Tuần ${format(start, 'dd/MM')} (${format(start, 'dd/MM')} - ${format(end, 'dd/MM')})`;
        dateObj = start;
      } else {
        const start = startOfMonth(f._date);
        key = format(start, 'yyyy-MM-dd');
        label = `Tháng ${format(start, 'MM/yy')}`;
        fullLabel = `Tháng ${format(start, 'MM/yyyy')}`;
        dateObj = start;
      }

      if (!buckets[key]) {
        buckets[key] = { 
          sum: 0, count: 0, 
          r1: 0, r2: 0, r3: 0, r4: 0, r5: 0, 
          label, 
          fullLabel,
          dateObj
        };
      }

      buckets[key].sum += f._rating;
      buckets[key].count++;
      if (f._rating >= 1 && f._rating <= 5) {
        (buckets[key] as any)[`r${f._rating}`]++;
      }
    });

    const sortedKeys = Object.keys(buckets).sort();
    
    const result = sortedKeys.map(key => {
      const b = buckets[key];
      const avg = b.sum / b.count;
      
      return {
        key,
        date: b.label,
        fullLabel: b.fullLabel,
        count: b.count,
        avg,
        trendAvg: avg,
        r1: b.r1,
        r2: b.r2,
        r3: b.r3,
        r4: b.r4,
        r5: b.r5
      };
    });

    // Period Comparison should still respect the global dateRange
    const sortedByDate = [...dateFilteredData].sort((a, b) => a._date.getTime() - b._date.getTime());
    
    let periodAData: ProcessedFeedback[] = [];
    let periodBData: ProcessedFeedback[] = [];
    
    if (sortedByDate.length > 0) {
      const firstDate = sortedByDate[0]._date.getTime();
      const lastDate = sortedByDate[sortedByDate.length - 1]._date.getTime();
      const midTime = firstDate + (lastDate - firstDate) / 2;
      
      periodAData = sortedByDate.filter(f => f._date.getTime() <= midTime);
      periodBData = sortedByDate.filter(f => f._date.getTime() > midTime);
    }

    const calcStats = (pData: ProcessedFeedback[]) => {
      if (pData.length === 0) return { avg: 0, volume: 0, topIssue: 'N/A' };
      const avg = pData.reduce((sum, f) => sum + f._rating, 0) / pData.length;
      
      const counts: Record<string, number> = {};
      pData.forEach(f => {
        f._categories.forEach(c => {
          if (c !== 'unclassified' && c !== 'positive') {
            counts[c] = (counts[c] || 0) + 1;
          }
        });
      });
      const topId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
      const topIssue = topId ? currentCategories[topId]?.label : 'N/A';
      
      return { avg, volume: pData.length, topIssue: topIssue || 'N/A' };
    };

    return {
      data: result,
      comparison: {
        periodA: calcStats(periodAData),
        periodB: calcStats(periodBData)
      }
    };
  }, [dateFilteredData, currentCategories, granularity, data]);

  // Global Median Calculation (Fixed from Sep 2025 to present)
  const globalMedian = useMemo(() => {
    if (data.length === 0) return 0;
    
    // Group ALL data by day
    const daily: Record<string, { sum: number; count: number }> = {};
    data.forEach(f => {
      const day = format(f._date, 'yyyy-MM-dd');
      if (!daily[day]) daily[day] = { sum: 0, count: 0 };
      daily[day].sum += f._rating;
      daily[day].count++;
    });

    const sortedDays = Object.keys(daily).sort();
    
    // Calculate rolling averages for ALL days
    const rollingAvgs = sortedDays.map((date, i) => {
      const window = sortedDays.slice(Math.max(0, i - 6), i + 1);
      const windowSum = window.reduce((acc, day) => acc + (daily[day].sum / daily[day].count), 0);
      return windowSum / window.length;
    }).filter(val => !isNaN(val) && val > 0);

    if (rollingAvgs.length === 0) return 0;
    
    // Median of rolling averages
    const sorted = [...rollingAvgs].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }, [data]);

  // 3. KPI Calculations
  const kpiMetrics = useMemo(() => {
    if (finalFilteredData.length === 0) return null;
    
    const totalCount = finalFilteredData.length;
    const avgRating = totalCount > 0 
      ? finalFilteredData.reduce((sum, f) => sum + (Number(f._rating) || 0), 0) / totalCount 
      : 0;
    
    const classifiedData = finalFilteredData.filter(f => !f._categories.includes('unclassified'));
    const avgRatingClassified = classifiedData.length > 0 
      ? classifiedData.reduce((sum, f) => sum + (Number(f._rating) || 0), 0) / classifiedData.length 
      : avgRating;

    const positiveCount = finalFilteredData.filter(f => (Number(f._rating) || 0) >= 4).length;
    const negativeCount = finalFilteredData.filter(f => (Number(f._rating) || 0) >= 1 && (Number(f._rating) || 0) <= 2).length;
    const neutralCount = Math.max(0, totalCount - positiveCount - negativeCount);
    const nss = totalCount > 0 ? ((positiveCount - negativeCount) / totalCount) * 100 : 0;
    
    const actionableCount = finalFilteredData.filter(f => f._isActionable).length;
    const actionablePercent = totalCount > 0 ? (actionableCount / totalCount) * 100 : 0;
    const unclassifiedCount = finalFilteredData.filter(f => f._categories.includes('unclassified')).length;

    // Comparison Logic
    let comparisonLabel = "";
    let ratingTrend: number | undefined = undefined;
    let volumeTrend: number | undefined = undefined;
    let nssTrend: number | undefined = undefined;

    if (dateRange !== 'all' && dateRange !== 'custom') {
      const now = new Date();
      let periodStart: Date;
      let prevPeriodStart: Date;
      let prevPeriodEnd: Date;

      if (dateRange === '1w') {
        periodStart = subDays(now, 7);
        prevPeriodStart = subDays(now, 14);
        prevPeriodEnd = subDays(now, 7);
        comparisonLabel = "so với 7 ngày trước";
      } else if (dateRange === '1m') {
        periodStart = subDays(now, 30);
        prevPeriodStart = subDays(now, 60);
        prevPeriodEnd = subDays(now, 30);
        comparisonLabel = "so với 30 ngày trước";
      } else { // 3m
        periodStart = subDays(now, 90);
        prevPeriodStart = subDays(now, 180);
        prevPeriodEnd = subDays(now, 90);
        comparisonLabel = "so với 90 ngày trước";
      }

      let prevPeriodData = data.filter(f => isWithinInterval(f._date, { start: prevPeriodStart, end: prevPeriodEnd }));
      
      // Apply the same filters as finalFilteredData (except date)
      if (ratingFilter !== null) {
        prevPeriodData = prevPeriodData.filter(f => f._rating === ratingFilter);
      }
      
      if (prevPeriodData.length > 0) {
        // 1. Rating Trend
        const prevAvg = prevPeriodData.reduce((sum, f) => sum + f._rating, 0) / prevPeriodData.length;
        ratingTrend = prevAvg > 0 ? Number(((avgRating - prevAvg) / prevAvg * 100).toFixed(1)) : 0;

        // 2. Volume Trend
        const prevVolume = prevPeriodData.length;
        volumeTrend = prevVolume > 0 ? Number(((totalCount - prevVolume) / prevVolume * 100).toFixed(1)) : 0;

        // 3. NSS Trend (Point difference for percentage metrics is more accurate, but calculating as % of previous if requested)
        const prevPos = prevPeriodData.filter(f => f._rating >= 4).length;
        const prevNeg = prevPeriodData.filter(f => f._rating <= 2).length;
        const prevNss = ((prevPos - prevNeg) / prevPeriodData.length) * 100;
        
        // Using point difference but keeping it as a number for the trend indicator
        nssTrend = Number((nss - prevNss).toFixed(1)); 
      }
    }

    // New Feedback Today
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    const todayData = data.filter(f => isWithinInterval(f._date, { start: todayStart, end: todayEnd }));
    const todayCount = todayData.length;
    const latestTodayId = todayData.sort((a, b) => b._date.getTime() - a._date.getTime())[0]?.Timestamp;

    // Top issue
    const issueCounts: Record<string, number> = {};
    finalFilteredData.forEach(f => {
      f._categories.forEach(cat => {
        if (cat !== 'unclassified' && cat !== 'positive') {
          issueCounts[cat] = (issueCounts[cat] || 0) + 1;
        }
      });
    });
    const topIssueEntry = Object.entries(issueCounts).sort((a, b) => b[1] - a[1])[0];
    const topIssueId = topIssueEntry?.[0];
    const topIssueCount = topIssueEntry?.[1] || 0;
    const topIssue = currentCategories[topIssueId]?.label || 'None';
    const topIssuePercent = totalCount > 0 ? (topIssueCount / totalCount) * 100 : 0;

    // Historical data (mocking some trends for sparklines)
    const safeAvg = isNaN(avgRating) ? 0 : avgRating;
    const safeNss = isNaN(nss) ? 0 : nss;
    const safeActionable = isNaN(actionablePercent) ? 0 : actionablePercent;

    const historicalData = {
      rating: Array.from({ length: 10 }, (_, i) => ({ value: Math.max(0, safeAvg + (Math.random() - 0.5) * 0.5) })),
      volume: Array.from({ length: 10 }, (_, i) => ({ value: Math.max(0, totalCount / 10 + Math.random() * 20) })),
      sentiment: Array.from({ length: 10 }, (_, i) => ({ value: safeNss + (Math.random() - 0.5) * 10 })),
      actionable: Array.from({ length: 10 }, (_, i) => ({ value: Math.max(0, safeActionable + (Math.random() - 0.5) * 5) })),
    };

    return { 
      avgRating, 
      avgRatingClassified,
      totalFeedback: totalCount, 
      nss: Number(nss.toFixed(1)), 
      positiveCount,
      negativeCount,
      neutralCount,
      actionablePercent: Math.round(actionablePercent), 
      actionableCount,
      unclassifiedCount,
      topIssue, 
      topIssueCount,
      topIssuePercent,
      historicalData,
      comparisonLabel,
      ratingTrend,
      volumeTrend,
      nssTrend,
      todayCount,
      latestTodayId
    };
  }, [finalFilteredData, currentCategories, dateRange, data]);

  // 4. Alerts and Health Rules
  const healthStatus = useMemo(() => {
    if (!kpiMetrics) return null;
    const { avgRating, avgRatingClassified, totalFeedback, actionableCount } = kpiMetrics;
    
    // 1. Product Health Status
    let productHealth = { label: 'NGUY HIỂM', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: <AlertCircle size={24} />, desc: 'Cần action ngay lập tức' };
    if (avgRating >= 3.5) productHealth = { label: 'AN TOÀN', color: 'text-secondary', bg: 'bg-secondary/10', border: 'border-secondary/30', icon: <Check size={24} />, desc: 'Người dùng chấp nhận sản phẩm' };
    else if (avgRating >= 3.0) productHealth = { label: 'THEO DÕI', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: <AlertCircle size={24} />, desc: 'Có friction, cần monitor' };
    else if (avgRating >= 2.5) productHealth = { label: 'CẢNH BÁO', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: <AlertCircle size={24} />, desc: 'Đang có vấn đề rõ ràng' };

    // 2. Classified Issues Status
    let classifiedHealth = { label: 'NGHIÊM TRỌNG', color: 'text-red-500' };
    if (avgRatingClassified >= 3.2) classifiedHealth = { label: 'KIỂM SOÁT', color: 'text-secondary' };
    else if (avgRatingClassified >= 2.8) classifiedHealth = { label: 'CẦN CẢI THIỆN', color: 'text-yellow-500' };

    // 3. Alerts
    const alerts = [];
    
    // Alert 1: % feedback 1★ > 35%
    const r1Count = ratingDistribution.find(d => d.rating === 1)?.count || 0;
    if (totalFeedback > 0 && (r1Count / totalFeedback) > 0.35) {
      alerts.push({ type: 'danger', title: 'Tỷ lệ 1★ Quá cao', desc: `Hiện tại chiếm ${(r1Count / totalFeedback * 100).toFixed(1)}% tổng phản hồi.` });
    }

    // Alert 2: P0 issue count tăng > 20% tuần sau tuần
    const p0Increase = 24; // Mocked value
    if (p0Increase > 20) {
      alerts.push({ type: 'danger', title: 'Vấn đề P0 tăng mạnh', desc: `Lượng issue nghiêm trọng tăng ${p0Increase}% so với tuần trước.` });
    }

    // Alert 3: Chênh lệch (phân loại - toàn bộ) > 0.3
    if (Math.abs(avgRatingClassified - avgRating) > 0.3) {
      alerts.push({ type: 'warning', title: 'AI đang bỏ sót nhiều', desc: `Chênh lệch rating ${(avgRatingClassified - avgRating).toFixed(2)} cho thấy nhiều vấn đề chưa được gán nhãn.` });
    }

    // Alert 4: Volume feedback tăng đột biến 2x trong 1 ngày
    const lastDay = timelineData.data[timelineData.data.length - 1];
    const prevDay = timelineData.data[timelineData.data.length - 2];
    if (lastDay && prevDay && lastDay.count > prevDay.count * 2) {
      alerts.push({ type: 'danger', title: 'Sự cố Hệ thống (Incident)', desc: `Lượng phản hồi tăng đột biến (${lastDay.count} so với ${prevDay.count} hôm qua).` });
    }

    return { productHealth, classifiedHealth, alerts };
  }, [kpiMetrics, ratingDistribution, timelineData]);


  // Page Type Analysis
  const pageTypeData = useMemo(() => {
    const groups: Record<string, number[]> = {};
    finalFilteredData.forEach(f => {
      const type = f['Page Type'] || 'unknown';
      if (!groups[type]) groups[type] = [];
      groups[type].push(f._rating);
    });
    return Object.entries(groups).map(([type, ratings]) => ({
      type,
      avg: ratings.reduce((a, b) => a + b, 0) / ratings.length,
      count: ratings.length
    })).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [finalFilteredData]);

  // Issue Stats
  const issueStats = useMemo(() => {
    const stats: Record<string, { count: number; sumRating: number }> = {};
    finalFilteredData.forEach(f => {
      f._categories.forEach(cat => {
        if (!stats[cat]) stats[cat] = { count: 0, sumRating: 0 };
        stats[cat].count++;
        stats[cat].sumRating += f._rating;
      });
    });
    return Object.entries(stats).map(([id, s]) => ({
      id,
      count: s.count,
      avgRating: s.sumRating / s.count,
      trend: Math.floor(Math.random() * 20) - 10, // Mock trend
      percent: finalFilteredData.length > 0 ? (s.count / finalFilteredData.length) * 100 : 0
    })).sort((a, b) => b.count - a.count);
  }, [finalFilteredData]);

  // Drill-down stats for active issue
  const activeIssueStats = useMemo(() => {
    if (!activeIssue) return null;
    const filtered = finalFilteredData.filter(f => f._categories.includes(activeIssue));
    
    // Determine the time range for the chart based on global selection
    let chartStart: Date;
    let chartEnd: Date = new Date();
    
    if (dateRange === '1w') {
      chartStart = subDays(chartEnd, 7);
    } else if (dateRange === '1m') {
      chartStart = subDays(chartEnd, 30);
    } else if (dateRange === '3m') {
      chartStart = subDays(chartEnd, 90);
    } else if (dateRange === 'custom' && customDates.start && customDates.end) {
      chartStart = startOfDay(new Date(customDates.start));
      chartEnd = endOfDay(new Date(customDates.end));
    } else {
      // 'all': use the range of the filtered data or fallback to 30 days
      if (filtered.length > 0) {
        const sortedDates = [...filtered].map(d => d._date).sort((a, b) => a.getTime() - b.getTime());
        chartStart = sortedDates[0];
        chartEnd = sortedDates[sortedDates.length - 1];
      } else {
        chartStart = subDays(chartEnd, 30);
      }
    }

    // Generate all days in the interval to ensure a continuous X-axis
    const days = eachDayOfInterval({ start: startOfDay(chartStart), end: endOfDay(chartEnd) });
    
    const pageTypes: Record<string, number> = {};
    const devices: Record<string, number> = {};
    const os: Record<string, number> = {};
    const latencies: Record<string, number> = {};
    const ratings: Record<string, number> = {};
    const sentiments: Record<string, number> = {};
    const timeSeries: Record<string, number> = {};

    filtered.forEach(f => {
      const pt = f['Page Type'] || 'unknown';
      const dt = f._deviceInfo.deviceType || 'unknown';
      const osName = f._deviceInfo.os || 'unknown';
      const lb = f._latencyBucket || 'unknown';
      const r = `${f._rating}★`;
      const s = f._rating >= 4 ? 'Tích cực' : f._rating <= 2 ? 'Tiêu cực' : 'Trung lập';
      const dateKey = format(f._date, 'yyyy-MM-dd');

      pageTypes[pt] = (pageTypes[pt] || 0) + 1;
      devices[dt] = (devices[dt] || 0) + 1;
      os[osName] = (os[osName] || 0) + 1;
      latencies[lb] = (latencies[lb] || 0) + 1;
      ratings[r] = (ratings[r] || 0) + 1;
      sentiments[s] = (sentiments[s] || 0) + 1;
      timeSeries[dateKey] = (timeSeries[dateKey] || 0) + 1;
    });

    const sort = (obj: Record<string, number>) => 
      Object.entries(obj)
        .map(([name, count]) => ({ name, count, percent: (count / (filtered.length || 1)) * 100 }))
        .sort((a, b) => b.count - a.count);

    const timeSeriesData = days.map((day, index) => {
      const key = format(day, 'yyyy-MM-dd');
      const count = timeSeries[key] || 0;
      
      // Calculate dynamic trend (7-day moving average)
      const windowSize = 7;
      const startIdx = Math.max(0, index - windowSize + 1);
      let sum = 0;
      let countInWindow = 0;
      for (let i = startIdx; i <= index; i++) {
        const dKey = format(days[i], 'yyyy-MM-dd');
        sum += timeSeries[dKey] || 0;
        countInWindow++;
      }
      const trend = sum / countInWindow;

      return {
        date: format(day, 'dd/MM'),
        count,
        trend: Number(trend.toFixed(2))
      };
    });

    return {
      pageTypes: sort(pageTypes),
      devices: sort(devices),
      os: sort(os),
      latencies: sort(latencies),
      ratings: sort(ratings),
      sentiments: sort(sentiments),
      timeSeries: timeSeriesData
    };
  }, [finalFilteredData, activeIssue, dateRange, customDates]);

  // Heatmap Data (Removed from UI but keeping logic for now if needed elsewhere)
  const heatmapData = useMemo(() => {
    const matrix: Record<string, Record<string, number>> = {};
    const weeksSet = new Set<string>();
    
    dateFilteredData.forEach(f => {
      weeksSet.add(f._week);
      f._categories.forEach(cat => {
        if (!matrix[cat]) matrix[cat] = {};
        if (!matrix[cat][f._week]) matrix[cat][f._week] = 0;
        matrix[cat][f._week]++;
      });
    });
    
    const sortedWeeks = Array.from(weeksSet).sort();
    return { matrix, weeks: sortedWeeks };
  }, [dateFilteredData]);

  // Device & Platform
  const deviceMetrics = useMemo(() => {
    const deviceCounts: Record<string, number> = {};
    const osCounts: Record<string, number> = {};
    const ratingByDevice: Record<string, { sum: number; count: number }> = {};
    
    finalFilteredData.forEach(f => {
      const dt = f._deviceInfo.deviceType;
      const os = f._deviceInfo.os;
      deviceCounts[dt] = (deviceCounts[dt] || 0) + 1;
      osCounts[os] = (osCounts[os] || 0) + 1;
      
      if (!ratingByDevice[dt]) ratingByDevice[dt] = { sum: 0, count: 0 };
      ratingByDevice[dt].sum += f._rating;
      ratingByDevice[dt].count++;
    });

    return {
      deviceTypeData: Object.entries(deviceCounts).map(([name, value]) => ({ name, value })),
      osData: Object.entries(osCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5),
      ratingByDevice: Object.entries(ratingByDevice).map(([name, s]) => ({ name, avg: s.sum / s.count, count: s.count })),
      topIssuesByDevice: {
        'Mobile': ['Audio', 'Video Load', 'Autoplay'],
        'Desktop': ['Dark Mode', 'Navigation', 'Frame Size'],
        'Tablet': ['Podcast UX', 'Subtitle', 'Search']
      }
    };
  }, [finalFilteredData]);

  // Network Performance
  const networkMetrics = useMemo(() => {
    const groups: Record<string, { sum: number; count: number }> = {};
    const COLORS: Record<string, string> = {
      fast: '#00C9A7',
      normal: '#4ECDC4',
      slow: '#FFE66D',
      very_slow: '#FF8C42',
      critical: '#FF3B5B',
      unknown: '#94A3B8'
    };

    finalFilteredData.forEach(f => {
      const bucket = f._latencyBucket;
      if (!groups[bucket]) groups[bucket] = { sum: 0, count: 0 };
      groups[bucket].sum += f._rating;
      groups[bucket].count++;
    });

    const latencyData = Object.entries(groups).map(([bucket, s]) => ({
      bucket,
      avg: s.sum / s.count,
      count: s.count,
      color: COLORS[bucket]
    }));

    const scatterData = finalFilteredData.slice(0, 200).map(f => ({
      latency: parseInt(f['Latency (ms)']) || 0,
      rating: f._rating,
      type: f['Page Type']
    })).filter(d => d.latency > 0);

    const totalLatency = scatterData.reduce((acc, d) => acc + d.latency, 0);
    const avgLatency = scatterData.length > 0 ? totalLatency / scatterData.length : 0;

    return { latencyData, scatterData, correlation: -0.42, avgLatency };
  }, [finalFilteredData]);

  // Top Issue Highlight Details
  const topIssueDetails = useMemo(() => {
    if (issueStats.length === 0 || !kpiMetrics) return null;
    
    // Find the issue with highest count that isn't 'unclassified' or 'positive'
    const top = issueStats.find(s => s.id !== 'unclassified' && s.id !== 'positive');
    if (!top) return null;

    const filtered = finalFilteredData.filter(f => f._categories.includes(top.id));
    if (filtered.length === 0) return null;

    // Find top device
    const devices: Record<string, number> = {};
    filtered.forEach(f => {
      const d = f._deviceInfo.deviceType;
      devices[d] = (devices[d] || 0) + 1;
    });
    const topDevice = Object.entries(devices).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // Find top page (exclude unknown)
    const pages: Record<string, number> = {};
    filtered.forEach(f => {
      const p = f['Page Type'];
      if (p && p.toLowerCase() !== 'unknown' && p.toLowerCase() !== 'n/a') {
        pages[p] = (pages[p] || 0) + 1;
      }
    });
    const topPageEntry = Object.entries(pages).sort((a, b) => b[1] - a[1])[0];
    const topPage = topPageEntry?.[0] || 'N/A';
    const topPagePercent = topPageEntry ? (topPageEntry[1] / filtered.length) * 100 : 0;

    // Sample feedback (one with lowest rating)
    const sample = filtered.sort((a, b) => a._rating - b._rating)[0]?.Feedback || 'N/A';

    return {
      ...top,
      category: currentCategories[top.id],
      topDevice,
      topPage,
      topPagePercent,
      sampleFeedback: sample
    };
  }, [issueStats, dateFilteredData, currentCategories, kpiMetrics]);


  // Date range display string
  const dateRangeDisplay = useMemo(() => {
    if (dateFilteredData.length === 0) return '';
    const dates = dateFilteredData.map(f => f._date).sort((a, b) => a.getTime() - b.getTime());
    const start = dates[0];
    const end = dates[dates.length - 1];
    return `Số liệu từ ${format(start, 'd/M')} - ${format(end, 'd/M')}`;
  }, [dateFilteredData]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="w-12 h-12 text-accent animate-spin" />
        <div className="text-xl font-bold text-text">Đang phân tích phản hồi VnE-GO...</div>
        <div className="text-sm text-text-muted">Đang xử lý 800+ bản ghi và phân loại vấn đề</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <AlertCircle className="w-16 h-16 text-red-500" />
        <div className="text-2xl font-bold text-text">Phân tích Thất bại</div>
        <p className="text-text-muted max-w-md">{error}</p>
        <button 
          onClick={fetchData}
          className="mt-4 px-6 py-2 bg-accent text-white rounded-lg font-bold hover:bg-accent/80 transition-colors flex items-center gap-2"
        >
          <RefreshCcw size={18} />
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:h-screen bg-background flex flex-col lg:overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-accent rounded-lg flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-lg shadow-accent/20">V</div>
          <div className="flex flex-col">
            <h1 className="text-sm sm:text-lg font-bold leading-none truncate max-w-[120px] xs:max-w-none">
              <span className="hidden xs:inline">VnE-GO Feedback Intelligence</span>
              <span className="xs:hidden">VnE-GO Feedback</span>
            </h1>
            <div className="flex items-center gap-2 mt-0.5 sm:mt-1">
              <p className="text-[8px] sm:text-[10px] text-text-muted font-mono uppercase tracking-widest hidden md:block">Báo cáo Phân tích Sản phẩm</p>
              {dateRangeDisplay && (
                <p className="text-[9px] sm:text-[10px] text-accent font-bold uppercase tracking-wider bg-accent/10 px-1.5 py-0.5 rounded hidden lg:block">
                  {dateRangeDisplay}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Date Range Selector - Desktop */}
          <div className="hidden lg:flex items-center gap-1 bg-card border border-border p-1 rounded-lg">
            {(['1w', '1m', '3m', 'all'] as const).map(range => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={cn(
                  "px-3 py-1 rounded-md text-[10px] font-bold transition-all",
                  dateRange === range ? "bg-accent text-white" : "text-text-muted hover:text-text"
                )}
              >
                {range === '1w' ? '1 TUẦN' : range === '1m' ? '1 THÁNG' : range === '3m' ? '3 THÁNG' : 'TẤT CẢ'}
              </button>
            ))}
            <button
              onClick={() => setDateRange('custom')}
              className={cn(
                "px-3 py-1 rounded-md text-[10px] font-bold transition-all",
                dateRange === 'custom' ? "bg-accent text-white" : "text-text-muted hover:text-text"
              )}
            >
              TÙY CHỈNH
            </button>
          </div>

          {dateRange === 'custom' && (
            <div className="hidden lg:flex items-center gap-2 bg-card border border-border px-3 py-1 rounded-lg hover:border-accent/50 transition-colors cursor-pointer relative group">
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="relative flex items-center">
                  <input 
                    type="date" 
                    className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full"
                    value={customDates.start}
                    onChange={(e) => setCustomDates(prev => ({ ...prev, start: e.target.value }))}
                  />
                  <span className="text-[9px] sm:text-[10px] text-text font-mono">{customDates.start || 'Bắt đầu'}</span>
                  <Calendar size={10} className="ml-1 sm:ml-2 text-white opacity-80 group-hover:opacity-100 transition-opacity" />
                </div>
                <span className="text-text-muted text-[10px]">-</span>
                <div className="relative flex items-center">
                  <input 
                    type="date" 
                    className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full"
                    value={customDates.end}
                    onChange={(e) => setCustomDates(prev => ({ ...prev, end: e.target.value }))}
                  />
                  <span className="text-[9px] sm:text-[10px] text-text font-mono">{customDates.end || 'Kết thúc'}</span>
                  <Calendar size={10} className="ml-1 sm:ml-2 text-white opacity-80 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>
          )}

          <div className="hidden sm:flex flex-col items-end text-[9px] text-text-muted font-mono">
            <div className="uppercase tracking-tighter">Cập nhật</div>
            <div className="font-bold text-text">{format(lastUpdated, 'HH:mm:ss')}</div>
          </div>

          <button 
            onClick={fetchData}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-text-muted hover:text-text"
            title="Làm mới dữ liệu"
          >
            <RefreshCcw size={18} className={cn(loading && "animate-spin")} />
          </button>

          <div className="h-6 w-px bg-border mx-1 hidden xs:block"></div>

          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="text-right hidden md:block">
                <div className="text-[10px] font-bold text-text truncate max-w-[100px]">{user.displayName}</div>
                <button onClick={handleLogout} className="text-[9px] text-accent hover:underline">Đăng xuất</button>
              </div>
              {user.photoURL ? (
                <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full border border-border shadow-sm" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white font-bold text-xs shadow-sm">
                  {user.displayName?.charAt(0) || 'U'}
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="flex items-center gap-2 px-3 py-1.5 bg-accent text-white rounded-lg text-[10px] font-bold hover:bg-accent/90 transition-all shadow-lg shadow-accent/20"
            >
              <User size={12} />
              <span className="hidden xs:inline">Đăng nhập</span>
            </button>
          )}
        </div>
      </header>

      {/* Secondary Mobile Header for Filters */}
      <div className="lg:hidden sticky top-[57px] sm:top-[73px] z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative">
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="appearance-none bg-card border border-border px-3 py-1.5 pr-8 rounded-lg text-[10px] font-bold focus:outline-none focus:border-accent/50 transition-all min-w-[100px]"
            >
              <option value="1w">1 TUẦN</option>
              <option value="1m">1 THÁNG</option>
              <option value="3m">3 THÁNG</option>
              <option value="all">TẤT CẢ</option>
              <option value="custom">TÙY CHỈNH</option>
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          </div>

          {dateRange === 'custom' && (
            <div className="flex items-center gap-1 bg-card border border-border px-2 py-1 rounded-lg">
              <div className="relative flex items-center">
                <input 
                  type="date" 
                  className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full"
                  value={customDates.start}
                  onChange={(e) => setCustomDates(prev => ({ ...prev, start: e.target.value }))}
                />
                <span className="text-[9px] text-text font-mono">{customDates.start || 'Từ'}</span>
              </div>
              <span className="text-text-muted text-[9px]">-</span>
              <div className="relative flex items-center">
                <input 
                  type="date" 
                  className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full"
                  value={customDates.end}
                  onChange={(e) => setCustomDates(prev => ({ ...prev, end: e.target.value }))}
                />
                <span className="text-[9px] text-text font-mono">{customDates.end || 'Đến'}</span>
              </div>
            </div>
          )}
        </div>

        {dateRangeDisplay && (
          <div className="text-[9px] text-accent font-bold uppercase tracking-wider bg-accent/10 px-2 py-1 rounded">
            {dateRangeDisplay}
          </div>
        )}
      </div>

      <main className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden">
        {/* Dashboard Content */}
        <div className="flex-1 lg:overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-6">
            {kpiMetrics && (
              <KPIStrip 
                {...kpiMetrics} 
                pageTypeData={pageTypeData} 
                deviceMetrics={deviceMetrics} 
                onViewToday={() => {
                  // Clear all filters
                  setActiveIssue(null);
                  setRatingFilter(null);
                  setFeedbackSearch('');
                  setFeedbackDeviceFilter(null);
                  setFeedbackSortOrder('newest');
                  
                  // Highlight today's feedbacks
                  if (kpiMetrics.latestTodayId) {
                    setHighlightedFeedbackId('today');
                    // Clear highlight after a delay
                    setTimeout(() => setHighlightedFeedbackId(null), 5000);
                  }
                  
                  // Scroll to feedback
                  scrollToFeedback();
                }}
              />
            )}

            {/* Product Health & Warnings (Temporarily Hidden) */}
            {/* 
            {kpiMetrics && healthStatus && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                ...
              </div>
            )} 
            */}
            
            <div className="grid grid-cols-1 gap-6">
              {topIssueDetails && (
                <TopIssueHighlight 
                  issueId={topIssueDetails.id}
                  category={topIssueDetails.category}
                  count={topIssueDetails.count}
                  percent={topIssueDetails.percent}
                  trend={topIssueDetails.trend}
                  topDevice={topIssueDetails.topDevice}
                  topPage={topIssueDetails.topPage}
                  topPagePercent={topIssueDetails.topPagePercent}
                  sampleFeedback={topIssueDetails.sampleFeedback}
                  avgRating={topIssueDetails.avgRating}
                  onViewDetails={() => setActiveIssue(topIssueDetails.id)}
                  onScrollToIssues={scrollToIssues}
                />
              )}

              <RatingAnalysis 
                distribution={ratingDistribution} 
                pageTypeData={pageTypeData} 
                onRatingClick={(r) => setRatingFilter(r === ratingFilter ? null : r)}
                activeRating={ratingFilter}
              />
              
              <TimelineTrendPanel 
                {...timelineData} 
                globalMedian={globalMedian}
                granularity={granularity}
                onGranularityChange={setGranularity}
                activeRating={ratingFilter}
                onRatingFilter={(r) => {
                  setRatingFilter(r === ratingFilter ? null : r);
                }}
              />

              <div ref={issuesRef} className="scroll-mt-24">
                <IssueCategoryPanel 
                  issueStats={issueStats} 
                  activeIssue={activeIssue} 
                  onIssueClick={setActiveIssue} 
                  categories={currentCategories}
                  onAddCategory={handleAddCategory}
                  drillDownStats={activeIssueStats}
                  isUpdating={isUpdating}
                />
              </div>
              <DevicePlatformPanel {...deviceMetrics} />
              <NetworkPerformancePanel {...networkMetrics} />
            </div>
          </div>
        </div>

        {/* Sidebar Feedback Viewer */}
        <aside ref={feedbackRef} className="w-full lg:w-[400px] xl:w-[450px] border-t lg:border-t-0 lg:border-l border-border bg-card/30 flex flex-col h-auto lg:h-full lg:p-6">
          <ActionableFeedbackViewer 
            feedbacks={finalFilteredData} 
            onFilterChange={() => {}} 
            categories={currentCategories}
            issueFilter={activeIssue}
            onIssueFilterChange={setActiveIssue}
            ratingFilter={ratingFilter}
            onRatingFilterChange={setRatingFilter}
            search={feedbackSearch}
            onSearchChange={setFeedbackSearch}
            deviceFilter={feedbackDeviceFilter}
            onDeviceFilterChange={setFeedbackDeviceFilter}
            sortOrder={feedbackSortOrder}
            onSortChange={setFeedbackSortOrder}
            highlightId={highlightedFeedbackId || undefined}
            onUpdateTags={handleUpdateFeedbackTags}
            onAddCategory={handleAddCategory}
            onScrollToTop={(fn) => { scrollToFeedbackTop.current = fn; }}
          />
        </aside>
      </main>

      {/* Footer / Status Bar */}
      <footer className="bg-card border-t border-border px-6 py-2 flex items-center justify-between text-[10px] font-mono text-text-muted">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></div>
            DỮ LIỆU TRỰC TUYẾN
          </div>
          <div>TỔNG BẢN GHI: {data.length}</div>
          {isAiAnalyzed && (
            <div className="flex items-center gap-1 text-secondary">
              <Sparkles size={10} />
              PHÂN LOẠI NÂNG CAO BỞI AI
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div>VNExpress Product Team</div>
          <div className="flex items-center gap-1">
            <LayoutDashboard size={10} />
            v1.2.0
          </div>
        </div>
      </footer>
    </div>
  );
}
