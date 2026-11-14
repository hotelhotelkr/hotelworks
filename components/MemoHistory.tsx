
import React, { useMemo, useState } from 'react';
import { MessageSquare, Clock, Search } from 'lucide-react';
import { Order, Memo, Department } from '../types';

interface MemoHistoryProps {
  orders: Order[];
  onOpenMemo: (order: Order) => void;
}

interface MemoEntry {
  order: Order;
  memo: Memo;
  timestamp: Date;
}

// 한 번에 그리는 메모 수 (더 보기 버튼으로 추가 표시)
const PAGE_SIZE = 100;

const getDeptLabel = (dept: Department) =>
  dept === Department.FRONT_DESK ? 'FD' : dept === Department.HOUSEKEEPING ? 'HK' : 'AD';

const getDeptColor = (dept: Department) => {
  switch (dept) {
    case Department.FRONT_DESK:
      return 'bg-amber-50 border-amber-200 text-amber-900';
    case Department.HOUSEKEEPING:
      return 'bg-indigo-50 border-indigo-200 text-indigo-900';
    default:
      return 'bg-slate-50 border-slate-200 text-slate-900';
  }
};

const getDeptBadgeColor = (dept: Department) =>
  dept === Department.FRONT_DESK ? 'bg-amber-200 text-amber-900' :
  dept === Department.HOUSEKEEPING ? 'bg-indigo-200 text-indigo-900' :
  'bg-slate-200 text-slate-900';

const formatDateTime = (date: Date) =>
  date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

const MemoHistory: React.FC<MemoHistoryProps> = ({ orders, onOpenMemo }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // 모든 주문의 메모를 최신순으로 정렬
  const allMemos = useMemo(() => {
    const entries: MemoEntry[] = [];
    orders.forEach(order => {
      (order.memos || []).forEach(memo => {
        entries.push({
          order,
          memo,
          timestamp: memo.timestamp instanceof Date ? memo.timestamp : new Date(memo.timestamp)
        });
      });
    });
    return entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [orders]);

  // 방번호, 메모 내용, 작성자, 아이템으로 검색
  const filteredMemos = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return allMemos;
    return allMemos.filter(({ order, memo }) =>
      String(order.roomNo || '').toLowerCase().includes(term) ||
      String(memo.text || '').toLowerCase().includes(term) ||
      String(memo.senderName || '').toLowerCase().includes(term) ||
      String(order.itemName || '').toLowerCase().includes(term)
    );
  }, [allMemos, searchTerm]);

  const visibleMemos = filteredMemos.slice(0, visibleCount);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
            <h2 className="font-black text-slate-800 uppercase tracking-widest text-sm">Memo History</h2>
            <span className="text-[10px] font-bold text-slate-400">
              {searchTerm.trim() ? `${filteredMemos.length} / ${allMemos.length}개` : `전체 ${allMemos.length}개`}
            </span>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              placeholder="방번호, 메모 내용, 작성자 검색..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {visibleMemos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="text-center py-12 text-slate-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-xs font-bold uppercase tracking-widest italic">
              {allMemos.length === 0 ? '아직 메모가 없습니다' : '검색 결과가 없습니다'}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-3">
          {visibleMemos.map(({ order, memo, timestamp }) => (
            <div
              key={`${order.id}-${memo.id}`}
              onClick={() => onOpenMemo(order)}
              className={`border rounded-xl p-3 transition-all hover:shadow-md cursor-pointer ${getDeptColor(memo.senderDept)}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center font-black text-sm ${getDeptBadgeColor(memo.senderDept)}`}>
                    {getDeptLabel(memo.senderDept)}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="text-rose-700 font-extrabold text-base">{order.roomNo}호</span>
                    <span className="text-xs font-bold text-slate-600">{memo.senderName}</span>
                    <span className="text-[10px] font-bold text-slate-400 truncate">
                      {order.itemName} × {order.quantity}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 shrink-0">
                  <Clock className="w-3 h-3" />
                  <span>{formatDateTime(timestamp)}</span>
                </div>
              </div>
              <p className="text-sm font-bold text-slate-800 leading-relaxed pl-10 break-words">
                {memo.text}
              </p>
            </div>
          ))}

          {filteredMemos.length > visibleCount && (
            <button
              onClick={() => setVisibleCount(count => count + PAGE_SIZE)}
              className="w-full py-3 text-xs font-black text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-xl transition-colors uppercase tracking-widest"
            >
              더 보기 ({filteredMemos.length - visibleCount}개 남음)
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MemoHistory;
