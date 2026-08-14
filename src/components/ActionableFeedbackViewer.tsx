import React, { useState, useMemo } from 'react';
import { Star, Mail, ExternalLink, Copy, Check, Filter, Search, ChevronRight, User, Smartphone, Globe, Clock, Zap, ShieldAlert, X } from 'lucide-react';
import { ProcessedFeedback, ISSUE_CATEGORIES } from '../types';
import { cn } from '../lib/utils';
import { format, isToday } from 'date-fns';
import { Modal } from './Modal';

interface FeedbackCardProps {
  feedback: ProcessedFeedback;
  categories?: Record<string, any>;
  isHighlighted?: boolean;
  isTodayHighlight?: boolean;
  onUpdateTags?: (id: string, tags: string[]) => void;
  onAddCategory?: (label: string) => void;
}

const FeedbackCard: React.FC<FeedbackCardProps> = ({ 
  feedback, 
  categories = ISSUE_CATEGORIES, 
  isHighlighted, 
  isTodayHighlight,
  onUpdateTags,
  onAddCategory
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [tempTags, setTempTags] = useState<string[]>(feedback._categories);
  const [newTagInput, setNewTagInput] = useState('');
  const cardRef = React.useRef<HTMLDivElement>(null);

  // Sync tempTags when feedback categories change externally (unless editing)
  React.useEffect(() => {
    if (!isEditingTags) {
      setTempTags(feedback._categories);
    }
  }, [feedback._categories, isEditingTags]);

  const handleToggleEdit = () => {
    if (!isEditingTags) {
      setTempTags(feedback._categories);
    }
    setIsEditingTags(!isEditingTags);
  };

  const handleSaveTags = () => {
    onUpdateTags?.(feedback._id, tempTags);
    setIsEditingTags(false);
  };

  const handleAddTempTag = (id: string) => {
    if (!tempTags.includes(id)) {
      setTempTags([...tempTags, id]);
    }
  };

  const handleRemoveTempTag = (id: string) => {
    setTempTags(tempTags.filter(t => t !== id));
  };

  React.useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isHighlighted]);

  const ratingColor = feedback._rating >= 4 ? 'text-secondary' : feedback._rating <= 2 ? 'text-red-500' : 'text-yellow-500';

  return (
    <div 
      ref={cardRef}
      className={cn(
        "bg-card border rounded-xl p-4 flex flex-col gap-3 transition-all group",
        isHighlighted ? "border-secondary ring-1 ring-secondary/50 shadow-lg shadow-secondary/10" : "border-border hover:border-accent/30",
        isTodayHighlight && "bg-accent/[0.08] border-accent/40 ring-1 ring-accent/30 shadow-md shadow-accent/5"
      )}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className={cn("flex items-center gap-1 font-bold font-mono text-lg", ratingColor)}>
            {feedback._rating} <Star size={16} className="fill-current" />
          </div>
          {isTodayHighlight && (
            <span className="px-1.5 py-0.5 bg-accent text-white text-[8px] font-bold rounded flex items-center gap-0.5 animate-pulse">
              <Zap size={8} /> MỚI
            </span>
          )}
          <div className="h-4 w-px bg-border"></div>
          <div className="flex flex-wrap gap-1">
            <span className="px-1.5 py-0.5 bg-white/5 rounded text-[10px] font-bold uppercase text-text-muted">
              {feedback._deviceInfo.deviceType}
            </span>
            <span className="px-1.5 py-0.5 bg-white/5 rounded text-[10px] font-bold uppercase text-text-muted">
              {feedback._deviceInfo.os}
            </span>
          </div>
        </div>
        <div className="text-[10px] text-text-muted font-mono">
          {format(feedback._date, 'dd/MM/yyyy HH:mm')}
        </div>
      </div>

      <div className="relative">
        <p className="text-sm leading-relaxed text-text">
          "{feedback.Feedback}"
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mt-auto pt-2 border-t border-border/50">
        {(isEditingTags ? tempTags : feedback._categories).map(catId => {
          const cat = categories[catId] || { label: catId, icon: '🏷️', color: '#94A3B8' };
          return (
            <span 
              key={catId} 
              className="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 group/tag"
              style={{ backgroundColor: `${cat.color}15`, color: cat.color, border: `1px solid ${cat.color}30` }}
            >
              <span>{cat.icon}</span>
              {cat.label}
              {isEditingTags && (
                <button 
                  onClick={() => handleRemoveTempTag(catId)}
                  className="ml-1 hover:text-red-500 transition-colors"
                >
                  <X size={10} />
                </button>
              )}
            </span>
          );
        })}
        
        {isEditingTags ? (
          <div className="flex flex-col gap-2 w-full mt-2 p-3 bg-background/50 rounded-lg border border-accent/20">
            <div className="flex justify-between items-center mb-1">
              <div className="text-[10px] font-bold text-accent uppercase tracking-wider">Chọn Tag từ danh sách</div>
              <div className="text-[9px] text-text-muted italic">Click để thêm, nhấn Xong để lưu</div>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {Object.entries(categories).map(([id, cat]) => {
                const isSelected = tempTags.includes(id);
                if (isSelected) return null;
                return (
                  <button
                    key={id}
                    onClick={() => handleAddTempTag(id)}
                    className="px-2 py-0.5 rounded-full text-[10px] bg-white/5 border border-border hover:border-accent/50 hover:bg-accent/5 transition-all flex items-center gap-1"
                  >
                    <span>{(cat as any).icon}</span>
                    {(cat as any).label}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Nhập tag mới & Enter..."
                className="flex-1 bg-background border border-border rounded px-2 py-1 text-[10px] focus:outline-none focus:border-accent"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTagInput.trim()) {
                    onAddCategory?.(newTagInput.trim());
                    const newId = newTagInput.trim().toLowerCase().replace(/\s+/g, '_');
                    handleAddTempTag(newId);
                    setNewTagInput('');
                  }
                }}
              />
              <button 
                onClick={handleSaveTags}
                className="px-3 py-1 bg-accent text-white text-[10px] font-bold rounded shadow-lg shadow-accent/20 hover:bg-accent/90 transition-all"
              >
                Xác nhận & Lưu
              </button>
              <button 
                onClick={() => setIsEditingTags(false)}
                className="px-2 py-1 bg-white/5 text-text-muted text-[10px] font-bold rounded hover:text-text"
              >
                Hủy
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={handleToggleEdit}
            className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-dashed border-border text-text-muted hover:border-accent hover:text-accent transition-all"
          >
            + Gắn Tag
          </button>
        )}

        {feedback.Email && (
          <div className="flex items-center gap-1 text-[10px] text-text-muted ml-auto">
            <Mail size={12} />
            <span className="truncate max-w-[120px]">{feedback.Email}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2 text-[10px] text-text-muted truncate max-w-[200px]">
          <ExternalLink size={12} />
          <a 
            href={feedback['Page URL']} 
            target="_blank" 
            rel="noopener noreferrer"
            className="truncate hover:text-accent hover:underline"
          >
            {feedback['Page URL']}
          </a>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowDetails(true)}
            className="text-[10px] font-bold text-accent hover:underline flex items-center gap-1 px-2 py-1 hover:bg-accent/5 rounded transition-colors"
          >
            Xem chi tiết <ChevronRight size={12} />
          </button>
        </div>
      </div>

      <Modal 
        isOpen={showDetails} 
        onClose={() => setShowDetails(false)} 
        title="Chi tiết Phản hồi & Độc giả"
      >
        <div className="space-y-6">
          {/* Feedback Content */}
          <div className="bg-accent/5 border border-accent/20 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2 text-accent">
              <Star size={16} className="fill-current" />
              <span className="font-bold text-sm">{feedback._rating} Sao - Phản hồi từ độc giả</span>
            </div>
            <p className="text-sm italic leading-relaxed text-text">"{feedback.Feedback}"</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* User Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-wider">
                <User size={14} />
                Thông tin Độc giả
              </div>
              <div className="space-y-2 bg-white/5 p-3 rounded-lg border border-border/50">
                <DetailRow label="Email" value={feedback.Email || 'Không có'} />
                <DetailRow label="FOSP UID" value={feedback.fosp_uid || 'N/A'} />
                <DetailRow label="MyVNE ID" value={feedback.myvne_user_id || 'N/A'} />
                <DetailRow label="IP Address" value={feedback['IP User'] || 'N/A'} />
              </div>
            </div>

            {/* Device Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-wider">
                <Smartphone size={14} />
                Thiết bị & Nền tảng
              </div>
              <div className="space-y-2 bg-white/5 p-3 rounded-lg border border-border/50">
                <DetailRow label="Loại thiết bị" value={feedback['Device Type']} />
                <DetailRow label="Hệ điều hành" value={feedback.OS} />
                <DetailRow label="Nền tảng" value={feedback.Platform} />
                <DetailRow label="Trình duyệt" value={`${feedback.Browser} (${feedback['Browser Version']})`} />
                <DetailRow label="Độ phân giải" value={feedback['Screen Resolution']} />
              </div>
            </div>

            {/* Context Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-wider">
                <Globe size={14} />
                Bối cảnh & URL
              </div>
              <div className="space-y-2 bg-white/5 p-3 rounded-lg border border-border/50">
                <DetailRow label="Loại trang" value={feedback['Page Type']} />
                <DetailRow label="Tiêu đề trang" value={feedback['Page Title']} />
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-text-muted">URL Trang</span>
                  <a 
                    href={feedback['Page URL']} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[10px] text-accent hover:underline break-all"
                  >
                    {feedback['Page URL']}
                  </a>
                </div>
              </div>
            </div>

            {/* Performance Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-wider">
                <Zap size={14} />
                Hiệu năng & Thời gian
              </div>
              <div className="space-y-2 bg-white/5 p-3 rounded-lg border border-border/50">
                <DetailRow label="Thời gian" value={format(feedback._date, 'dd/MM/yyyy HH:mm:ss')} />
                <DetailRow label="Độ trễ (ms)" value={`${feedback['Latency (ms)']}ms (${feedback['Latency Text']})`} />
                <DetailRow label="Tốc độ tải" value={feedback['Download Speed']} />
                <DetailRow label="Môi trường" value={feedback['Device Env']} />
              </div>
            </div>
          </div>

          {/* AI Analysis */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-wider">
              <ShieldAlert size={14} />
              Phân tích AI & Phân loại
            </div>
            <div className="bg-white/5 p-3 rounded-lg border border-border/50 flex flex-wrap gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-muted">Độ ưu tiên</span>
                <span className={cn(
                  "text-xs font-bold px-2 py-0.5 rounded",
                  feedback._priority >= 8 ? "bg-red-500/20 text-red-500" : 
                  feedback._priority >= 5 ? "bg-yellow-500/20 text-yellow-500" : "bg-green-500/20 text-green-500"
                )}>
                  {feedback._priority}/10
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-muted">Cần xử lý</span>
                <span className={cn(
                  "text-xs font-bold px-2 py-0.5 rounded",
                  feedback._isActionable ? "bg-secondary/20 text-secondary" : "bg-white/10 text-text-muted"
                )}>
                  {feedback._isActionable ? 'CÓ' : 'KHÔNG'}
                </span>
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <span className="text-[10px] text-text-muted">Danh mục</span>
                <div className="flex flex-wrap gap-1">
                  {feedback._categories.map(catId => {
                    const cat = categories[catId] || { label: catId, icon: '🏷️' };
                    return (
                      <span key={catId} className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 border border-white/5">
                        {cat.icon} {cat.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between items-start gap-4 py-0.5">
    <span className="text-[10px] text-text-muted whitespace-nowrap mt-0.5">{label}</span>
    <span className="text-[10px] font-bold text-text text-right break-words max-w-[70%]">{value}</span>
  </div>
);

interface ActionableFeedbackViewerProps {
  feedbacks: ProcessedFeedback[];
  onFilterChange: (filters: any) => void;
  categories?: Record<string, any>;
  issueFilter: string | null;
  onIssueFilterChange: (issueId: string | null) => void;
  ratingFilter: number | null;
  onRatingFilterChange: (rating: number | null) => void;
  search: string;
  onSearchChange: (search: string) => void;
  deviceFilter: string | null;
  onDeviceFilterChange: (device: string | null) => void;
  sortOrder?: 'newest' | 'oldest' | 'rating-high' | 'rating-low';
  onSortChange?: (order: 'newest' | 'oldest' | 'rating-high' | 'rating-low') => void;
  highlightId?: string;
  onUpdateTags?: (id: string, tags: string[]) => void;
  onAddCategory?: (label: string) => void;
  onScrollToTop?: (fn: () => void) => void;
}

export const ActionableFeedbackViewer: React.FC<ActionableFeedbackViewerProps> = ({ 
  feedbacks, 
  categories = ISSUE_CATEGORIES,
  issueFilter,
  onIssueFilterChange,
  ratingFilter,
  onRatingFilterChange,
  search,
  onSearchChange,
  deviceFilter,
  onDeviceFilterChange,
  sortOrder = 'newest',
  onSortChange,
  highlightId,
  onUpdateTags,
  onAddCategory,
  onScrollToTop
}) => {
  const [highPriorityOnly, setHighPriorityOnly] = useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const scrollToTop = React.useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // Expose scroll to top function to parent
  React.useEffect(() => {
    onScrollToTop?.(scrollToTop);
  }, [onScrollToTop, scrollToTop]);

  // Scroll to top when any filter changes
  React.useEffect(() => {
    scrollToTop();
  }, [search, ratingFilter, issueFilter, deviceFilter, sortOrder, highPriorityOnly, scrollToTop]);

  const clearFilters = () => {
    onSearchChange('');
    onRatingFilterChange(null);
    onIssueFilterChange(null);
    onDeviceFilterChange(null);
    setHighPriorityOnly(false);
    onSortChange?.('newest');
  };

  const uniqueDevices = useMemo(() => {
    const devices = new Set<string>();
    feedbacks.forEach(f => {
      if (f._deviceInfo.deviceType) devices.add(f._deviceInfo.deviceType);
    });
    return Array.from(devices).sort();
  }, [feedbacks]);

  const filteredFeedbacks = feedbacks.filter(f => {
    const matchesSearch = f.Feedback.toLowerCase().includes(search.toLowerCase()) || 
                          (f.Email && f.Email.toLowerCase().includes(search.toLowerCase()));
    const matchesRating = ratingFilter === null || f._rating === ratingFilter;
    const matchesIssue = issueFilter === null || f._categories.includes(issueFilter);
    const matchesDevice = deviceFilter === null || f._deviceInfo.deviceType === deviceFilter;
    const matchesPriority = !highPriorityOnly || f._priority >= 8;
    
    return matchesSearch && matchesRating && matchesIssue && matchesDevice && matchesPriority;
  }).sort((a, b) => {
    if (sortOrder === 'newest') return b._date.getTime() - a._date.getTime();
    if (sortOrder === 'oldest') return a._date.getTime() - b._date.getTime();
    if (sortOrder === 'rating-high') return b._rating - a._rating;
    if (sortOrder === 'rating-low') return a._rating - b._rating;
    return 0;
  });

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border bg-background/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="font-bold flex items-center gap-2 text-text">
              <Filter size={18} className="text-accent" />
              Hộp thư Phản hồi
            </div>
            <a 
              href="https://docs.google.com/spreadsheets/d/1vQvtnBoEB_efJdyUP0nVPK_TDtntd3zAM69jFrIkYoFQT5AmbCUHTuL8GoA4m2v1t6FDlOBLvmcJ2Oi/edit"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 bg-white/5 hover:bg-white/10 border border-border rounded-lg text-text-muted hover:text-accent transition-all"
              title="Đưa đến link google sheet file feedback"
            >
              <ExternalLink size={14} />
            </a>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold bg-accent text-white px-2 py-0.5 rounded-full">
              {filteredFeedbacks.length} mục
            </span>
            {(search || ratingFilter !== null || issueFilter !== null || deviceFilter !== null || highPriorityOnly || sortOrder !== 'newest') && (
              <button 
                onClick={clearFilters}
                className="flex items-center gap-1 text-[10px] font-bold text-text-muted hover:text-accent transition-colors"
              >
                <X size={12} />
                Xóa lọc
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
            <input 
              type="text" 
              placeholder="Tìm kiếm nội dung hoặc email..."
              className="w-full bg-background border border-border rounded-lg py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-accent/50 transition-colors"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select 
              className={cn(
                "bg-background border rounded-lg px-2 py-1.5 text-[10px] font-bold focus:outline-none transition-all",
                ratingFilter !== null ? "border-accent/50 ring-1 ring-accent/20" : "border-border"
              )}
              value={ratingFilter || ''}
              onChange={(e) => onRatingFilterChange(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">Tất cả Rating</option>
              {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} Sao</option>)}
            </select>

            <select 
              className={cn(
                "bg-background border rounded-lg px-2 py-1.5 text-[10px] font-bold focus:outline-none max-w-[120px] transition-all",
                issueFilter !== null ? "border-accent/50 ring-1 ring-accent/20" : "border-border"
              )}
              value={issueFilter || ''}
              onChange={(e) => onIssueFilterChange(e.target.value || null)}
            >
              <option value="">Tất cả Vấn đề</option>
              {Object.entries(categories).map(([id, cat]) => (
                <option key={id} value={id}>{(cat as any).label}</option>
              ))}
            </select>

            <select 
              className={cn(
                "bg-background border rounded-lg px-2 py-1.5 text-[10px] font-bold focus:outline-none max-w-[100px] transition-all",
                deviceFilter !== null ? "border-accent/50 ring-1 ring-accent/20" : "border-border"
              )}
              value={deviceFilter || ''}
              onChange={(e) => onDeviceFilterChange(e.target.value || null)}
            >
              <option value="">Tất cả Thiết bị</option>
              {uniqueDevices.map(device => (
                <option key={device} value={device}>{device}</option>
              ))}
            </select>

            <div className="h-4 w-px bg-border mx-1"></div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => onSortChange?.(sortOrder === 'newest' ? 'oldest' : 'newest')}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 bg-background border rounded-lg text-[10px] font-bold transition-all shadow-sm",
                  sortOrder.startsWith('newest') || sortOrder.startsWith('oldest') 
                    ? "border-accent/50 text-text ring-1 ring-accent/20" 
                    : "border-border text-text-muted hover:text-text hover:border-accent/30"
                )}
              >
                <Clock size={12} className={cn(sortOrder.startsWith('newest') || sortOrder.startsWith('oldest') ? "text-accent" : "text-text-muted")} />
                <span>{sortOrder === 'oldest' ? 'Cũ nhất' : 'Mới nhất'}</span>
                <div className="flex flex-col -space-y-1 ml-1">
                  <ChevronRight size={10} className={cn("rotate-[-90deg] transition-colors", sortOrder === 'oldest' ? "text-accent" : "text-text-muted")} />
                  <ChevronRight size={10} className={cn("rotate-[90deg] transition-colors", sortOrder === 'newest' ? "text-accent" : "text-text-muted")} />
                </div>
              </button>

              <button 
                onClick={() => onSortChange?.(sortOrder === 'rating-high' ? 'rating-low' : 'rating-high')}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 bg-background border rounded-lg text-[10px] font-bold transition-all shadow-sm",
                  sortOrder.startsWith('rating') 
                    ? "border-accent/50 text-text ring-1 ring-accent/20" 
                    : "border-border text-text-muted hover:text-text hover:border-accent/30"
                )}
              >
                <Star size={12} className={cn(sortOrder.startsWith('rating') ? "text-accent" : "text-text-muted")} />
                <span>{sortOrder === 'rating-low' ? 'Rating: Thấp → Cao' : 'Rating: Cao → Thấp'}</span>
                <div className="flex flex-col -space-y-1 ml-1">
                  <ChevronRight size={10} className={cn("rotate-[-90deg] transition-colors", sortOrder === 'rating-low' ? "text-accent" : "text-text-muted")} />
                  <ChevronRight size={10} className={cn("rotate-[90deg] transition-colors", sortOrder === 'rating-high' ? "text-accent" : "text-text-muted")} />
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
      >
        {filteredFeedbacks.length > 0 ? (
          filteredFeedbacks.map((f, idx) => {
            const isTodayItem = isToday(f._date);
            const isFirstToday = isTodayItem && filteredFeedbacks.findIndex(item => isToday(item._date)) === idx;
            
            return (
              <FeedbackCard 
                key={f._id} 
                feedback={f} 
                categories={categories} 
                isHighlighted={highlightId === f._id || (highlightId === 'today' && isFirstToday)}
                isTodayHighlight={highlightId === 'today' && isTodayItem}
                onUpdateTags={onUpdateTags}
                onAddCategory={onAddCategory}
              />
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-text-muted opacity-50">
            <Search size={48} className="mb-4" />
            <p className="text-sm">Không tìm thấy phản hồi phù hợp</p>
          </div>
        )}
      </div>
    </div>
  );
};
