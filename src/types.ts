export interface FeedbackRow {
  Timestamp: string;
  Rating: string;
  Feedback: string;
  Email: string;
  Browser: string;
  'Browser Version': string;
  'User Agent': string;
  OS: string;
  Platform: string;
  'Device Type': string;
  'Screen Resolution': string;
  'Viewport Size': string;
  'Download Speed': string;
  'Latency (ms)': string;
  'Latency Text': string;
  'Page URL': string;
  'Page Title': string;
  'Device Env': string;
  'Page Type': string;
  'IP User': string;
  'UAgent By Server': string;
  fosp_uid: string;
  myvne_user_id: string;
}

export interface ProcessedFeedback extends FeedbackRow {
  _id: string;
  _date: Date;
  _week: string;
  _rating: number;
  _categories: string[];
  _isActionable: boolean;
  _priority: number;
  _latencyBucket: string;
  _deviceInfo: {
    deviceType: string;
    os: string;
    browser: string;
    isMobile: boolean;
  };
}

export interface IssueCategory {
  id?: string;
  label: string;
  icon: string;
  color: string;
  keywords: string[];
}

export const ISSUE_CATEGORIES: Record<string, IssueCategory> = {
  audio_no_sound: {
    label: 'Không có âm thanh',
    icon: '🔇',
    color: '#FF3B5B',
    keywords: ['ko nghe', 'không nghe', 'không có tiếng', 'ko có tiếng', 
               'không có âm', 'mất tiếng', 'tiếng', 'âm thanh', 'audio',
               'nhỏ quá', 'tiếng nhỏ', 'lặp lại', 'lúc có tiếng lúc không']
  },
  video_not_load: {
    label: 'Video không load / đen màn hình',
    icon: '📵',
    color: '#FF6B35',
    keywords: ['không chạy', 'ko chạy', 'không load', 'ko load', 'đen xì', 
               'màn hình đen', 'không xem được', 'ko xem được', 'không phát',
               'lag', 'giật', 'chậm', 'loading', 'lỗi']
  },
  autoplay_issue: {
    label: 'Autoplay / Tự chuyển bài',
    icon: '⏭️',
    color: '#FF8C42',
    keywords: ['autoplay', 'tự chuyển', 'tự động', 'không tắt được', 
               'chẳng thể tắt', 'tự phát', 'chuyển bài']
  },
  dark_mode: {
    label: 'Giao diện tối / Dark mode',
    icon: '🌑',
    color: '#9B59B6',
    keywords: ['nền tối', 'dark mode', 'giao diện tối', 'màu tối', 
               'nền đen', 'tối', 'sáng/tối', 'dark']
  },
  navigation: {
    label: 'Điều hướng & Tương tác',
    icon: '🧭',
    color: '#3498DB',
    keywords: ['về home', 'quay lại', 'không có nút', 'khó điều hướng',
               'navigation', 'back', 'lạc', 'lúng túng', 'không liền mạch',
               'thoát', 'bất tiện', 'cuộn', 'vuốt', 'scroll', 'trượt', 'chạm', 'bấm']
  },
  podcast_ux: {
    label: 'Podcast UX',
    icon: '🎙️',
    color: '#1ABC9C',
    keywords: ['podcast', 'điểm tin', 'không có nút next', 'tắt màn hình',
               'nghe hay bị dừng', 'ngắt giữa chừng', 'giọng đọc', 
               'nhạc nền', 'bluetooth', 'tắt tiếng', 'poscad']
  },
  subtitle: {
    label: 'Yêu cầu Phụ đề',
    icon: '💬',
    color: '#F39C12',
    keywords: ['phụ đề', 'vietsub', 'subtitles', 'giọng địa phương',
               'khó nghe', 'thông dịch', 'khiếm thính']
  },
  ads: {
    label: 'Quảng cáo',
    icon: '📢',
    color: '#E74C3C',
    keywords: ['quảng cáo', 'quảng cao', 'qc', 'ads', 'che nội dung',
               'phiền', 'bớt quảng cáo', 'chặn quảng cáo']
  },
  video_frame_small: {
    label: 'Khung hình nhỏ / Desktop UX',
    icon: '🖥️',
    color: '#2ECC71',
    keywords: ['khung hình', 'màn hình nhỏ', 'video nhỏ', 'desktop', 
               'máy tính', 'full màn hình', 'full screen', 'rộng hơn']
  },
  search: {
    label: 'Tìm kiếm',
    icon: '🔍',
    color: '#00BCD4',
    keywords: ['tìm kiếm', 'search', 'không tìm', 'tìm không thấy']
  },
  feature_request: {
    label: 'Feature Request',
    icon: '✨',
    color: '#8BC34A',
    keywords: ['thêm tính năng', 'nên có', 'cần thêm', 'đề xuất', 'tua', 
               'rewind', 'tua lại', 'tua đến', 'ugc', 'sáng tạo nội dung',
               'livestream', 'bình luận', 'comment']
  },
  general_ux: {
    label: 'Trải nghiệm chung / Giao diện',
    icon: '📱',
    color: '#95A5A6',
    keywords: ['giao diện', 'app', 'ứng dụng', 'trải nghiệm', 'dễ dùng', 'khó dùng', 'đẹp', 'xấu', 'màu sắc', 'font', 'chữ']
  },
  positive: {
    label: 'Phản hồi tích cực',
    icon: '👍',
    color: '#4CAF50',
    keywords: ['tốt', 'hay', 'xuất sắc', 'tuyệt vời', 'rất tốt', 'ok', 
               'good', 'ổn', 'hài lòng', 'ưng ý', 'quá đã', 'đỉnh', 'mượt', 'nhanh']
  }
};
