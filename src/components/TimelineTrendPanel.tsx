import React, { useMemo } from 'react';
import { 
  ComposedChart, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine,
  Legend,
  Area,
  Scatter,
  Brush,
  BarChart,
  Cell
} from 'recharts';
import { AlertCircle, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { cn } from '../lib/utils';

interface TimelineTrendPanelProps {
  data: { 
    date: string; 
    fullLabel?: string;
    count: number; 
    avg: number; 
    trendAvg: number; 
    r1: number;
    r2: number;
    r3: number;
    r4: number;
    r5: number;
  }[];
  comparison: {
    periodA: { avg: number; volume: number; topIssue: string };
    periodB: { avg: number; volume: number; topIssue: string };
  };
  globalMedian: number;
  granularity?: 'day' | 'week' | 'month';
  onGranularityChange?: (granularity: 'day' | 'week' | 'month') => void;
  onRatingFilter?: (rating: number | null) => void;
  activeRating?: number | null;
}

export const TimelineTrendPanel: React.FC<TimelineTrendPanelProps> = ({ 
  data, 
  comparison,
  globalMedian,
  granularity = 'day',
  onGranularityChange,
  onRatingFilter,
  activeRating
}) => {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const ratingDiff = ((comparison.periodB.avg - comparison.periodA.avg) / comparison.periodA.avg) * 100;

  const shouldShowLabel = useMemo(() => {
    if (granularity === 'month') return true;
    if (granularity === 'week') return data.length <= 25;
    if (granularity === 'day') return data.length <= 14;
    return false;
  }, [granularity, data.length]);

  const renderRatingLabel = (props: any) => {
    const { x, y, value, index } = props;
    if (!shouldShowLabel) return null;
    if (x == null || y == null || isNaN(x) || isNaN(y) || value == null || isNaN(value)) {
      return null;
    }
    const numVal = Number(value);
    if (numVal <= 0) return null;

    const displayRating = isMobile ? numVal.toFixed(1) : numVal.toFixed(2);
    const pillWidth = isMobile ? 32 : 40;
    const pillHeight = isMobile ? 16 : 18;
    const halfW = pillWidth / 2;
    const halfH = pillHeight / 2;
    const labelY = y < 28 ? y + 16 : y - 14;

    return (
      <g key={`rating-label-${index}`} className="pointer-events-none select-none">
        <rect
          x={x - halfW}
          y={labelY - halfH}
          width={pillWidth}
          height={pillHeight}
          rx={pillHeight / 2}
          fill="#13151F"
          stroke="#FF6B35"
          strokeWidth={1.2}
          style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.6))' }}
        />
        <text
          x={x - (isMobile ? 1 : 1.5)}
          y={labelY + 0.5}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={isMobile ? 8.5 : 9.5}
          fontWeight="700"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
        >
          <tspan fill="#FFFFFF">{displayRating}</tspan>
          <tspan fill="#FFB800" fontSize={isMobile ? 7.5 : 8.5} dx={1}>★</tspan>
        </text>
      </g>
    );
  };

  const handleLegendClick = (o: any) => {
    const { dataKey } = o;
    if (dataKey.startsWith('r')) {
      const rating = parseInt(dataKey.substring(1));
      // If clicking the same rating, clear it
      onRatingFilter?.(activeRating === rating ? null : rating);
    }
  };

  const granularities = [
    { id: 'day', label: 'THEO NGÀY' },
    { id: 'week', label: 'THEO TUẦN' },
    { id: 'month', label: 'THEO THÁNG' },
  ] as const;

  return (
    <div className="space-y-6 mb-6">
      <div className="bg-card border border-border p-6 rounded-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold">Phân tích Xu hướng theo Thời gian</h3>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1 bg-background/50 p-1 rounded-lg border border-border">
              <span className="text-[8px] font-bold text-text-muted px-2 uppercase">Độ chia:</span>
              {granularities.map((g) => (
                <button
                  key={g.id}
                  onClick={() => onGranularityChange?.(g.id)}
                  className={cn(
                    "px-3 py-1 rounded text-[10px] font-bold transition-all",
                    granularity === g.id 
                      ? "bg-secondary text-white shadow-lg shadow-secondary/20" 
                      : "text-text-muted hover:text-text hover:bg-white/5"
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="h-[300px] sm:h-[450px]">
          {data && data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 25, right: 15, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" vertical={false} />
              <XAxis 
                dataKey="key" 
                tickFormatter={(val) => {
                  const item = data.find(d => (d as any).key === val);
                  return item ? item.date : val;
                }}
                tick={{ fill: '#94A3B8', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={granularity === 'day' ? 'preserveStartEnd' : 0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                yAxisId="left"
                tick={{ fill: '#94A3B8', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                name="Volume"
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                domain={[0, 5]}
                tick={{ fill: '#94A3B8', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                name="Rating"
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1A1D27', border: '1px solid #2A2D3A', borderRadius: '8px' }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const fullLabel = payload[0].payload.fullLabel || label;
                    return (
                      <div className="bg-[#1A1D27] border border-[#2A2D3A] p-3 rounded-lg shadow-xl min-w-[150px]">
                        <div className="text-xs font-bold mb-2 border-b border-border pb-1">{fullLabel}</div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-text-muted">
                              Rating TB {granularity === 'day' ? 'ngày' : granularity === 'week' ? 'tuần' : 'tháng'}:
                            </span>
                            <span className="text-xs font-bold text-accent">{payload.find(p => p.dataKey === 'trendAvg')?.value?.toFixed(2)} ★</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-text-muted">Tổng Feedback:</span>
                            <span className="text-xs font-bold">{payload.find(p => p.dataKey === 'r1')?.payload.count}</span>
                          </div>
                          <div className="pt-1 border-t border-border/50 mt-1">
                            <div className="grid grid-cols-5 gap-1">
                              {[1, 2, 3, 4, 5].map(r => (
                                <div key={r} className="text-center">
                                  <div className="text-[8px] text-text-muted">{r}★</div>
                                  <div className="text-[10px] font-bold">{payload.find(p => p.dataKey === `r${r}`)?.value || 0}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend 
                onClick={handleLegendClick} 
                cursor="pointer"
                formatter={(value, entry: any) => {
                  const { dataKey } = entry;
                  let isActive = false;
                  if (dataKey && dataKey.startsWith('r')) {
                    isActive = activeRating === parseInt(dataKey.substring(1));
                  } else if (dataKey === 'trendAvg') {
                    isActive = true;
                  }
                  
                  return (
                    <span className={cn(
                      "text-[10px] font-bold cursor-pointer transition-all px-2 py-1 rounded",
                      isActive ? "bg-accent/20 text-accent scale-110" : "text-text-muted hover:text-text"
                    )}>
                      {value}
                    </span>
                  );
                }}
              />
              <Bar 
                yAxisId="left" 
                dataKey="r1" 
                name="1★" 
                stackId="a"
                fill="#FF3B5B" 
                barSize={20}
                fillOpacity={activeRating === null || activeRating === 1 ? 1 : 0.1}
              />
              <Bar 
                yAxisId="left" 
                dataKey="r2" 
                name="2★" 
                stackId="a"
                fill="#FF8C42" 
                barSize={20}
                fillOpacity={activeRating === null || activeRating === 2 ? 1 : 0.1}
              />
              <Bar 
                yAxisId="left" 
                dataKey="r3" 
                name="3★" 
                stackId="a"
                fill="#FFE66D" 
                barSize={20}
                fillOpacity={activeRating === null || activeRating === 3 ? 1 : 0.1}
              />
              <Bar 
                yAxisId="left" 
                dataKey="r4" 
                name="4★" 
                stackId="a"
                fill="#4ECDC4" 
                barSize={20}
                fillOpacity={activeRating === null || activeRating === 4 ? 1 : 0.1}
              />
              <Bar 
                yAxisId="left" 
                dataKey="r5" 
                name="5★" 
                stackId="a"
                fill="#00C9A7" 
                radius={[4, 4, 0, 0]} 
                barSize={20}
                fillOpacity={activeRating === null || activeRating === 5 ? 1 : 0.1}
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="avg"
                fill="url(#colorAvg)"
                stroke="transparent"
                name="Rating TB hàng ngày"
                legendType="none"
              />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="trendAvg" 
                name={`Rating TB ${granularity === 'day' ? 'hàng ngày' : granularity === 'week' ? 'hàng tuần' : 'hàng tháng'}`} 
                stroke="#FF6B35" 
                strokeWidth={3} 
                dot={{ r: 3, fill: '#FF6B35', stroke: '#13151F', strokeWidth: 1.5 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                label={renderRatingLabel}
              />
              <ReferenceLine 
                yAxisId="right" 
                y={Number(globalMedian) || 0} 
                stroke="#94A3B8" 
                strokeDasharray="5 5" 
                label={{ value: `Trung vị toàn thời gian: ${(Number(globalMedian) || 0).toFixed(2)}`, position: 'insideBottomRight', fill: '#94A3B8', fontSize: 10 }} 
              />
              <defs>
                <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#FF6B35" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Brush 
                dataKey="key" 
                height={30} 
                stroke="#FF6B35" 
                fill="#1A1D27"
                travellerWidth={10}
                gap={5}
                startIndex={data.length > 20 ? data.length - 20 : 0}
                tickFormatter={(val) => {
                  const item = data.find(d => (d as any).key === val);
                  return item ? item.date : val;
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
          ) : (
            <div className="h-full w-full flex items-center justify-center text-text-muted italic">
              Đang tải dữ liệu xu hướng...
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Comparison Section */}
        <div className="bg-card border border-border p-5 rounded-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-1">
              <div className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                So sánh Hiệu năng Giai đoạn
                <div className="group relative">
                  <Info size={12} className="text-text-muted cursor-help" />
                  <div className="absolute bottom-full left-0 mb-2 w-72 p-3 bg-background border border-border rounded-xl shadow-2xl text-[10px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none leading-relaxed">
                    <p className="font-bold text-text mb-1">Ý nghĩa:</p>
                    Hệ thống tự động chia khung thời gian bạn chọn thành 2 nửa (GĐ A và GĐ B). 
                    Việc so sánh này giúp bạn thấy tốc độ cải thiện hoặc sụt giảm chất lượng ngay trong chu kỳ đang xem, thay vì chỉ nhìn con số tổng quát.
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-text-muted italic">Phân tích sự biến động giữa nửa đầu và nửa sau của khung thời gian.</p>
            </div>
            <div className={cn(
              "px-2 py-1 rounded text-[10px] font-bold",
              ratingDiff > 0 ? "bg-secondary/10 text-secondary" : "bg-red-500/10 text-red-500"
            )}>
              {ratingDiff > 0 ? 'Cải thiện' : 'Sụt giảm'} {Math.abs(ratingDiff).toFixed(1)}%
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-[10px] text-text-muted uppercase font-bold border-b border-border pb-2">
                <span>Chỉ số chính</span>
                <div className="flex gap-4">
                  <span className="w-20 text-right">GĐ A (Trước)</span>
                  <span className="w-20 text-right">GĐ B (Sau)</span>
                </div>
              </div>
              <div className="flex items-center justify-between group">
                <span className="text-xs text-text flex items-center gap-2">
                  Rating Trung bình
                  <div className="w-1 h-1 rounded-full bg-border"></div>
                </span>
                <div className="flex gap-4 font-mono">
                  <span className="w-20 text-right text-text-muted">{comparison.periodA.avg.toFixed(2)}</span>
                  <span className={cn(
                    "w-20 text-right font-bold",
                    comparison.periodB.avg > comparison.periodA.avg ? "text-secondary" : "text-red-500"
                  )}>
                    {comparison.periodB.avg.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text">Tổng lượng Feedback</span>
                <div className="flex gap-4 font-mono">
                  <span className="w-20 text-right text-text-muted">{comparison.periodA.volume}</span>
                  <span className="w-20 text-right text-text font-bold">{comparison.periodB.volume}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text">Vấn đề hàng đầu</span>
                <div className="flex gap-4 flex-1 justify-end ml-4">
                  <span className="text-[10px] text-text-muted text-right">{comparison.periodA.topIssue}</span>
                  <span className="text-[10px] text-red-500 font-bold text-right">{comparison.periodB.topIssue}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-[10px] text-text-muted uppercase font-bold border-b border-border pb-2">Trực quan hóa mức độ thay đổi</div>
              <div className="h-24 flex items-end gap-2">
                <div className="flex-1 flex flex-col items-center gap-2">
                  <div 
                    className="w-full bg-white/5 border border-border rounded-t-lg transition-all" 
                    style={{ height: `${(comparison.periodA.avg / 5) * 100}%` }}
                  ></div>
                  <span className="text-[10px] text-text-muted">Giai đoạn A</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-2">
                  <div 
                    className={cn(
                      "w-full border rounded-t-lg transition-all relative group",
                      comparison.periodB.avg > comparison.periodA.avg ? "bg-secondary/20 border-secondary" : "bg-red-500/20 border-red-500"
                    )}
                    style={{ height: `${(comparison.periodB.avg / 5) * 100}%` }}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold whitespace-nowrap">
                      {ratingDiff > 0 ? '+' : ''}{ratingDiff.toFixed(1)}%
                    </div>
                  </div>
                  <span className="text-[10px] text-text font-bold">Giai đoạn B</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
