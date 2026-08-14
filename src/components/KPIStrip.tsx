import React, { useState } from 'react';
import { LineChart, Line, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ArrowUp, ArrowDown, Minus, Info, Star, MessageSquare, Heart, AlertCircle, Zap, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { Modal } from './Modal';

interface KPICardProps {
  title: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  data: any[];
  color?: string;
  isBar?: boolean;
  onClick?: () => void;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, trend, trendLabel, data, color = '#FF6B35', isBar = false, onClick }) => {
  return (
    <div 
      className={cn(
        "bg-card border border-border p-4 rounded-xl flex flex-col gap-2 transition-all group",
        onClick && "cursor-pointer hover:border-accent/50 hover:bg-accent/5"
      )}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div className="text-text-muted text-[10px] font-bold uppercase tracking-wider">{title}</div>
        {onClick && <Info size={12} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>
      <div className="flex items-end gap-3">
        <div className="text-3xl font-bold font-mono leading-none">{value}</div>
        {trend !== undefined && (
          <div className={cn(
            "flex items-center text-xs font-medium mb-1",
            trend > 0 ? "text-secondary" : trend < 0 ? "text-red-500" : "text-text-muted"
          )}>
            {trend > 0 ? <ArrowUp size={14} /> : trend < 0 ? <ArrowDown size={14} /> : <Minus size={14} />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      {trendLabel && (
        <div className="text-[9px] text-text-muted leading-tight mt-1 italic">{trendLabel}</div>
      )}
      <div className="h-8 mt-1">
        {data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            {isBar ? (
              <BarChart data={data}>
                <Bar dataKey="value" fill={color} radius={[2, 2, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={data}>
                <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
              </LineChart>
            ) }
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full flex items-center justify-center text-[8px] text-text-muted italic">
            Không có dữ liệu
          </div>
        )}
      </div>
    </div>
  );
};

interface KPIStripProps {
  avgRating: number;
  avgRatingClassified: number;
  totalFeedback: number;
  nss: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  actionablePercent: number;
  actionableCount: number;
  unclassifiedCount: number;
  topIssue: string;
  topIssueCount: number;
  topIssuePercent: number;
  historicalData: {
    rating: any[];
    volume: any[];
    sentiment: any[];
    actionable: any[];
  };
  pageTypeData: any[];
  deviceMetrics: any;
  comparisonLabel?: string;
  ratingTrend?: number;
  volumeTrend?: number;
  nssTrend?: number;
  todayCount?: number;
  onViewToday?: () => void;
}

export const KPIStrip: React.FC<KPIStripProps> = ({ 
  avgRating, 
  avgRatingClassified,
  totalFeedback, 
  nss, 
  positiveCount,
  negativeCount,
  neutralCount,
  actionablePercent, 
  actionableCount,
  unclassifiedCount,
  topIssue,
  topIssueCount,
  topIssuePercent,
  historicalData,
  pageTypeData,
  deviceMetrics,
  comparisonLabel = "so với kỳ trước",
  ratingTrend,
  volumeTrend,
  nssTrend,
  todayCount = 0,
  onViewToday
}) => {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <KPICard 
        title="Điểm Đánh giá TB" 
        value={`${avgRating.toFixed(1)} ★`} 
        trend={ratingTrend} 
        trendLabel={comparisonLabel}
        data={historicalData.rating}
        color="#FF6B35"
        onClick={() => setActiveModal('rating')}
      />
      <KPICard 
        title="Tổng số Phản hồi" 
        value={totalFeedback} 
        trend={volumeTrend}
        trendLabel={comparisonLabel}
        data={historicalData.volume}
        color="#00C9A7"
        isBar
        onClick={() => setActiveModal('volume')}
      />
      <KPICard 
        title="Chỉ số Cảm xúc (NSS)" 
        value={`${nss > 0 ? '+' : ''}${nss.toFixed(1)}%`} 
        trend={nssTrend}
        trendLabel={`NSS = % Tích cực - % Tiêu cực (${comparisonLabel})`}
        data={historicalData.sentiment}
        color="#3498DB"
        onClick={() => setActiveModal('sentiment')}
      />
      <div className="bg-card border border-border p-6 rounded-xl flex flex-col justify-between relative overflow-hidden group hover:border-accent/30 transition-all">
        <div className="flex justify-between items-start mb-4">
          <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Phản hồi mới hôm nay</div>
          <div className="p-2 bg-accent/10 rounded-lg text-accent">
            <Zap size={16} />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <div className="text-4xl font-bold font-mono text-text">{todayCount}</div>
          <div className="text-xs text-text-muted">mục</div>
        </div>
        <button 
          onClick={onViewToday}
          className="mt-4 w-full py-2 bg-white/5 hover:bg-white/10 border border-border rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
        >
          Xem chi tiết <ChevronRight size={12} />
        </button>
        <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
          <Zap size={120} />
        </div>
      </div>

      {/* Modals */}
      <Modal 
        isOpen={activeModal === 'rating'} 
        onClose={() => setActiveModal(null)}
        title="Chi tiết Điểm Đánh giá"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-background/50 p-4 rounded-xl border border-border">
              <div className="text-[10px] font-bold text-text-muted uppercase mb-1">Điểm TB (Toàn bộ)</div>
              <div className="text-3xl font-bold font-mono text-accent">{avgRating.toFixed(2)} ★</div>
              <p className="text-[10px] text-text-muted mt-2">Tính trên tất cả {totalFeedback} phản hồi nhận được.</p>
            </div>
            <div className="bg-background/50 p-4 rounded-xl border border-border">
              <div className="text-[10px] font-bold text-text-muted uppercase mb-1">Điểm TB (Đã phân loại)</div>
              <div className="text-3xl font-bold font-mono text-secondary">{avgRatingClassified.toFixed(2)} ★</div>
              <p className="text-[10px] text-text-muted mt-2">Chỉ tính các phản hồi có nội dung xác định (không bao gồm "Chưa phân loại").</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-text uppercase tracking-wider">Điểm TB theo Lớp trang</h4>
              <div className="space-y-2">
                {pageTypeData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white/5 p-2 rounded-lg">
                    <span className="text-[10px] text-text-muted truncate max-w-[120px]">{item.type}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-accent" style={{ width: `${(item.avg / 5) * 100}%` }} />
                      </div>
                      <span className="text-[10px] font-bold font-mono">{item.avg.toFixed(1)} ★</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-text uppercase tracking-wider">Tỉ trọng Nền tảng Thiết bị</h4>
              <div className="space-y-2">
                {deviceMetrics.deviceTypeData.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between bg-white/5 p-2 rounded-lg">
                    <span className="text-[10px] text-text-muted">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold font-mono">{((item.value / totalFeedback) * 100).toFixed(1)}%</span>
                      <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-secondary" style={{ width: `${(item.value / totalFeedback) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="text-xs text-text-muted leading-relaxed pt-4 border-t border-border">
            <p className="font-bold text-text mb-1">Giải nghĩa:</p>
            Chỉ số này giúp phân biệt giữa trải nghiệm chung của người dùng và trải nghiệm đối với các vấn đề cụ thể đã được hệ thống AI nhận diện. Việc phân tích theo lớp trang và thiết bị giúp xác định chính xác nơi phát sinh vấn đề.
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={activeModal === 'volume'} 
        onClose={() => setActiveModal(null)}
        title="Chi tiết Lượng Phản hồi"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-background/50 p-6 rounded-2xl border border-border">
            <div>
              <div className="text-4xl font-bold font-mono">{totalFeedback}</div>
              <div className="text-xs text-text-muted uppercase font-bold tracking-wider">Tổng số phản hồi</div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-accent">{actionableCount}</div>
              <div className="text-[10px] text-text-muted uppercase font-bold">Cần xử lý</div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-text-muted">Phản hồi đã phân loại</span>
              <span className="font-mono font-bold">{totalFeedback - unclassifiedCount}</span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden flex">
              <div className="h-full bg-accent" style={{ width: `${((totalFeedback - unclassifiedCount) / totalFeedback) * 100}%` }} />
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-text-muted">Phản hồi chưa phân loại</span>
              <span className="font-mono font-bold">{unclassifiedCount}</span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden flex">
              <div className="h-full bg-gray-600" style={{ width: `${(unclassifiedCount / totalFeedback) * 100}%` }} />
            </div>
          </div>
          <div className="text-xs text-text-muted leading-relaxed">
            <p className="font-bold text-text mb-1">Chứng minh số liệu:</p>
            Dữ liệu được tổng hợp từ tất cả các nguồn (Web, Mobile App) trong khoảng thời gian đã chọn. Tỷ lệ "Cần xử lý" cao cho thấy người dùng đang cung cấp nhiều thông tin có giá trị để cải thiện sản phẩm.
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={activeModal === 'sentiment'} 
        onClose={() => setActiveModal(null)}
        title="Chi tiết Chỉ số Cảm xúc (NSS)"
      >
        <div className="space-y-6">
          <div className="text-center py-4">
            <div className={cn("text-5xl font-bold font-mono mb-2", nss > 0 ? "text-secondary" : "text-red-500")}>
              {nss > 0 ? '+' : ''}{nss.toFixed(1)}%
            </div>
            <div className="text-xs text-text-muted uppercase font-bold tracking-widest">Net Sentiment Score</div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-3 bg-secondary/10 rounded-xl border border-secondary/20">
              <Heart size={16} className="mx-auto mb-2 text-secondary" />
              <div className="text-lg font-bold">{positiveCount}</div>
              <div className="text-[10px] text-text-muted uppercase">Tích cực</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-xl border border-border">
              <Minus size={16} className="mx-auto mb-2 text-text-muted" />
              <div className="text-lg font-bold">{neutralCount}</div>
              <div className="text-[10px] text-text-muted uppercase">Trung lập</div>
            </div>
            <div className="text-center p-3 bg-red-500/10 rounded-xl border border-red-500/20">
              <AlertCircle size={16} className="mx-auto mb-2 text-red-500" />
              <div className="text-lg font-bold">{negativeCount}</div>
              <div className="text-[10px] text-text-muted uppercase">Tiêu cực</div>
            </div>
          </div>
          <div className="text-xs text-text-muted leading-relaxed">
            <p className="font-bold text-text mb-1">Giải nghĩa & Công thức:</p>
            NSS = (% Tích cực) - (% Tiêu cực). Chỉ số này phản ánh sức khỏe thương hiệu và mức độ hài lòng thực tế. NSS dương cho thấy lượng người ủng hộ nhiều hơn người phản đối.
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={activeModal === 'issue'} 
        onClose={() => setActiveModal(null)}
        title="Chi tiết Vấn đề Nổi cộm"
      >
        <div className="space-y-6">
          <div className="bg-accent/10 p-6 rounded-2xl border border-accent/20 text-center">
            <div className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2">Vấn đề ảnh hưởng lớn nhất</div>
            <div className="text-2xl font-bold text-accent">{topIssue}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-background/50 p-4 rounded-xl border border-border text-center">
              <div className="text-2xl font-bold font-mono">{topIssueCount}</div>
              <div className="text-[10px] text-text-muted uppercase font-bold">Số lượt phản hồi</div>
            </div>
            <div className="bg-background/50 p-4 rounded-xl border border-border text-center">
              <div className="text-2xl font-bold font-mono">{topIssuePercent.toFixed(1)}%</div>
              <div className="text-[10px] text-text-muted uppercase font-bold">Tỷ trọng trong tổng số</div>
            </div>
          </div>
          <div className="text-xs text-text-muted leading-relaxed">
            <p className="font-bold text-text mb-1">Phân tích:</p>
            Vấn đề này đang có xu hướng tăng cao trong 7 ngày qua. Đây là điểm nghẽn chính gây ảnh hưởng đến trải nghiệm người dùng và kéo thấp điểm đánh giá trung bình của hệ thống.
          </div>
        </div>
      </Modal>
    </div>
  );
};
