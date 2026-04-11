import React from 'react';
import { Star, TrendingUp, TrendingDown, Minus } from 'lucide-react';
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
  const category = propCategory || ISSUE_CATEGORIES[id] || { label: id, icon: '❓', color: '#94A3B8' };

  return (
    <button 
      onClick={onClick}
      className={cn(
        "bg-card border p-4 rounded-xl flex flex-col gap-3 text-left transition-all hover:border-accent/50",
        isActive ? "border-accent ring-1 ring-accent/50" : "border-border"
      )}
    >
      <div className="flex justify-between items-start">
        <span className="text-2xl">{category.icon}</span>
        <div className={cn(
          "flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded",
          trend > 0 ? "bg-red-500/10 text-red-500" : trend < 0 ? "bg-secondary/10 text-secondary" : "bg-gray-500/10 text-gray-500"
        )}>
          {trend > 0 ? <TrendingUp size={10} className="mr-0.5" /> : trend < 0 ? <TrendingDown size={10} className="mr-0.5" /> : <Minus size={10} className="mr-0.5" />}
          {Math.abs(trend)}
        </div>
      </div>
      <div>
        <div className="text-xs font-bold text-text line-clamp-1">{category.label}</div>
        <div className="text-2xl font-bold font-mono" style={{ color: category.color }}>{count}</div>
      </div>
      <div className="flex items-center gap-1 mt-auto">
        <Star size={12} className="fill-yellow-500 text-yellow-500" />
        <span className="text-xs font-medium">{avgRating.toFixed(1)}</span>
      </div>
    </button>
  );
};

interface IssueCategoryPanelProps {
  issueStats: { id: string; count: number; avgRating: number; trend: number; percent: number }[];
  activeIssue: string | null;
  onIssueClick: (id: string | null) => void;
  categories?: Record<string, any>;
  drillDownStats?: {
    pageTypes: { name: string; count: number; percent: number }[];
    devices: { name: string; count: number; percent: number }[];
    os: { name: string; count: number; percent: number }[];
    latencies: { name: string; count: number; percent: number }[];
    ratings: { name: string; count: number; percent: number }[];
    sentiments: { name: string; count: number; percent: number }[];
  } | null;
}

export const IssueCategoryPanel: React.FC<IssueCategoryPanelProps> = ({ 
  issueStats, 
  activeIssue, 
  onIssueClick, 
  categories = ISSUE_CATEGORIES,
  drillDownStats
}) => {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Danh mục Vấn đề</h3>
        {activeIssue && (
          <button 
            onClick={() => onIssueClick(null)}
            className="text-xs text-accent hover:underline font-bold"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        {issueStats.slice(0, 12).map((stat) => (
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
              const category = categories[stat.id] || { label: stat.id, icon: '❓' };
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
