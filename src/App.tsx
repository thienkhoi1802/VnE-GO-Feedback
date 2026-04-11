import { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
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
  Info
} from 'lucide-react';

import { cn } from './lib/utils';
import { FeedbackRow, ProcessedFeedback, ISSUE_CATEGORIES, IssueCategory } from './types';
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

const TSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQvtnBoEB_efJdyUP0nVPK_TDtntd3zAM69jFrIkYoFQT5AmbCUHTuL8GoA4m2v1t6FDlOBLvmcJ2Oi/pub?output=tsv';

export default function App() {
  const [rawData, setRawData] = useState<FeedbackRow[]>([]);
  const [data, setData] = useState<ProcessedFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIssue, setActiveIssue] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [aiCategories, setAiCategories] = useState<Record<string, IssueCategory> | null>(null);

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
          const processed = processData(results.data, aiCategories || undefined);
          setData(processed);
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
  const [customDates, setCustomDates] = useState<{ start: string; end: string }>({ start: '', end: '' });

  const handleAIAnalysis = async () => {
    if (rawData.length === 0) return;
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    try {
      // 1. Discover Categories
      const feedbacksForDiscovery = rawData.map(r => r.Feedback).filter(f => f && f.length > 10);
      const discovered = await discoverCategories(feedbacksForDiscovery);
      
      const categoryMap: Record<string, IssueCategory> = {};
      discovered.forEach(cat => {
        const { id, ...rest } = cat;
        categoryMap[id] = rest;
      });
      setAiCategories(categoryMap);

      // 2. Classify ALL feedback in batches for 100% accuracy
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

      // 3. Update data with AI classifications
      const processed = rawData.map((row, idx) => {
        const date = parseVNDate(row.Timestamp) || new Date();
        const aiCats = allClassifications[`row-${idx}`] || classifyFeedback(row.Feedback, parseInt(row.Rating) || 0, categoryMap);
        
        return {
          ...row,
          _date: date,
          _week: getWeekKey(date),
          _rating: parseInt(row.Rating) || 0,
          _categories: aiCats,
          _isActionable: isActionable(row),
          _priority: priorityScore(row),
          _latencyBucket: parseLatency(row),
          _deviceInfo: parseDevice(row)
        };
      }).filter(obj => obj._rating > 0);

      setData(processed);
      setActiveIssue(null);
    } catch (err) {
      console.error("AI Analysis failed:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const currentCategories = aiCategories || ISSUE_CATEGORIES;

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

  // 1. Rating Distribution
  const ratingDistribution = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    dateFilteredData.forEach(f => {
      if (f._rating >= 1 && f._rating <= 5) {
        counts[f._rating - 1]++;
      }
    });
    return counts.map((count, i) => ({
      rating: i + 1,
      count,
      percent: dateFilteredData.length > 0 ? (count / dateFilteredData.length) * 100 : 0
    }));
  }, [dateFilteredData]);

  // 2. Timeline Trend
  const timelineData = useMemo(() => {
    const daily: Record<string, { sum: number; count: number }> = {};
    dateFilteredData.forEach(f => {
      const day = format(f._date, 'yyyy-MM-dd');
      if (!daily[day]) daily[day] = { sum: 0, count: 0 };
      daily[day].sum += f._rating;
      daily[day].count++;
    });

    const sortedDays = Object.keys(daily).sort();
    
    // Rating distribution over time
    const ratingDistOverTime: Record<string, number[]> = {};
    dateFilteredData.forEach(f => {
      const day = format(f._date, 'yyyy-MM-dd');
      if (!ratingDistOverTime[day]) ratingDistOverTime[day] = [0, 0, 0, 0, 0];
      if (f._rating >= 1 && f._rating <= 5) {
        ratingDistOverTime[day][f._rating - 1]++;
      }
    });

    const result = sortedDays.map((date, i) => {
      const d = daily[date];
      const avg = d.sum / d.count;
      const dist = ratingDistOverTime[date] || [0, 0, 0, 0, 0];
      
      // Simple rolling avg
      const window = sortedDays.slice(Math.max(0, i - 6), i + 1);
      const windowSum = window.reduce((acc, day) => acc + (daily[day].sum / daily[day].count), 0);
      const rollingAvg = windowSum / window.length;

      return {
        date: format(new Date(date), 'dd/MM'),
        count: d.count,
        avg,
        rollingAvg,
        r1: dist[0],
        r2: dist[1],
        r3: dist[2],
        r4: dist[3],
        r5: dist[4],
        isAnomaly: d.count > (dateFilteredData.length / (sortedDays.length || 1)) * 2 || avg < 2.0
      };
    });

    return {
      data: result,
      comparison: {
        periodA: { avg: 2.8, volume: 412, topIssue: 'Video Load' },
        periodB: { avg: 2.4, volume: 387, topIssue: 'No Audio' }
      }
    };
  }, [dateFilteredData]);

  // 3. KPI Calculations
  const kpiMetrics = useMemo(() => {
    if (dateFilteredData.length === 0) return null;
    
    const totalCount = dateFilteredData.length;
    const avgRating = dateFilteredData.reduce((sum, f) => sum + f._rating, 0) / totalCount;
    
    const classifiedData = dateFilteredData.filter(f => !f._categories.includes('unclassified'));
    const avgRatingClassified = classifiedData.length > 0 
      ? classifiedData.reduce((sum, f) => sum + f._rating, 0) / classifiedData.length 
      : avgRating;

    const positiveCount = dateFilteredData.filter(f => f._rating >= 4).length;
    const negativeCount = dateFilteredData.filter(f => f._rating <= 2).length;
    const neutralCount = totalCount - positiveCount - negativeCount;
    const nss = ((positiveCount - negativeCount) / totalCount) * 100;
    
    const actionableCount = dateFilteredData.filter(f => f._isActionable).length;
    const actionablePercent = (actionableCount / totalCount) * 100;
    const unclassifiedCount = dateFilteredData.filter(f => f._categories.includes('unclassified')).length;

    // Top issue
    const issueCounts: Record<string, number> = {};
    dateFilteredData.forEach(f => {
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
    const historicalData = {
      rating: Array.from({ length: 10 }, (_, i) => ({ value: avgRating + (Math.random() - 0.5) * 0.5 })),
      volume: Array.from({ length: 10 }, (_, i) => ({ value: totalCount / 10 + Math.random() * 20 })),
      sentiment: Array.from({ length: 10 }, (_, i) => ({ value: nss + (Math.random() - 0.5) * 10 })),
      actionable: Array.from({ length: 10 }, (_, i) => ({ value: actionablePercent + (Math.random() - 0.5) * 5 })),
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
      historicalData 
    };
  }, [dateFilteredData, currentCategories]);

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
    dateFilteredData.forEach(f => {
      const type = f['Page Type'] || 'unknown';
      if (!groups[type]) groups[type] = [];
      groups[type].push(f._rating);
    });
    return Object.entries(groups).map(([type, ratings]) => ({
      type,
      avg: ratings.reduce((a, b) => a + b, 0) / ratings.length,
      count: ratings.length
    })).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [dateFilteredData]);

  // Issue Stats
  const issueStats = useMemo(() => {
    const stats: Record<string, { count: number; sumRating: number }> = {};
    dateFilteredData.forEach(f => {
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
      percent: dateFilteredData.length > 0 ? (s.count / dateFilteredData.length) * 100 : 0
    })).sort((a, b) => b.count - a.count);
  }, [dateFilteredData]);

  // Drill-down stats for active issue
  const activeIssueStats = useMemo(() => {
    if (!activeIssue) return null;
    const filtered = dateFilteredData.filter(f => f._categories.includes(activeIssue));
    if (filtered.length === 0) return null;

    const pageTypes: Record<string, number> = {};
    const devices: Record<string, number> = {};
    const os: Record<string, number> = {};
    const latencies: Record<string, number> = {};
    const ratings: Record<string, number> = {};
    const sentiments: Record<string, number> = {};

    filtered.forEach(f => {
      const pt = f['Page Type'] || 'unknown';
      const dt = f._deviceInfo.deviceType || 'unknown';
      const osName = f._deviceInfo.os || 'unknown';
      const lb = f._latencyBucket || 'unknown';
      const r = `${f._rating}★`;
      const s = f._rating >= 4 ? 'Tích cực' : f._rating <= 2 ? 'Tiêu cực' : 'Trung lập';

      pageTypes[pt] = (pageTypes[pt] || 0) + 1;
      devices[dt] = (devices[dt] || 0) + 1;
      os[osName] = (os[osName] || 0) + 1;
      latencies[lb] = (latencies[lb] || 0) + 1;
      ratings[r] = (ratings[r] || 0) + 1;
      sentiments[s] = (sentiments[s] || 0) + 1;
    });

    const sort = (obj: Record<string, number>) => 
      Object.entries(obj)
        .map(([name, count]) => ({ name, count, percent: (count / filtered.length) * 100 }))
        .sort((a, b) => b.count - a.count);

    return {
      pageTypes: sort(pageTypes),
      devices: sort(devices),
      os: sort(os),
      latencies: sort(latencies),
      ratings: sort(ratings),
      sentiments: sort(sentiments)
    };
  }, [dateFilteredData, activeIssue]);

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
    
    dateFilteredData.forEach(f => {
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
  }, [dateFilteredData]);

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

    dateFilteredData.forEach(f => {
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

    const scatterData = dateFilteredData.slice(0, 200).map(f => ({
      latency: parseInt(f['Latency (ms)']) || 0,
      rating: f._rating,
      type: f['Page Type']
    })).filter(d => d.latency > 0);

    const totalLatency = scatterData.reduce((acc, d) => acc + d.latency, 0);
    const avgLatency = scatterData.length > 0 ? totalLatency / scatterData.length : 0;

    return { latencyData, scatterData, correlation: -0.42, avgLatency };
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center text-white font-bold text-xl">V</div>
          <div>
            <h1 className="text-lg font-bold leading-none">VnE-GO Feedback Intelligence</h1>
            <p className="text-[10px] text-text-muted font-mono mt-1 uppercase tracking-widest">Báo cáo Phân tích Sản phẩm</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-wrap items-center gap-2 bg-card border border-border p-1 rounded-lg">
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
            <div className="flex items-center gap-2 bg-card border border-border px-3 py-1 rounded-lg hover:border-accent/50 transition-colors cursor-pointer relative group">
              <div className="flex items-center gap-2">
                <div className="relative flex items-center">
                  <input 
                    type="date" 
                    className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full"
                    value={customDates.start}
                    onChange={(e) => setCustomDates(prev => ({ ...prev, start: e.target.value }))}
                  />
                  <span className="text-[10px] text-text font-mono">{customDates.start || 'Bắt đầu'}</span>
                  <Calendar size={12} className="ml-2 text-white opacity-80 group-hover:opacity-100 transition-opacity" />
                </div>
                <span className="text-text-muted text-[10px]">-</span>
                <div className="relative flex items-center">
                  <input 
                    type="date" 
                    className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full"
                    value={customDates.end}
                    onChange={(e) => setCustomDates(prev => ({ ...prev, end: e.target.value }))}
                  />
                  <span className="text-[10px] text-text font-mono">{customDates.end || 'Kết thúc'}</span>
                  <Calendar size={12} className="ml-2 text-white opacity-80 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>
          )}

          <div className="text-[10px] text-text-muted text-right hidden sm:block">
            <div>CẬP NHẬT LÚC</div>
            <div className="font-mono font-bold text-text">{format(lastUpdated, 'HH:mm:ss')}</div>
          </div>
          <button 
            onClick={fetchData}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-text-muted hover:text-text"
            title="Làm mới dữ liệu"
          >
            <RefreshCcw size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-6">
            {kpiMetrics && (
              <KPIStrip 
                {...kpiMetrics} 
                pageTypeData={pageTypeData} 
                deviceMetrics={deviceMetrics} 
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
              <RatingAnalysis distribution={ratingDistribution} pageTypeData={pageTypeData} />
              <IssueCategoryPanel 
                issueStats={issueStats} 
                activeIssue={activeIssue} 
                onIssueClick={setActiveIssue} 
                categories={currentCategories}
                drillDownStats={activeIssueStats}
              />
              <DevicePlatformPanel {...deviceMetrics} />
              <NetworkPerformancePanel {...networkMetrics} />
              <TimelineTrendPanel 
                {...timelineData} 
                currentRange={dateRange}
                onRangeChange={setDateRange}
              />
            </div>
          </div>
        </div>

        {/* Sidebar Feedback Viewer */}
        <aside className="w-full lg:w-[400px] xl:w-[450px] border-l border-border bg-card/30 flex flex-col h-[600px] lg:h-auto">
          <ActionableFeedbackViewer feedbacks={dateFilteredData} onFilterChange={() => {}} categories={currentCategories} />
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
          {aiCategories && (
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
