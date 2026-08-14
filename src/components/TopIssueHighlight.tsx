import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Smartphone, 
  Globe, 
  MessageSquare, 
  AlertTriangle,
  Zap,
  ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { IssueCategory } from '../types';

interface TopIssueHighlightProps {
  issueId: string;
  category: IssueCategory;
  count: number;
  percent: number;
  trend: number;
  topDevice: string;
  topPage: string;
  topPagePercent?: number;
  sampleFeedback: string;
  avgRating: number;
  onViewDetails: () => void;
  onScrollToIssues?: () => void;
}

export const TopIssueHighlight: React.FC<TopIssueHighlightProps> = ({
  issueId,
  category,
  count,
  percent,
  trend,
  topDevice,
  topPage,
  topPagePercent,
  sampleFeedback,
  avgRating,
  onViewDetails,
  onScrollToIssues
}) => {
  return (
    <div className="bg-card border-2 border-accent/20 rounded-2xl overflow-hidden relative group transition-all hover:border-accent/40">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-accent/10 transition-colors"></div>
      
      <div className="p-6 relative z-10">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Main Info */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center text-3xl shadow-lg shadow-accent/10">
                  {category.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-text">{category.label}</h3>
                    <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-[10px] font-bold rounded-full border border-red-500/20 uppercase tracking-wider">
                      Vấn đề Nổi cộm
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">Danh mục có lượng phản hồi tiêu cực cao nhất trong giai đoạn này</p>
                </div>
              </div>
              
              <button 
                onClick={onScrollToIssues}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-border rounded-xl text-xs font-bold transition-all"
              >
                XEM TOÀN BỘ DANH SÁCH VẤN ĐỀ <ChevronRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-background/50 p-3 rounded-xl border border-border/50">
                <div className="text-[10px] text-text-muted uppercase font-bold mb-1">Số lượng</div>
                <div className="text-2xl font-bold font-mono text-accent">{count}</div>
                <div className="text-[10px] text-text-muted">{percent.toFixed(1)}% tổng data</div>
              </div>
              
              <div className="bg-background/50 p-3 rounded-xl border border-border/50">
                <div className="text-[10px] text-text-muted uppercase font-bold mb-1">Xu hướng</div>
                <div className={cn(
                  "text-2xl font-bold font-mono flex items-center gap-1",
                  trend > 0 ? "text-red-500" : "text-secondary"
                )}>
                  {trend > 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                  {Math.abs(trend)}%
                </div>
                <div className="text-[10px] text-text-muted">So với giai đoạn trước</div>
              </div>

              <div className="bg-background/50 p-3 rounded-xl border border-border/50">
                <div className="text-[10px] text-text-muted uppercase font-bold mb-1">Rating TB</div>
                <div className="text-2xl font-bold font-mono text-yellow-500">{avgRating.toFixed(1)} ★</div>
                <div className="text-[10px] text-text-muted">Mức độ hài lòng thấp</div>
              </div>

              <div className="bg-background/50 p-3 rounded-xl border border-border/50">
                <div className="text-[10px] text-text-muted uppercase font-bold mb-1">Trạng thái</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="text-xs font-bold text-red-500">ĐANG TĂNG CAO</span>
                </div>
                <div className="text-[10px] text-text-muted mt-1">Cần xử lý ngay</div>
              </div>
            </div>
          </div>

          {/* Context & Sample */}
          <div className="w-full md:w-80 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted flex items-center gap-1.5">
                  <Smartphone size={14} /> Thiết bị phổ biến:
                </span>
                <span className="font-bold">{topDevice}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted flex items-center gap-1.5">
                  <Globe size={14} /> Trang bị ảnh hưởng:
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{topPage}</span>
                  {topPagePercent !== undefined && (
                    <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-md font-mono">
                      {topPagePercent.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-accent/5 border border-accent/10 p-4 rounded-xl relative">
              <MessageSquare size={14} className="absolute -top-2 -left-2 text-accent bg-background rounded-full p-0.5" />
              <div className="text-[10px] text-accent font-bold uppercase mb-2">Phản hồi tiêu biểu</div>
              <p className="text-xs italic text-text leading-relaxed line-clamp-3">
                "{sampleFeedback}"
              </p>
              <button 
                onClick={onViewDetails}
                className="w-full mt-3 py-2 bg-accent/10 hover:bg-accent/20 text-accent text-[10px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                XEM TẤT CẢ PHẢN HỒI <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
