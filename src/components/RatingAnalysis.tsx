import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  Legend
} from 'recharts';

interface RatingAnalysisProps {
  distribution: { rating: number; count: number; percent: number }[];
  pageTypeData: { type: string; avg: number; count: number }[];
}

const RATING_COLORS = ['#FF3B5B', '#FF8C42', '#FFE66D', '#4ECDC4', '#00C9A7'];

export const RatingAnalysis: React.FC<RatingAnalysisProps> = ({ distribution, pageTypeData }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div className="bg-card border border-border p-6 rounded-xl">
        <h3 className="text-lg font-bold mb-6">Phân bổ Đánh giá</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={distribution}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis type="number" hide />
              <YAxis 
                dataKey="rating" 
                type="category" 
                tick={{ fill: '#94A3B8', fontSize: 12 }}
                tickFormatter={(val) => `${val} ★`}
                width={40}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ backgroundColor: '#1A1D27', border: '1px solid #2A2D3A', borderRadius: '8px' }}
                itemStyle={{ color: '#E8EAF0' }}
              />
              <Bar dataKey="percent" radius={[0, 4, 4, 0]} barSize={20}>
                {distribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={RATING_COLORS[entry.rating - 1]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-5 gap-2 mt-4">
          {distribution.map((d) => (
            <div key={d.rating} className="text-center">
              <div className="text-[10px] text-text-muted">{d.rating}★</div>
              <div className="text-xs font-bold">{d.count}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border p-6 rounded-xl">
        <h3 className="text-lg font-bold mb-6">Rating TB theo Loại trang</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={pageTypeData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" vertical={false} />
              <XAxis 
                dataKey="type" 
                tick={{ fill: '#94A3B8', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                domain={[0, 5]} 
                tick={{ fill: '#94A3B8', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ backgroundColor: '#1A1D27', border: '1px solid #2A2D3A', borderRadius: '8px' }}
                itemStyle={{ color: '#E8EAF0' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar 
                name="Rating Trung bình" 
                dataKey="avg" 
                fill="#FF6B35" 
                radius={[4, 4, 0, 0]} 
                barSize={30} 
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
