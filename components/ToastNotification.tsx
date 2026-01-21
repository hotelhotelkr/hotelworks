
import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle2, AlertCircle, X, MessageSquare } from 'lucide-react';
import { Department, Toast } from '../types';

interface ToastNotificationProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
  onToastClick?: (orderId: string) => void;  // 알림 클릭 시 해당 주문으로 이동
}

const ToastNotification: React.FC<ToastNotificationProps> = ({ toasts, onRemove, onToastClick }) => {
  // 🚨 최우선 목표: 토스트 알림 보장
  // toasts 배열이 변경될 때마다 로그 출력 (디버깅용)
  React.useEffect(() => {
    if (toasts.length > 0) {
      console.log('🔔 ToastNotification 렌더링:', {
        toastCount: toasts.length,
        latestToast: toasts[0] ? {
          id: toasts[0].id,
          message: toasts[0].message.substring(0, 50),
          type: toasts[0].type
        } : null
      });
    }
  }, [toasts]);
  
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 sm:bottom-6 sm:right-6 sm:left-auto sm:translate-x-0 z-[200] flex flex-col gap-2 sm:gap-3 w-[calc(100vw-2rem)] sm:w-full max-w-[280px] sm:max-w-[350px] pointer-events-none">
      {toasts.length === 0 && (
        <div style={{ display: 'none' }}>
          {/* 디버깅용: toasts가 비어있을 때 확인 */}
        </div>
      )}
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} onToastClick={onToastClick} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void; onToastClick?: (orderId: string) => void }> = ({ toast, onRemove, onToastClick }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success': return <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />;
      case 'memo': return <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" />;
      default: return <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" />;
    }
  };

  const getBgColor = () => {
    if (toast.dept === Department.FRONT_DESK) return 'border-l-amber-500';
    if (toast.dept === Department.HOUSEKEEPING) return 'border-l-indigo-600';
    return 'border-l-slate-400';
  };

  // 메시지에서 아이템 정보 추출
  const extractItemInfo = (message: string) => {
    // "신규 요청: 아이템명" 형식에서 아이템 추출 (예: "501호(#20251226_1) 신규 요청: 생수")
    const requestMatch = message.match(/신규 요청:\s*(.+?)(?:\s*$)/);
    if (requestMatch) return requestMatch[1].trim();
    
    // "주문이 이미 생성되었습니다" 형식에서 아이템 추출 (예: "501호 생수 주문이 이미 생성되었습니다")
    const orderMatch = message.match(/\d+호\s+(.+?)\s+주문이/);
    if (orderMatch) return orderMatch[1].trim();
    
    // "상태 변경" 메시지는 아이템 정보가 없을 수 있음
    return null;
  };

  // 메시지를 2줄로 분리
  const itemInfo = extractItemInfo(toast.message);
  let mainMessage = toast.message;
  
  if (itemInfo) {
    // 아이템 정보가 있으면 메인 메시지에서 아이템 부분 제거
    if (toast.message.includes('신규 요청:')) {
      mainMessage = toast.message.split('신규 요청:')[0] + '신규 요청 : ';
    } else if (toast.message.includes('주문이 이미 생성되었습니다')) {
      const roomMatch = toast.message.match(/(\d+호)/);
      mainMessage = roomMatch ? `${roomMatch[1]} 주문 중복` : toast.message.replace(/\s*주문이 이미 생성되었습니다/, '');
    }
  }

  // 메모 알림인 경우 방 번호와 메모 내용을 더 명확하게 표시
  const isMemoToast = toast.type === 'memo';
  const displayRoomNo = toast.roomNo || (toast.message.match(/(\d+호)/)?.[1] + '호');
  const displayMemoText = toast.memoText || (isMemoToast ? toast.message.split('새 메모:')[1]?.trim() : null);

  const handleClick = () => {
    if (toast.orderId && onToastClick) {
      onToastClick(toast.orderId);
    }
  };

  return (
    <div 
      onClick={handleClick}
      className={`
        pointer-events-auto bg-white border border-slate-200 border-l-4 ${getBgColor()} 
        rounded-xl sm:rounded-2xl shadow-2xl p-3 sm:p-4 flex gap-2 sm:gap-4 transition-all duration-300 transform
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${toast.orderId ? 'cursor-pointer hover:shadow-3xl hover:scale-[1.02] active:scale-[0.98]' : ''}
      `}
    >
      <div className="shrink-0 pt-0.5">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">
            {toast.dept ? toast.dept.replace('_', ' ') : 'System Alert'}
          </span>
          <span className="text-[8px] sm:text-[9px] font-bold text-slate-300 italic shrink-0 ml-2">
            {toast.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
        {isMemoToast && displayRoomNo ? (
          <>
            <p className="text-xs sm:text-sm font-bold text-slate-800 leading-tight mb-1">
              <span className="text-rose-700 font-extrabold text-base sm:text-lg">{displayRoomNo}</span>
              <span className="text-slate-600 ml-2">새 메모</span>
            </p>
            {displayMemoText && (
              <p className="text-sm sm:text-base font-bold text-indigo-700 leading-tight bg-indigo-50 rounded-lg p-2 border border-indigo-100">
                {displayMemoText}
              </p>
            )}
            {toast.orderId && (
              <p className="text-[9px] text-slate-400 mt-1 italic">클릭하여 해당 주문 보기</p>
            )}
          </>
        ) : (
          <>
            <p className="text-xs sm:text-sm font-bold text-slate-800 leading-tight mb-0.5 sm:mb-1">
              {mainMessage.split(/(\d+호)/).map((part, index) => 
                /^\d+호$/.test(part) ? (
                  <span key={index} className="text-rose-700 font-extrabold">{part}</span>
                ) : (
                  part
                )
              )}
            </p>
            {itemInfo && (
              <p className="text-sm sm:text-base font-extrabold text-rose-700 leading-tight">
                {itemInfo}
              </p>
            )}
          </>
        )}
      </div>
      <button 
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onRemove(toast.id), 300);
        }}
        className="shrink-0 p-1 hover:bg-slate-100 rounded-lg transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center"
      >
        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300" />
      </button>
    </div>
  );
};

export default ToastNotification;
