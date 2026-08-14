import React from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { Star } from 'lucide-react';

interface DevicePlatformPanelProps {
  deviceTypeData: { name: string; value: number }[];
  osData: { name: string; value: number }[];
  ratingByDevice: { name: string; avg: number; count: number }[];
  topIssuesByDevice: Record<string, string[]>;
}

const COLORS = ['#FF6B35', '#00C9A7', '#3498DB', '#9B59B6', '#F1C40F'];

export const DevicePlatformPanel: React.FC<DevicePlatformPanelProps> = ({ 
  deviceTypeData, 
  osData, 
  ratingByDevice,
  topIssuesByDevice
}) => {
  const totalDevice = deviceTypeData.reduce((acc, curr) => acc + curr.value, 0);
  const totalOS = osData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div className="bg-card border border-border p-6 rounded-xl">
        <h3 className="text-lg font-bold mb-6">Phân bổ Thiết bị & Hệ điều hành</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deviceTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {deviceTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A1D27', border: '1px solid #2A2D3A', borderRadius: '8px' }}
                  formatter={(value: number) => [`${((value / totalDevice) * 100).toFixed(1)}%`, 'Tỉ lệ']}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={osData}>
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  tick={{ fill: '#94A3B8', fontSize: 10 }}
                  width={70}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#1A1D27', border: '1px solid #2A2D3A', borderRadius: '8px' }}
                  formatter={(value: number) => [`${((value / totalOS) * 100).toFixed(1)}%`, 'Tỉ lệ']}
                />
                <Bar dataKey="value" fill="#00C9A7" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border p-6 rounded-xl">
        <h3 className="text-lg font-bold mb-6">Rating & Vấn đề theo Nền tảng</h3>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ratingByDevice.map((item) => (
              <div key={item.name} className="bg-background/50 p-3 rounded-lg border border-border">
                <div className="text-xs text-text-muted mb-1">{item.name}</div>
                <div className="flex items-center gap-2">
                  <div className="text-xl font-bold font-mono">{item.avg.toFixed(1)}</div>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star 
                        key={s} 
                        size={10} 
                        className={s <= Math.round(item.avg) ? "fill-yellow-500 text-yellow-500" : "text-gray-600"} 
                      />
                    ))}
                  </div>
                </div>
                <div className="text-[10px] text-text-muted mt-1">{item.count} đánh giá</div>
              </div>
            ))}
          </div>

          <div>
            <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Vấn đề Nổi cộm theo Thiết bị</div>
            <div className="space-y-3">
              {Object.entries(topIssuesByDevice).map(([device, issues]) => (
                <div key={device} className="flex items-center gap-3">
                  <div className="w-20 text-xs font-medium text-text-muted">{device}</div>
                  <div className="flex flex-wrap gap-2">
                    {(issues as string[]).map((issue, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-red-500/10 text-red-500 text-[10px] rounded-full border border-red-500/20">
                        {issue}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
