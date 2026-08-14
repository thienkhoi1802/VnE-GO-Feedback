import React from 'react';
import { Star, TrendingUp, TrendingDown, Minus, Clock, RefreshCcw } from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { ISSUE_CATEGORIES } from '../types';
import { cn } from '../lib/utils';

interface IssueSummaryCardProps {
  id: string;
  count: number;
  avgRating: number;
  trend: number;
  isActive?: boolean;
  onClick: () => void;
  category?: any;
}

const IssueSummaryCard: React.FC<IssueSummaryCardProps> = ({ id, count, avgRating, trend, isActive, onClick, category: propCategory }) => {
  const category = propCategory || { label: id, icon: '🏷️', color: '#94A3B8' };

  return (
    <button 
      onClick={onClick}
      className={cn(
        "bg-card border p-3 rounded-xl flex flex-col gap-2 text-left transition-all hover:border-accent/50 min-h-[140px]",
        isActive ? "border-accent ring-1 ring-accent/50 bg-accent/5" : "border-border"
      )}
    >
      <div className="flex justify-between items-start">
        <span className="text-xl">{category.icon}</span>
        <div className={cn(
          "flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded",
          trend > 0 ? "bg-red-500/10 text-red-500" : trend < 0 ? "bg-secondary/10 text-secondary" : "bg-gray-500/10 text-gray-500"
        )}>
          {trend > 0 ? <TrendingUp size={9} className="mr-0.5" /> : trend < 0 ? <TrendingDown size={9} className="mr-0.5" /> : <Minus size={9} className="mr-0.5" />}
          {Math.abs(trend)}
        </div>
      </div>
      <div className="flex-1">
        <div className="text-[13px] font-bold text-text leading-tight mb-1">{category.label}</div>
        <div className="text-xl font-bold font-mono" style={{ color: category.color }}>{count}</div>
      </div>
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/30">
        <div className="flex items-center gap-1">
          <Star size={10} className="fill-yellow-500 text-yellow-500" />
          <span className="text-[10px] font-medium">{avgRating.toFixed(1)}</span>
        </div>
        <div className="text-[9px] text-text-muted font-bold">{((count / 563) * 100).toFixed(1)}%</div>
      </div>
    </button>
  );
};

interface IssueCategoryPanelProps {
  issueStats: { id: string; count: number; avgRating: number; trend: number; percent: number }[];
  activeIssue: string | null;
  onIssueClick: (id: string | null) => void;
  categories?: Record<string, any>;
  onAddCategory?: (label: string) => void;
  isUpdating?: boolean;
  drillDownStats?: {
    pageTypes: { name: string; count: number; percent: number }[];
    devices: { name: string; count: number; percent: number }[];
    os: { name: string; count: number; percent: number }[];
    latencies: { name: string; count: number; percent: number }[];
    ratings: { name: string; count: number; percent: number }[];
    sentiments: { name: string; count: number; percent: number }[];
    timeSeries: { date: string; count: number; trend?: number }[];
  } | null;
}

export const IssueCategoryPanel: React.FC<IssueCategoryPanelProps> = ({ 
  issueStats, 
  activeIssue, 
  onIssueClick, 
  categories = ISSUE_CATEGORIES,
  onAddCategory,
  isUpdating,
  drillDownStats
}) => {
  const [newCategoryLabel, setNewCategoryLabel] = React.useState('');
  const [showAddCategory, setShowAddCategory] = React.useState(false);

  return (
    <div className="mb-6 relative">
      {isUpdating && (
        <div className="absolute inset-0 bg-background/20 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl">
          <div className="bg-card border border-accent/30 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
            <RefreshCcw size={14} className="animate-spin text-accent" />
            <span className="text-[10px] font-bold text-accent uppercase tracking-wider">Đang phân bổ lại...</span>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-bold">Danh mục Vấn đề</h3>
          <button 
            onClick={() => setShowAddCategory(!showAddCategory)}
            className="text-[10px] font-bold px-2 py-1 bg-white/5 border border-dashed border-border rounded hover:border-accent hover:text-accent transition-all"
          >
            + Thêm Danh mục
          </button>
        </div>
        {activeIssue && (
          <button 
            onClick={() => onIssueClick(null)}
            className="text-xs text-accent hover:underline font-bold"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {showAddCategory && (
        <div className="mb-6 p-4 bg-accent/5 border border-accent/20 rounded-xl flex gap-3 items-center animate-in fade-in slide-in-from-top-2 duration-200">
          <input 
            type="text" 
            placeholder="Tên danh mục mới..."
            className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
            value={newCategoryLabel}
            onChange={(e) => setNewCategoryLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newCategoryLabel.trim()) {
                onAddCategory?.(newCategoryLabel.trim());
                setNewCategoryLabel('');
                setShowAddCategory(false);
              }
            }}
          />
          <button 
            onClick={() => {
              if (newCategoryLabel.trim()) {
                onAddCategory?.(newCategoryLabel.trim());
                setNewCategoryLabel('');
                setShowAddCategory(false);
              }
            }}
            className="px-4 py-2 bg-accent text-white text-sm font-bold rounded-lg hover:bg-accent/90 transition-colors"
          >
            Thêm
          </button>
          <button 
            onClick={() => setShowAddCategory(false)}
            className="p-2 text-text-muted hover:text-text"
          >
            Hủy
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
        {issueStats.slice(0, 10).map((stat) => (
          <IssueSummaryCard 
            key={stat.id}
            {...stat}
            isActive={activeIssue === stat.id}
            onClick={() => onIssueClick(activeIssue === stat.id ? null : stat.id)}
            category={categories[stat.id]}
          />
        ))}
      </div>

      {activeIssue && drillDownStats && (
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-6 mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center text-2xl">
              {categories[activeIssue]?.icon || '❓'}
            </div>
            <div>
              <h4 className="text-lg font-bold text-accent truncate max-w-[200px] md:max-w-none">Phân tích Chi tiết: {categories[activeIssue]?.label || activeIssue}</h4>
              <p className="text-xs text-text-muted">Phân tích thống kê cho danh mục vấn đề này</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {/* Page Type Breakdown */}
            <div>
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-4">Loại Trang</div>
              <div className="space-y-3">
                {drillDownStats.pageTypes.map((item) => (
                  <div key={item.name}>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="font-medium truncate max-w-[80px]">{item.name}</span>
                      <span className="text-text-muted">{item.count} ({item.percent.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-accent rounded-full" 
                        style={{ width: `${item.percent}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Device Breakdown */}
            <div>
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-4">Loại Thiết bị</div>
              <div className="space-y-3">
                {drillDownStats.devices.map((item) => (
                  <div key={item.name}>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-text-muted">{item.count} ({item.percent.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-secondary rounded-full" 
                        style={{ width: `${item.percent}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* OS Breakdown */}
            <div>
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-4">Hệ điều hành</div>
              <div className="space-y-3">
                {drillDownStats.os.map((item) => (
                  <div key={item.name}>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-text-muted">{item.count} ({item.percent.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full" 
                        style={{ width: `${item.percent}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Latency Breakdown */}
            <div>
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-4">Mạng / Độ trễ</div>
              <div className="space-y-3">
                {drillDownStats.latencies.map((item) => (
                  <div key={item.name}>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="font-medium capitalize">{item.name.replace('_', ' ')}</span>
                      <span className="text-text-muted">{item.count} ({item.percent.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full",
                          item.name === 'fast' ? "bg-green-500" : 
                          item.name === 'normal' ? "bg-blue-500" : 
                          item.name === 'slow' ? "bg-yellow-500" : "bg-red-500"
                        )}
                        style={{ width: `${item.percent}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rating Breakdown */}
            <div>
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-4">Đánh giá Sao</div>
              <div className="space-y-3">
                {drillDownStats.ratings.map((item) => (
                  <div key={item.name}>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-text-muted">{item.count} ({item.percent.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full",
                          item.name.startsWith('5') ? "bg-green-500" : 
                          item.name.startsWith('4') ? "bg-green-400" : 
                          item.name.startsWith('3') ? "bg-yellow-500" : "bg-red-500"
                        )}
                        style={{ width: `${item.percent}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sentiment Breakdown */}
            <div>
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-4">Cảm xúc</div>
              <div className="space-y-3">
                {drillDownStats.sentiments.map((item) => (
                  <div key={item.name}>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-text-muted">{item.count} ({item.percent.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full",
                          item.name === 'Tích cực' ? "bg-green-500" : 
                          item.name === 'Trung lập' ? "bg-yellow-500" : "bg-red-500"
                        )}
                        style={{ width: `${item.percent}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Time Series Chart */}
          <div className="mt-10 pt-8 border-t border-accent/10">
            <div className="flex items-center gap-2 mb-6">
              <Clock size={16} className="text-accent" />
              <h5 className="text-xs font-bold text-text uppercase tracking-widest">Phân bố lỗi theo thời gian</h5>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={drillDownStats.timeSeries}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#FF6B35" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94A3B8', fontSize: 10 }}
                    dy={10}
                    minTickGap={30}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94A3B8', fontSize: 10 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1A1D27', 
                      border: '1px solid #2A2D3A', 
                      borderRadius: '8px',
                      fontSize: '10px'
                    }}
                    itemStyle={{ color: '#FF6B35' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    name="Số lỗi"
                    stroke="#FF6B35" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorCount)" 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="trend" 
                    name="Xu hướng"
                    stroke="#3498DB" 
                    strokeWidth={2} 
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-background/50 border-b border-border">
            <tr>
              <th className="px-4 py-3 font-bold">Vấn đề</th>
              <th className="px-4 py-3 font-bold text-right">Số lượng</th>
              <th className="px-4 py-3 font-bold text-right">Rating TB</th>
              <th className="px-4 py-3 font-bold text-right">% Tổng</th>
              <th className="px-4 py-3 font-bold text-right">Xu hướng</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {issueStats.map((stat) => {
              const category = categories[stat.id] || { label: stat.id, icon: '🏷️' };
              return (
                <tr 
                  key={stat.id} 
                  className={cn(
                    "hover:bg-white/5 cursor-pointer transition-colors",
                    activeIssue === stat.id && "bg-accent/5"
                  )}
                  onClick={() => onIssueClick(activeIssue === stat.id ? null : stat.id)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span>{category.icon}</span>
                      <span className="font-medium">{category.label}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{stat.count}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Star size={12} className="fill-yellow-500 text-yellow-500" />
                      {stat.avgRating.toFixed(1)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-text-muted">{stat.percent.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right">
                    <span className={cn(
                      "font-bold",
                      stat.trend > 0 ? "text-red-500" : stat.trend < 0 ? "text-secondary" : "text-text-muted"
                    )}>
                      {stat.trend > 0 ? `+${stat.trend}` : stat.trend}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
