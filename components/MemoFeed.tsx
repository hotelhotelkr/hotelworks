
import React, { useMemo, useState } from 'react';
import { MessageSquare, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Order, Department } from '../types';

interface MemoFeedProps {
  orders: Order[];
  maxItems?: number;
  onMemoClick?: (order: Order) => void;
}

const MemoFeed: React.FC<MemoFeedProps> = ({ orders, maxItems = 5, onMemoClick }) => {
  // 메모 피드 펼침/접힘 상태를 localStorage에 저장하여 유지
  const [isExpanded, setIsExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem('hotelflow_memo_feed_expanded');
      return saved !== null ? saved === 'true' : true; // 기본값은 true (펼침)
    } catch {
      return true;
    }
  });
  
  const navigate = useNavigate();
  
  // isExpanded 상태가 변경될 때마다 localStorage에 저장
  const handleToggleExpanded = () => {
    const newValue = !isExpanded;
    setIsExpanded(newValue);
    try {
      localStorage.setItem('hotelflow_memo_feed_expanded', String(newValue));
    } catch (e) {
      console.warn('⚠️ 메모 피드 상태 저장 실패:', e);
    }
  };
  // 최신 메모들을 시간순으로 정렬
  const recentMemos = useMemo(() => {
    const allMemos: Array<{ order: Order; memo: any; timestamp: Date }> = [];
    
    orders.forEach(order => {
      if (order.memos && order.memos.length > 0) {
        order.memos.forEach(memo => {
          allMemos.push({
            order,
            memo,
            timestamp: memo.timestamp instanceof Date ? memo.timestamp : new Date(memo.timestamp)
          });
        });
      }
    });
    
    // 최신순으로 정렬
    return allMemos
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, maxItems);
  }, [orders, maxItems]);

  const getDeptColor = (dept: Department) => {
    switch (dept) {
      case Department.FRONT_DESK:
        return 'bg-amber-50 border-amber-200 text-amber-900';
      case Department.HOUSEKEEPING:
        return 'bg-indigo-50 border-indigo-200 text-indigo-900';
      case Department.ADMIN:
        return 'bg-slate-50 border-slate-200 text-slate-900';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-900';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (minutes < 1) return '방금';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  // 모든 메모 가져오기 (히스토리 링크용)
  const allMemosCount = useMemo(() => {
    return orders.reduce((count, order) => count + (order.memos?.length || 0), 0);
  }, [orders]);

  if (recentMemos.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-indigo-600" />
          <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">메모(실시간)</h3>
        </div>
        <div className="text-center py-8 text-slate-400">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-xs font-bold uppercase tracking-widest italic">아직 메모가 없습니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
      <div 
        className="flex items-center gap-2 mb-4 cursor-pointer hover:bg-slate-50 rounded-lg p-2 -mx-2 transition-all"
        onClick={handleToggleExpanded}
      >
        <MessageSquare className="w-5 h-5 text-indigo-600" />
        <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm flex-1">메모(실시간)</h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400">
            최근 {recentMemos.length}개
          </span>
          {allMemosCount > maxItems && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate('/memos');
              }}
              className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-widest px-2 py-1 rounded hover:bg-indigo-50"
            >
              전체 히스토리 ({allMemosCount})
            </button>
          )}
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-100 hover:bg-rose-200 transition-colors shadow-sm">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-rose-700 font-bold" />
            ) : (
              <ChevronDown className="w-5 h-5 text-rose-700 font-bold" />
            )}
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
        {recentMemos.map(({ order, memo, timestamp }) => (
          <div
            key={`${order.id}-${memo.id}`}
            onClick={(e) => {
              // 메모를 클릭해도 메모 피드가 접히지 않도록 상태 유지
              // 메모 피드가 펼쳐져 있으면 그대로 유지
              if (onMemoClick) {
                onMemoClick(order);
              }
            }}
            className={`border rounded-xl p-3 transition-all hover:shadow-md cursor-pointer ${getDeptColor(memo.senderDept)}`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="shrink-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${
                    memo.senderDept === Department.FRONT_DESK ? 'bg-amber-200 text-amber-900' :
                    memo.senderDept === Department.HOUSEKEEPING ? 'bg-indigo-200 text-indigo-900' :
                    'bg-slate-200 text-slate-900'
                  }`}>
                    {memo.senderDept === Department.FRONT_DESK ? 'FD' :
                     memo.senderDept === Department.HOUSEKEEPING ? 'HK' : 'AD'}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-rose-700 font-extrabold text-base">{order.roomNo}호</span>
                    <span className="text-xs font-bold text-slate-600">{memo.senderName}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-500 shrink-0">
                <Clock className="w-3 h-3" />
                <span>{formatTime(timestamp)}</span>
              </div>
            </div>
            <p className="text-sm font-bold text-slate-800 leading-relaxed pl-10">
              {memo.text}
            </p>
          </div>
        ))}
        </div>
      )}
    </div>
  );
};

export default MemoFeed;
