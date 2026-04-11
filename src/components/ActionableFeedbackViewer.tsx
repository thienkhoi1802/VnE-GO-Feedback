import React, { useState } from 'react';
import { Star, Mail, ExternalLink, Copy, Check, Filter, Search, ChevronRight } from 'lucide-react';
import { ProcessedFeedback, ISSUE_CATEGORIES } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface FeedbackCardProps {
  feedback: ProcessedFeedback;
  categories?: Record<string, any>;
}

const FeedbackCard: React.FC<FeedbackCardProps> = ({ feedback, categories = ISSUE_CATEGORIES }) => {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(feedback.Feedback);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const ratingColor = feedback._rating >= 4 ? 'text-secondary' : feedback._rating <= 2 ? 'text-red-500' : 'text-yellow-500';

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 transition-all hover:border-accent/30 group">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className={cn("flex items-center gap-1 font-bold font-mono text-lg", ratingColor)}>
            {feedback._rating} <Star size={16} className="fill-current" />
          </div>
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
        <p className={cn(
          "text-sm leading-relaxed text-text",
          !expanded && "line-clamp-3"
        )}>
          "{feedback.Feedback}"
        </p>
        {feedback.Feedback.length > 200 && (
          <button 
            onClick={() => setExpanded(!expanded)}
            className="text-accent text-xs font-bold mt-1 hover:underline flex items-center gap-1"
          >
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mt-auto pt-2 border-t border-border/50">
        {feedback._categories.map(catId => {
          const cat = categories[catId];
          if (!cat) return null;
          return (
            <span 
              key={catId} 
              className="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1"
              style={{ backgroundColor: `${cat.color}15`, color: cat.color, border: `1px solid ${cat.color}30` }}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </span>
          );
        })}
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
            onClick={handleCopy}
            className="p-1.5 hover:bg-white/10 rounded transition-colors text-text-muted hover:text-text"
            title="Sao chép phản hồi"
          >
            {copied ? <Check size={14} className="text-secondary" /> : <Copy size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
};

interface ActionableFeedbackViewerProps {
  feedbacks: ProcessedFeedback[];
  onFilterChange: (filters: any) => void;
  categories?: Record<string, any>;
}

export const ActionableFeedbackViewer: React.FC<ActionableFeedbackViewerProps> = ({ feedbacks, categories = ISSUE_CATEGORIES }) => {
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [issueFilter, setIssueFilter] = useState<string | null>(null);
  const [highPriorityOnly, setHighPriorityOnly] = useState(false);

  const filteredFeedbacks = feedbacks.filter(f => {
    const matchesSearch = f.Feedback.toLowerCase().includes(search.toLowerCase()) || 
                          (f.Email && f.Email.toLowerCase().includes(search.toLowerCase()));
    const matchesRating = ratingFilter === null || f._rating === ratingFilter;
    const matchesIssue = issueFilter === null || f._categories.includes(issueFilter);
    const matchesPriority = !highPriorityOnly || f._priority >= 8;
    
    return matchesSearch && matchesRating && matchesIssue && matchesPriority;
  }).sort((a, b) => b._priority - a._priority);

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border bg-background/30">
        <div className="flex items-center justify-between mb-4">
          <a 
            href="https://vnexpress.net/ke-thach-dau-chatgpt-mo-giac-mo-ai-viet-5053489.html" 
            target="_blank" 
            rel="noopener noreferrer"
            className="font-bold flex items-center gap-2 hover:text-accent transition-colors group"
          >
            <Filter size={18} className="text-accent" />
            Hộp thư Phản hồi
            <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
          <span className="text-[10px] font-bold bg-accent text-white px-2 py-0.5 rounded-full">
            {filteredFeedbacks.length} mục
          </span>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
            <input 
              type="text" 
              placeholder="Tìm kiếm nội dung hoặc email..."
              className="w-full bg-background border border-border rounded-lg py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-accent/50 transition-colors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select 
              className="bg-background border border-border rounded-lg px-2 py-1.5 text-[10px] font-bold focus:outline-none"
              value={ratingFilter || ''}
              onChange={(e) => setRatingFilter(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">Tất cả Rating</option>
              {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} Sao</option>)}
            </select>

            <select 
              className="bg-background border border-border rounded-lg px-2 py-1.5 text-[10px] font-bold focus:outline-none max-w-[120px]"
              value={issueFilter || ''}
              onChange={(e) => setIssueFilter(e.target.value || null)}
            >
              <option value="">Tất cả Vấn đề</option>
              {Object.entries(categories).map(([id, cat]) => (
                <option key={id} value={id}>{(cat as any).label}</option>
              ))}
            </select>

            <button 
              onClick={() => setHighPriorityOnly(!highPriorityOnly)}
              className={cn(
                "px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-colors",
                highPriorityOnly ? "bg-accent/10 border-accent text-accent" : "bg-background border-border text-text-muted"
              )}
            >
              Ưu tiên cao
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {filteredFeedbacks.length > 0 ? (
          filteredFeedbacks.map((f, idx) => (
            <FeedbackCard key={`${f.Timestamp}-${idx}`} feedback={f} categories={categories} />
          ))
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
