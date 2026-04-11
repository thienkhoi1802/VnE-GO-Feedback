import React, { useMemo } from 'react';
import { ISSUE_CATEGORIES } from '../types';
import { cn } from '../lib/utils';

interface IssueHeatmapProps {
  data: Record<string, Record<string, number>>;
  weeks: string[];
  categories?: Record<string, any>;
}

export const IssueHeatmap: React.FC<IssueHeatmapProps> = ({ data, weeks, categories: propCategories = ISSUE_CATEGORIES }) => {
  const categories = Object.keys(propCategories);
  
  const maxValue = useMemo(() => {
    let max = 0;
    Object.values(data).forEach(weekData => {
      Object.values(weekData).forEach(val => {
        if (val > max) max = val;
      });
    });
    return max || 1;
  }, [data]);

  const getHeatColor = (value: number) => {
    if (value === 0) return '#1A1D27';
    const ratio = value / maxValue;
    // Gradient from #1A1D27 to #FF3B5B
    // #1A1D27 = rgb(26, 29, 39)
    // #FF3B5B = rgb(255, 59, 91)
    const r = Math.round(26 + (255 - 26) * ratio);
    const g = Math.round(29 + (59 - 29) * ratio);
    const b = Math.round(39 + (91 - 39) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div className="bg-card border border-border p-6 rounded-xl mb-6 overflow-hidden">
      <h3 className="text-lg font-bold mb-6">Issue Heatmap (Category × Week)</h3>
      <div className="overflow-x-auto custom-scrollbar">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-[200px_repeat(auto-fill,minmax(40px,1fr))] gap-1">
            <div className="h-8"></div>
            {weeks.map(week => (
              <div key={week} className="text-[10px] text-text-muted font-mono text-center rotate-45 origin-bottom-left h-8">
                {week.split('-')[1]}
              </div>
            ))}

            {categories.map(catId => (
              <React.Fragment key={catId}>
                <div className="text-xs font-medium text-text-muted truncate pr-2 flex items-center h-8">
                  <span className="mr-2">{propCategories[catId]?.icon || '❓'}</span>
                  {propCategories[catId]?.label || catId}
                </div>
                {weeks.map(week => {
                  const value = data[catId]?.[week] || 0;
                  return (
                    <div 
                      key={`${catId}-${week}`}
                      className="h-8 rounded-sm transition-all hover:ring-1 hover:ring-white/50 group relative"
                      style={{ backgroundColor: getHeatColor(value) }}
                    >
                      {value > 0 && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-background border border-border rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
                          {week}: {value} feedback
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-6 flex items-center gap-4">
        <div className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Intensity</div>
        <div className="flex gap-1">
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio) => (
            <div 
              key={ratio} 
              className="w-8 h-2 rounded-sm" 
              style={{ backgroundColor: getHeatColor(ratio * maxValue) }}
            />
          ))}
        </div>
        <div className="text-[10px] text-text-muted">0 — {maxValue}</div>
      </div>
    </div>
  );
};
