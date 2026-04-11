import React from 'react';
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
  Area
} from 'recharts';
import { AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface TimelineTrendPanelProps {
  data: { 
    date: string; 
    count: number; 
    avg: number; 
    rollingAvg: number; 
    r1: number;
    r2: number;
    r3: number;
    r4: number;
    r5: number;
    isAnomaly: boolean 
  }[];
  comparison: {
    periodA: { avg: number; volume: number; topIssue: string };
    periodB: { avg: number; volume: number; topIssue: string };
  };
  currentRange?: string;
  onRangeChange?: (range: string) => void;
}

export const TimelineTrendPanel: React.FC<TimelineTrendPanelProps> = ({ 
  data, 
  comparison,
  currentRange = 'all',
  onRangeChange
}) => {
  const ratingDiff = ((comparison.periodB.avg - comparison.periodA.avg) / comparison.periodA.avg) * 100;

  const ranges = [
    { id: '1w', label: '1 TUẦN' },
    { id: '1m', label: '1 THÁNG' },
    { id: '3m', label: '3 THÁNG' },
    { id: 'all', label: 'TẤT CẢ' },
    { id: 'custom', label: 'TÙY CHỈNH' },
  ];

  return (
    <div className="space-y-6 mb-6">
      <div className="bg-card border border-border p-6 rounded-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-bold">Phân tích Xu hướng theo Thời gian</h3>
          
          <div className="flex items-center gap-1 bg-background/50 p-1 rounded-lg border border-border">
            {ranges.map((r) => (
              <button
                key={r.id}
                onClick={() => onRangeChange?.(r.id)}
                className={cn(
                  "px-3 py-1 rounded text-[10px] font-bold transition-all",
                  currentRange === r.id 
                    ? "bg-accent text-white shadow-lg shadow-accent/20" 
                    : "text-text-muted hover:text-text hover:bg-white/5"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" vertical={false} />
              <XAxis 
                dataKey="date" 
                tick={{ fill: '#94A3B8', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
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
              />
              <Legend />
              <Bar 
                yAxisId="left" 
                dataKey="r1" 
                name="1★" 
                stackId="a"
                fill="#FF3B5B" 
                barSize={20}
              />
              <Bar 
                yAxisId="left" 
                dataKey="r2" 
                name="2★" 
                stackId="a"
                fill="#FF8C42" 
                barSize={20}
              />
              <Bar 
                yAxisId="left" 
                dataKey="r3" 
                name="3★" 
                stackId="a"
                fill="#FFE66D" 
                barSize={20}
              />
              <Bar 
                yAxisId="left" 
                dataKey="r4" 
                name="4★" 
                stackId="a"
                fill="#4ECDC4" 
                barSize={20}
              />
              <Bar 
                yAxisId="left" 
                dataKey="r5" 
                name="5★" 
                stackId="a"
                fill="#00C9A7" 
                radius={[4, 4, 0, 0]} 
                barSize={20}
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="avg"
                fill="url(#colorAvg)"
                stroke="transparent"
              />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="rollingAvg" 
                name="Rating TB 7 ngày" 
                stroke="#FF6B35" 
                strokeWidth={3} 
                dot={false}
              />
              <defs>
                <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#FF6B35" stopOpacity={0}/>
                </linearGradient>
              </defs>
              {data.filter(d => d.isAnomaly).map((d, i) => (
                <ReferenceLine 
                  key={i} 
                  x={d.date} 
                  stroke="#FF3B5B" 
                  strokeDasharray="3 3" 
                  label={{ value: '⚠️', position: 'top', fill: '#FF3B5B' }} 
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-border p-5 rounded-xl">
          <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">So sánh Giai đoạn</div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="text-[10px] text-text-muted">Giai đoạn Trước</div>
              <div className="text-2xl font-bold font-mono">{comparison.periodA.avg.toFixed(2)} ★</div>
              <div className="text-xs text-text-muted">{comparison.periodA.volume} phản hồi</div>
              <div className="text-[10px] bg-white/5 px-2 py-1 rounded inline-block">{comparison.periodA.topIssue}</div>
            </div>
            <div className="flex flex-col items-center">
              <div className={cn(
                "flex items-center gap-1 font-bold text-sm",
                ratingDiff > 0 ? "text-secondary" : "text-red-500"
              )}>
                {ratingDiff > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                {Math.abs(ratingDiff).toFixed(1)}%
              </div>
              <div className="h-px w-12 bg-border my-2"></div>
            </div>
            <div className="flex-1 space-y-3 text-right">
              <div className="text-[10px] text-text-muted">Giai đoạn Hiện tại</div>
              <div className="text-2xl font-bold font-mono">{comparison.periodB.avg.toFixed(2)} ★</div>
              <div className="text-xs text-text-muted">{comparison.periodB.volume} phản hồi</div>
              <div className="text-[10px] bg-accent/10 text-accent px-2 py-1 rounded inline-block">{comparison.periodB.topIssue}</div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
            <AlertCircle size={24} />
          </div>
          <div>
            <div className="font-bold text-sm">Phát hiện Bất thường</div>
            <p className="text-xs text-text-muted mt-1">
              Chúng tôi phát hiện {data.filter(d => d.isAnomaly).length} mẫu bất thường trong khung thời gian đã chọn. 
              Các điểm tăng vọt về số lượng hoặc sụt giảm rating mạnh được đánh dấu trên dòng thời gian.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
