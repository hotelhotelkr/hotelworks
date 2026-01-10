
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Search, Clock, ArrowLeft } from 'lucide-react';
import { Order, Department } from '../types';

interface MemoHistoryProps {
  orders: Order[];
  onOpenMemo: (order: Order) => void;
}

const MemoHistory: React.FC<MemoHistoryProps> = ({ orders, onOpenMemo }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState<Department | 'ALL'>('ALL');

  // 모든 메모를 시간순으로 정렬
  const allMemos = useMemo(() => {
    const memos: Array<{ order: Order; memo: any; timestamp: Date }> = [];
    
    orders.forEach(order => {
      if (order.memos && order.memos.length > 0) {
        order.memos.forEach(memo => {
          memos.push({
            order,
            memo,
            timestamp: memo.timestamp instanceof Date ? memo.timestamp : new Date(memo.timestamp)
          });
        });
      }
    });
    
    // 최신순으로 정렬
    return memos.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [orders]);

  // 필터링된 메모
  const filteredMemos = useMemo(() => {
    return allMemos.filter(({ order, memo }) => {
      const matchesSearch = !searchTerm || 
        order.roomNo.includes(searchTerm) ||
        memo.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        memo.senderName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDept = deptFilter === 'ALL' || memo.senderDept === deptFilter;
      
      return matchesSearch && matchesDept;
    });
  }, [allMemos, searchTerm, deptFilter]);

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
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return formatTime(date);
  };

  return (
    <div className="space-y-6 pb-12 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-100">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase italic leading-tight">
              메모 히스토리
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              전체 메모 내역 ({filteredMemos.length}개)
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="방 번호, 메모 내용, 작성자로 검색..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select 
            className="text-sm bg-white border border-slate-200 px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 min-h-[44px] sm:min-h-0"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value as Department | 'ALL')}
          >
            <option value="ALL">전체 부서</option>
            <option value={Department.FRONT_DESK}>FRONT DESK</option>
            <option value={Department.HOUSEKEEPING}>HOUSEKEEPING</option>
            <option value={Department.ADMIN}>ADMIN</option>
          </select>
        </div>
      </div>

      {/* Memo List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
        {filteredMemos.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-sm font-bold uppercase tracking-widest italic">
              {searchTerm || deptFilter !== 'ALL' ? '검색 결과가 없습니다' : '아직 메모가 없습니다'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMemos.map(({ order, memo, timestamp }) => (
              <div
                key={`${order.id}-${memo.id}`}
                className={`border rounded-xl p-4 transition-all hover:shadow-md cursor-pointer ${getDeptColor(memo.senderDept)}`}
                onClick={() => onOpenMemo(order)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="shrink-0 pt-0.5">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm ${
                        memo.senderDept === Department.FRONT_DESK ? 'bg-amber-200 text-amber-900' :
                        memo.senderDept === Department.HOUSEKEEPING ? 'bg-indigo-200 text-indigo-900' :
                        'bg-slate-200 text-slate-900'
                      }`}>
                        {memo.senderDept === Department.FRONT_DESK ? 'FD' :
                         memo.senderDept === Department.HOUSEKEEPING ? 'HK' : 'AD'}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-rose-700 font-extrabold text-lg">{order.roomNo}호</span>
                        <span className="text-xs font-bold text-slate-600">{memo.senderName}</span>
                        <span className="text-xs font-bold text-slate-400">({memo.senderDept.replace('_', ' ')})</span>
                      </div>
                      <p className="text-sm font-bold text-slate-800 leading-relaxed mb-2">
                        {memo.text}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="font-mono">{order.itemName}</span>
                        {order.category && (
                          <>
                            <span>•</span>
                            <span>{order.category}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <Clock className="w-3 h-3" />
                      <span>{formatRelativeTime(timestamp)}</span>
                    </div>
                    <span className="text-[9px] text-slate-400 font-mono">
                      {formatTime(timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MemoHistory;
