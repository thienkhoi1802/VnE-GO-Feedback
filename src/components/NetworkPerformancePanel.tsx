import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  ReferenceArea
} from 'recharts';
import { Zap, AlertTriangle, Activity } from 'lucide-react';
import { cn } from '../lib/utils';

interface NetworkPerformancePanelProps {
  latencyData: { bucket: string; avg: number; count: number; color: string }[];
  scatterData: { latency: number; rating: number; type: string }[];
  correlation: number;
  avgLatency?: number;
}

export const NetworkPerformancePanel: React.FC<NetworkPerformancePanelProps> = ({ 
  latencyData, 
  scatterData,
  correlation,
  avgLatency = 0
}) => {
  const isCorrelated = correlation < -0.3;
  
  const currentStatus = 
    avgLatency < 100 ? { label: 'AN TOÀN', color: '#00C9A7', bg: 'bg-green-500/10', border: 'border-green-500/20' } :
    avgLatency < 300 ? { label: 'BÌNH THƯỜNG', color: '#FFE66D', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' } :
    { label: 'CHẬM', color: '#FF3B5B', bg: 'bg-red-500/10', border: 'border-red-500/20' };

  // Gauge needle rotation
  // 0ms -> -90deg, 500ms -> 90deg
  const rotation = Math.min(Math.max((avgLatency / 500) * 180 - 90, -90), 90);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      <div className="bg-card border border-border p-6 rounded-xl lg:col-span-2">
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-bold">Độ trễ Mạng vs Rating</h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-text-muted uppercase font-bold">Trạng thái hiện tại:</span>
              <div className="px-2 py-0.5 rounded text-[10px] font-bold border" style={{ backgroundColor: `${currentStatus.color}15`, color: currentStatus.color, borderColor: `${currentStatus.color}30` }}>
                {currentStatus.label} ({avgLatency.toFixed(0)}ms)
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Level Indicator (Gauge) */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative w-48 h-24 overflow-hidden">
              {/* Gauge Background */}
              <svg viewBox="0 0 100 50" className="w-full h-full">
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#2A2D3A" strokeWidth="10" strokeLinecap="round" />
                {/* Safe Zone */}
                <path d="M 10 50 A 40 40 0 0 1 26 18" fill="none" stroke="#00C9A7" strokeWidth="10" strokeLinecap="round" strokeDasharray="0 0" />
                {/* Normal Zone */}
                <path d="M 26 18 A 40 40 0 0 1 74 18" fill="none" stroke="#FFE66D" strokeWidth="10" strokeLinecap="round" />
                {/* Slow Zone */}
                <path d="M 74 18 A 40 40 0 0 1 90 50" fill="none" stroke="#FF3B5B" strokeWidth="10" strokeLinecap="round" />
                
                {/* Needle */}
                <g transform={`rotate(${rotation}, 50, 50)`}>
                  <path d="M 50 50 L 50 15" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="50" cy="50" r="3" fill="#FFFFFF" />
                </g>
              </svg>
              <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-[8px] font-bold text-text-muted">
                <span>0ms</span>
                <span>250ms</span>
                <span>500ms+</span>
              </div>
            </div>
            <div className="mt-4 text-center">
              <div className="text-2xl font-bold font-mono" style={{ color: currentStatus.color }}>{avgLatency.toFixed(0)}ms</div>
              <div className="text-[10px] text-text-muted uppercase font-bold tracking-widest">Độ trễ trung bình</div>
            </div>
          </div>

          {/* Distribution Chart */}
          <div className="h-48">
            <div className="text-[10px] font-bold text-text-muted uppercase mb-2">Phân phối Độ trễ</div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={latencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" vertical={false} />
                <XAxis 
                  dataKey="bucket" 
                  tick={{ fill: '#94A3B8', fontSize: 8 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: '#94A3B8', fontSize: 8 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#1A1D27', border: '1px solid #2A2D3A', borderRadius: '8px', fontSize: '10px' }}
                />
                <Bar dataKey="count" radius={[2, 2, 0, 0]} barSize={20}>
                  {latencyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border p-6 rounded-xl">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
          <Activity size={18} className="text-accent" />
          Phân tích Hiệu năng
        </h3>
        <div className="space-y-4">
          <div className={`p-4 rounded-lg border ${isCorrelated ? 'bg-red-500/10 border-red-500/20' : 'bg-secondary/10 border-secondary/20'}`}>
            <div className="flex items-center gap-3 mb-2">
              {isCorrelated ? <AlertTriangle className="text-red-500" /> : <Zap className="text-secondary" />}
              <div className="font-bold">{isCorrelated ? 'Tương quan Nghiêm trọng' : 'Hiệu năng Ổn định'}</div>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              {isCorrelated 
                ? `Độ trễ mạng trung bình (${avgLatency.toFixed(0)}ms) đang ở mức ${currentStatus.label.toLowerCase()}, có tương quan mạnh với rating thấp (r = ${correlation.toFixed(2)}). Người dùng mạng chậm đang gặp ức chế lớn.`
                : `Mặc dù độ trễ trung bình là ${avgLatency.toFixed(0)}ms (${currentStatus.label.toLowerCase()}), nó không phải là nguyên nhân chính gây rating thấp (r = ${correlation.toFixed(2)}). Hãy tập trung vào UX và nội dung.`
              }
            </p>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-bold text-text-muted uppercase tracking-wider">Chi tiết Rating theo Độ trễ</div>
            {latencyData.map((d) => (
              <div key={d.bucket} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-xs text-text-muted">{d.bucket}</span>
                </div>
                <div className="text-xs font-mono font-bold">{d.avg.toFixed(1)} ★</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
