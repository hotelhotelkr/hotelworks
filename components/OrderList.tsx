import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Clock, 
  FileSpreadsheet,
  CheckCircle2,
  MessageSquare,
  XCircle,
  RotateCcw,
  CornerDownRight,
  Info
} from 'lucide-react';
import { Order, OrderStatus, Priority, User, FilterOptions, Department } from '../types';
import { STATUS_COLORS, PRIORITY_COLORS } from '../constants';

interface OrderListProps {
  orders: Order[];
  filters: FilterOptions;
  setFilters: (f: FilterOptions) => void;
  onUpdateStatus: (id: string, status: OrderStatus, note?: string) => void;
  onExport: () => void;
  currentUser: User;
  onOpenMemo: (order: Order) => void;
}

const OrderList: React.FC<OrderListProps> = ({ 
  orders, 
  filters, 
  setFilters, 
  onUpdateStatus, 
  onExport,
  currentUser,
  onOpenMemo
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // 각 주문별 메모 표시 상태를 localStorage에 저장하여 유지
  const [expandedMemos, setExpandedMemos] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('hotelflow_expanded_memos');
      return saved ? new Set(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });
  
  // 메모 표시 상태 토글
  const toggleMemoExpansion = (orderId: string) => {
    setExpandedMemos(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      // localStorage에 저장
      try {
        localStorage.setItem('hotelflow_expanded_memos', JSON.stringify(Array.from(next)));
      } catch (e) {
        console.warn('⚠️ 메모 표시 상태 저장 실패:', e);
      }
      return next;
    });
  };
  
  // 메모 모달을 열 때 해당 주문의 메모를 확장 상태로 설정
  const handleOpenMemo = (order: Order) => {
    setExpandedMemos(prev => {
      const next = new Set(prev);
      next.add(order.id);
      try {
        localStorage.setItem('hotelflow_expanded_memos', JSON.stringify(Array.from(next)));
      } catch (e) {
        console.warn('⚠️ 메모 표시 상태 저장 실패:', e);
      }
      return next;
    });
    onOpenMemo(order);
  };

  // 완료 상태로 변경 시 메모 입력 처리
  const handleCompleteWithNote = (orderId: string) => {
    try {
      const note = prompt("메모 (선택):");
      const finalNote = (note !== null && note.trim()) ? note.trim() : undefined;
      onUpdateStatus(orderId, OrderStatus.COMPLETED, finalNote);
    } catch (error) {
      console.error('Error updating status:', error);
      onUpdateStatus(orderId, OrderStatus.COMPLETED);
    }
  };

  const filteredOrders = useMemo(() => {
    const filtered = orders.filter(order => {
    const matchesStatus = filters.status === 'ALL' || order.status === filters.status;
    const matchesPriority = filters.priority === 'ALL' || order.priority === filters.priority;
    const matchesRoom = !filters.roomNo || order.roomNo.includes(filters.roomNo);
    const matchesSearch = !searchTerm || 
      order.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      order.roomNo.includes(searchTerm) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesPriority && matchesRoom && matchesSearch;
  });
    
    // 최신순으로 정렬 (위에서 아래로: 가장 최근 주문이 위에)
    return filtered.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  }, [orders, filters, searchTerm]);

  const getElapsedTime = (requestedAt: Date) => {
    // 한국 시간 기준으로 경과 시간 계산
    const now = new Date();
    const requested = new Date(requestedAt);
    const diff = Math.floor((now.getTime() - requested.getTime()) / (1000 * 60));
    return `${diff}m`;
  };

  const handleCancelClick = (orderId: string) => {
    if (window.confirm('⚠️ 이 요청을 취소하시겠습니까?\n취소된 오더는 회색으로 변하며 굵은 취소선이 표시됩니다.')) {
      onUpdateStatus(orderId, OrderStatus.CANCELLED);
    }
  };

  const isHKOrAdmin = currentUser.dept === Department.HOUSEKEEPING || currentUser.dept === Department.ADMIN;
  const canUserCancel = currentUser.dept === Department.FRONT_DESK || currentUser.dept === Department.ADMIN;

  return (
    <div className="space-y-4 w-full max-w-full">
      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4 w-full max-w-full">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
          <div className="relative flex-1 max-md:w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search room or item..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <select 
              className="text-sm bg-white border border-slate-200 px-3 py-2.5 sm:py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 min-h-[44px] sm:min-h-0"
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value as any})}
            >
              <option value="ALL">ALL STATUS</option>
              {Object.values(OrderStatus).map(s => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
            <button 
              onClick={onExport}
              className="flex items-center gap-2 text-sm font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-4 py-2.5 sm:py-2 rounded-lg transition-colors border border-emerald-100 min-h-[44px] sm:min-h-0 active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">EXCEL</span>
              <span className="sm:hidden">엑셀</span>
            </button>
          </div>
        </div>
      </div>

      {/* Orders Table - Desktop */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden w-full max-w-full">
        <div className="overflow-x-auto w-full max-w-full" style={{ maxWidth: '100%' }}>
          <table className="w-full text-left border-collapse min-w-[800px] hidden md:table" style={{ maxWidth: '100%' }}>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-sm font-black text-slate-900 uppercase tracking-widest text-center">방번호</th>
                <th className="px-6 py-4 text-sm font-black text-slate-900 uppercase tracking-widest text-center">ITEM & QTY</th>
                <th className="px-6 py-4 text-sm font-black text-slate-900 uppercase tracking-widest text-center">
                  <div className="flex items-center justify-center gap-1.5 group relative">
                    <span>현재 상태</span>
                    <Info className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors cursor-help" />
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block z-10" style={{ maxWidth: 'calc(100vw - 2rem)' }}>
                      <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg" style={{ whiteSpace: 'normal', maxWidth: '100%' }}>
                        "REQUESTED → ACCEPTED → IN_PROGRESS → COMPLETED / CANCELLED"으로 진행됩니다.
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                      </div>
                    </div>
                  </div>
                </th>
                <th className="px-6 py-4 text-sm font-black text-slate-900 uppercase tracking-widest text-center">
                  <div className="flex items-center justify-center gap-1.5 group relative">
                    <span>우선순위</span>
                    <Info className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors cursor-help" />
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block z-10" style={{ maxWidth: 'calc(100vw - 2rem)' }}>
                      <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2.5 shadow-lg" style={{ whiteSpace: 'normal', maxWidth: '100%' }}>
                        <span className="font-bold text-rose-300">NORMAL:</span> 일반 우선순위으로 진행해주세요 | 
                        <span className="font-bold text-rose-300 ml-2">URGENT:</span> 긴급 우선순위 입니다.(긴급건으로 최우선 순위으로 진행해주세요)
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                      </div>
                    </div>
                  </div>
                </th>
                <th className="px-6 py-4 text-sm font-black text-slate-900 uppercase tracking-widest text-center">경과시간</th>
                <th className="px-6 py-4 text-sm font-black text-slate-900 uppercase tracking-widest text-center">
                  <div className="flex items-center justify-center gap-1.5 group relative">
                    <span>ACTIONS</span>
                    <Info className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors cursor-help" />
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block z-10" style={{ maxWidth: 'calc(100vw - 2rem)' }}>
                      <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2.5 shadow-lg" style={{ whiteSpace: 'normal', maxWidth: '100%' }}>
                        <span className="font-bold text-indigo-300">접수:</span> 오더를 수락합니다 (HK) | 
                        <span className="font-bold text-blue-300 ml-2">진행중:</span> 오더를 시작합니다 | 
                        <span className="font-bold text-emerald-300 ml-2">완료:</span> 오더를 완료합니다 (메모 쓰기 가능) | 
                        <span className="font-bold text-slate-300 ml-2">다시 시작:</span> 완료된 오더를 다시합니다 | 
                        <span className="font-bold text-rose-300 ml-2">취소:</span> 오더를 취소합니다 (FD만 가능)
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                      </div>
                    </div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">No orders found.</td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isCancelled = order.status === OrderStatus.CANCELLED;
                  const isCompleted = order.status === OrderStatus.COMPLETED;
                  
                  // 메모 확장 상태 확인: 메모 모달을 열었던 주문은 모든 메모 표시
                  const isMemoExpanded = expandedMemos.has(order.id);
                  const displayMemos = isMemoExpanded 
                    ? order.memos  // 확장된 경우 모든 메모 표시
                    : order.memos.slice(-2);  // 기본적으로 최근 2개만 표시
                  
                  return (
                    <tr 
                      key={order.id} 
                      className={`transition-all duration-300 ${isCancelled ? 'bg-slate-100 grayscale opacity-50' : 'hover:bg-slate-50/50'}`}
                    >
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <p className={`font-black tracking-tighter transition-all flex items-center ${isCancelled ? 'text-slate-400' : ''}`}>
                            <span className={`text-3xl ${isCancelled ? 'text-slate-400 line-through decoration-slate-500 decoration-4 inline-block' : 'text-pink-600'}`}>{order.roomNo}</span>
                            <span className={`text-xl ml-0.5 ${isCancelled ? 'text-slate-400 line-through decoration-slate-500 decoration-4 inline-block' : 'text-slate-950'}`}>호</span>
                          </p>
                          <p className="text-[10px] font-mono font-bold text-slate-400 leading-none mt-1">
                            (#{order.id})
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 min-w-[200px] text-center">
                        <div className="flex flex-col items-center">
                          <p className={`text-sm font-black transition-all ${isCancelled ? 'text-slate-400 line-through decoration-slate-500 decoration-4' : 'text-slate-800'}`}>
                            {order.itemName}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 font-bold uppercase">QTY: <span className="text-indigo-600">{order.quantity}</span></p>
                          
                          {/* Render Latest Memos */}
                          <div className="flex flex-col gap-1.5 mt-2 w-full">
                            {displayMemos.map(memo => (
                              <div key={memo.id} className={`p-2 border rounded-lg text-[10px] flex items-start gap-1.5 ${
                                memo.senderDept === Department.FRONT_DESK 
                                  ? 'bg-amber-50 border-amber-100 text-amber-800' 
                                  : 'bg-indigo-50 border-indigo-100 text-indigo-800'
                              }`}>
                                {memo.senderDept === Department.FRONT_DESK ? <CornerDownRight className="w-3 h-3 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5" />}
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-black text-[8px] uppercase tracking-wider opacity-60">
                                    {memo.senderDept === Department.FRONT_DESK ? 'FD' : 'HK'} • {memo.senderName}
                                  </span>
                                  <span className="font-medium leading-tight truncate max-w-[150px]">{memo.text}</span>
                                </div>
                              </div>
                            ))}
                            {order.memos.length > 2 && !isMemoExpanded && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenMemo(order);
                                }} 
                                className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center hover:text-indigo-600 transition-colors"
                              >
                                + {order.memos.length - 2} more memos
                              </button>
                            )}
                            {isMemoExpanded && order.memos.length > 2 && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleMemoExpansion(order.id);
                                }} 
                                className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center hover:text-indigo-600 transition-colors"
                              >
                                메모 접기
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase border tracking-widest ${STATUS_COLORS[order.status]}`}>
                          {isCompleted && <CheckCircle2 className="w-3 h-3" />}
                          {isCancelled && <XCircle className="w-3 h-3" />}
                          {order.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-[10px] uppercase tracking-[0.2em] ${isCancelled ? 'text-slate-400 line-through font-black' : order.priority === Priority.URGENT ? 'text-rose-700 font-extrabold animate-pulse' : PRIORITY_COLORS[order.priority]}`}>
                          {order.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-center">
                        <div className={`flex items-center justify-center gap-1.5 ${isCancelled ? 'text-slate-400' : 'text-slate-500'}`}>
                          <Clock className="w-3.5 h-3.5" />
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold">
                            {isCancelled ? '--' : getElapsedTime(order.requestedAt)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {!isCancelled && (
                            <>
                              {/* REQUESTED 상태: 접수 버튼 (HK/Admin만) + 완료 버튼 (모든 사용자) */}
                              {order.status === OrderStatus.REQUESTED && (
                                <>
                                  {isHKOrAdmin && (
                                <button 
                                  onClick={() => onUpdateStatus(order.id, OrderStatus.ACCEPTED)}
                                      className="text-[10px] sm:text-xs font-black uppercase tracking-widest bg-indigo-600 text-white px-3 sm:px-4 py-2.5 sm:py-2.5 rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 min-h-[44px] sm:min-h-[36px]"
                                >
                                  접수
                                </button>
                              )}
                                  <button 
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      try {
                                        const note = prompt("메모 (선택):");
                                        const finalNote = (note !== null && note.trim()) ? note.trim() : undefined;
                                        onUpdateStatus(order.id, OrderStatus.COMPLETED, finalNote);
                                      } catch (error) {
                                        onUpdateStatus(order.id, OrderStatus.COMPLETED);
                                      }
                                    }}
                                    className="text-[10px] sm:text-xs font-black uppercase tracking-widest bg-emerald-600 text-white px-3 sm:px-4 py-2.5 sm:py-2.5 rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 min-h-[44px] sm:min-h-[36px]"
                                  >
                                    완료
                                  </button>
                                </>
                              )}
                              
                              {/* ACCEPTED 상태: 출발 버튼 (HK/Admin만) + 완료 버튼 (모든 사용자) */}
                              {order.status === OrderStatus.ACCEPTED && (
                                <>
                                  {isHKOrAdmin && (
                                <button 
                                  onClick={() => onUpdateStatus(order.id, OrderStatus.IN_PROGRESS)}
                                      className="text-[10px] sm:text-xs font-black uppercase tracking-widest bg-amber-500 text-white px-3 sm:px-4 py-2.5 sm:py-2.5 rounded-xl shadow-lg shadow-amber-100 hover:bg-amber-600 transition-all active:scale-95 min-h-[44px] sm:min-h-[36px]"
                                >
                                  출발
                                </button>
                              )}
                                  <button 
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleCompleteWithNote(order.id);
                                    }}
                                    className="text-[10px] sm:text-xs font-black uppercase tracking-widest bg-emerald-600 text-white px-3 sm:px-4 py-2.5 sm:py-2.5 rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 min-h-[44px] sm:min-h-[36px]"
                                  >
                                    완료
                                  </button>
                                </>
                              )}
                              
                              {/* IN_PROGRESS 상태: 완료 버튼 (모든 사용자) */}
                              {order.status === OrderStatus.IN_PROGRESS && (
                                <button 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleCompleteWithNote(order.id);
                                  }}
                                  className="text-[10px] sm:text-xs font-black uppercase tracking-widest bg-emerald-600 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 min-h-[40px] sm:min-h-[36px]"
                                >
                                  완료
                                </button>
                              )}

                              {/* COMPLETED 상태: 다시 시작 버튼 (모든 사용자) */}
                              {order.status === OrderStatus.COMPLETED && (
                                <button 
                                  onClick={() => onUpdateStatus(order.id, OrderStatus.REQUESTED)}
                                  className="text-[10px] sm:text-xs font-black uppercase tracking-widest bg-white text-indigo-600 border border-indigo-200 px-3 sm:px-4 py-2.5 sm:py-2.5 rounded-xl shadow-sm hover:bg-indigo-50 transition-all flex items-center gap-1.5 min-h-[44px] sm:min-h-[36px]"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  다시 시작
                                </button>
                              )}

                              {/* 취소 버튼 (FRONT_DESK, ADMIN만) */}
                              {canUserCancel && !isCompleted && (
                                <button 
                                  onClick={() => handleCancelClick(order.id)}
                                  title="오더 취소"
                                  className="flex items-center justify-center p-2.5 sm:p-2 bg-rose-50 text-rose-500 border border-rose-100 rounded-xl hover:bg-rose-500 hover:text-white transition-all active:scale-90 shadow-sm min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px]"
                                >
                                  <XCircle className="w-5 h-5 sm:w-4 sm:h-4" />
                                </button>
                              )}
                            </>
                          )}

                          {/* CANCELLED 상태: 복구 버튼 (ADMIN만) */}
                          {isCancelled && currentUser.dept === Department.ADMIN && (
                            <button 
                              onClick={() => onUpdateStatus(order.id, OrderStatus.REQUESTED)}
                              className="text-[10px] sm:text-xs font-black uppercase tracking-widest bg-white text-indigo-600 border border-indigo-200 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl shadow-sm hover:bg-indigo-50 transition-all flex items-center gap-1.5 min-h-[40px] sm:min-h-[36px]"
                            >
                              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              복구
                            </button>
                          )}
                          
                          <button 
                            onClick={() => onOpenMemo(order)}
                            className={`flex items-center gap-1.5 text-[10px] sm:text-xs font-black uppercase tracking-widest px-3 sm:px-4 py-2.5 sm:py-2.5 rounded-xl transition-all active:scale-95 border shadow-sm min-h-[44px] sm:min-h-[36px] ${
                              order.memos.length > 0
                                ? 'bg-indigo-100 text-indigo-700 border-indigo-200' 
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <MessageSquare className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                            <span className="hidden sm:inline xl:inline">MEMO ({order.memos.length})</span>
                            <span className="sm:hidden">({order.memos.length})</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredOrders.length === 0 ? (
            <div className="px-4 py-12 text-center text-slate-400 italic">No orders found.</div>
          ) : (
            filteredOrders.map((order) => {
              const isCancelled = order.status === OrderStatus.CANCELLED;
              const isCompleted = order.status === OrderStatus.COMPLETED;
              
              // 메모 확장 상태 확인: 메모 모달을 열었던 주문은 모든 메모 표시
              const isMemoExpanded = expandedMemos.has(order.id);
              const displayMemos = isMemoExpanded 
                ? order.memos  // 확장된 경우 모든 메모 표시
                : order.memos.slice(-2);  // 기본적으로 최근 2개만 표시
              
              return (
                <div 
                  key={order.id} 
                  className={`p-4 transition-all ${isCancelled ? 'bg-slate-100 grayscale opacity-50' : ''}`}
                >
                  {/* Room & ID */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className={`font-black tracking-tighter ${isCancelled ? 'text-slate-400 line-through decoration-slate-500 decoration-4' : ''}`}>
                        <span className={`text-2xl ${isCancelled ? 'text-slate-400' : 'text-pink-600'}`}>{order.roomNo}</span>
                        <span className={`text-lg ml-0.5 ${isCancelled ? 'text-slate-400' : 'text-slate-950'}`}>호</span>
                      </p>
                      <p className="text-[10px] font-mono font-bold text-slate-400 leading-none mt-1">
                        (#{order.id})
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase border tracking-widest ${STATUS_COLORS[order.status]}`}>
                      {isCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {isCancelled && <XCircle className="w-3.5 h-3.5" />}
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Item & Qty */}
                  <div className="mb-3">
                    <p className={`text-base font-black ${isCancelled ? 'text-slate-400 line-through decoration-slate-500 decoration-4' : 'text-slate-800'}`}>
                      {order.itemName}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-slate-500 font-bold uppercase">QTY: <span className="text-indigo-600">{order.quantity}</span></p>
                      <span className={`text-xs uppercase tracking-[0.2em] ${isCancelled ? 'text-slate-400 line-through font-black' : order.priority === Priority.URGENT ? 'text-rose-700 font-extrabold animate-pulse' : PRIORITY_COLORS[order.priority]}`}>
                        {order.priority}
                      </span>
                      <div className={`flex items-center gap-1.5 ${isCancelled ? 'text-slate-400' : 'text-slate-500'}`}>
                        <Clock className="w-3.5 h-3.5" />
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold">
                          {isCancelled ? '--' : getElapsedTime(order.requestedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Memos */}
                  {displayMemos.length > 0 && (
                    <div className="flex flex-col gap-1.5 mb-3">
                      {displayMemos.map(memo => (
                        <div key={memo.id} className={`p-2 border rounded-lg text-[11px] flex items-start gap-1.5 ${
                          memo.senderDept === Department.FRONT_DESK 
                            ? 'bg-amber-50 border-amber-100 text-amber-800' 
                            : 'bg-indigo-50 border-indigo-100 text-indigo-800'
                        }`}>
                          {memo.senderDept === Department.FRONT_DESK ? <CornerDownRight className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                          <div className="flex flex-col gap-0.5">
                            <span className="font-black text-[9px] uppercase tracking-wider opacity-60">
                              {memo.senderDept === Department.FRONT_DESK ? 'FD' : 'HK'} • {memo.senderName}
                            </span>
                            <span className="font-medium leading-tight">{memo.text}</span>
                          </div>
                        </div>
                      ))}
                      {order.memos.length > 2 && (
                        <button onClick={() => onOpenMemo(order)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left hover:text-indigo-600 transition-colors">
                          + {order.memos.length - 2} more memos
                        </button>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {!isCancelled && (
                      <>
                        {order.status === OrderStatus.REQUESTED && (
                          <>
                            {isHKOrAdmin && (
                              <button 
                                onClick={() => onUpdateStatus(order.id, OrderStatus.ACCEPTED)}
                                className="text-xs font-black uppercase tracking-widest bg-indigo-600 text-white px-5 py-3 rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 min-h-[44px]"
                              >
                                접수
                              </button>
                            )}
                            <button 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleCompleteWithNote(order.id);
                              }}
                              className="text-xs font-black uppercase tracking-widest bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 min-h-[44px]"
                            >
                              완료
                            </button>
                          </>
                        )}
                        
                        {order.status === OrderStatus.ACCEPTED && (
                          <>
                            {isHKOrAdmin && (
                              <button 
                                onClick={() => onUpdateStatus(order.id, OrderStatus.IN_PROGRESS)}
                                className="text-xs font-black uppercase tracking-widest bg-amber-500 text-white px-5 py-3 rounded-xl shadow-lg shadow-amber-100 hover:bg-amber-600 transition-all active:scale-95 min-h-[44px]"
                              >
                                출발
                              </button>
                            )}
                            <button 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleCompleteWithNote(order.id);
                              }}
                              className="text-xs font-black uppercase tracking-widest bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 min-h-[44px]"
                            >
                              완료
                            </button>
                          </>
                        )}
                        
                        {order.status === OrderStatus.IN_PROGRESS && (
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleCompleteWithNote(order.id);
                            }}
                            className="text-xs font-black uppercase tracking-widest bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 min-h-[44px]"
                          >
                            완료
                          </button>
                        )}

                        {order.status === OrderStatus.COMPLETED && (
                          <button 
                            onClick={() => onUpdateStatus(order.id, OrderStatus.REQUESTED)}
                            className="text-xs font-black uppercase tracking-widest bg-white text-indigo-600 border border-indigo-200 px-5 py-3 rounded-xl shadow-sm hover:bg-indigo-50 transition-all flex items-center gap-1.5 min-h-[44px]"
                          >
                            <RotateCcw className="w-4 h-4" />
                            다시 시작
                          </button>
                        )}

                        {canUserCancel && !isCompleted && (
                          <button 
                            onClick={() => handleCancelClick(order.id)}
                            title="오더 취소"
                            className="flex items-center justify-center p-3 bg-rose-50 text-rose-500 border border-rose-100 rounded-xl hover:bg-rose-500 hover:text-white transition-all active:scale-90 shadow-sm min-w-[44px] min-h-[44px]"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        )}
                      </>
                    )}

                    {isCancelled && currentUser.dept === Department.ADMIN && (
                      <button 
                        onClick={() => onUpdateStatus(order.id, OrderStatus.REQUESTED)}
                        className="text-xs font-black uppercase tracking-widest bg-white text-indigo-600 border border-indigo-200 px-5 py-3 rounded-xl shadow-sm hover:bg-indigo-50 transition-all flex items-center gap-1.5 min-h-[44px]"
                      >
                        <RotateCcw className="w-4 h-4" />
                        복구
                      </button>
                    )}
                    
                    <button 
                      onClick={() => onOpenMemo(order)}
                      className={`flex items-center gap-1.5 text-xs font-black uppercase tracking-widest px-5 py-3 rounded-xl transition-all active:scale-95 border shadow-sm min-h-[44px] ${
                        order.memos.length > 0
                          ? 'bg-indigo-100 text-indigo-700 border-indigo-200' 
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>MEMO ({order.memos.length})</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderList;