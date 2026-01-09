
import React, { useState, useEffect, useRef } from 'react';
import { X, Send, StickyNote, History, UserCircle, MessageSquare, CornerDownRight, CheckCircle2 } from 'lucide-react';
import { Order, User, Department } from '../types';

interface NoteModalProps {
  order: Order;
  currentUser: User;
  onClose: () => void;
  onSubmit: (text: string) => void;
}

const NoteModal: React.FC<NoteModalProps> = ({ order, currentUser, onClose, onSubmit }) => {
  const [newMemo, setNewMemo] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Auto scroll to bottom when memos update or modal opens
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    inputRef.current?.focus();
  }, [order.memos]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemo.trim()) return;
    onSubmit(newMemo);
    setNewMemo('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      
      <div 
        className="relative w-full max-w-lg h-[80vh] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 z-[110] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2 text-slate-800">
            <StickyNote className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-black tracking-tighter uppercase italic">Memo History</h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-2.5 hover:bg-slate-100 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Order Info Bar */}
        <div className="px-6 py-4 bg-slate-900 flex justify-between items-center shadow-lg shrink-0">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Target Room</p>
            <p className="text-xl font-black text-white italic tracking-tighter">
              {order.roomNo}호 <span className="text-xs text-slate-400 ml-1">(#{order.id})</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Item Detail</p>
            <p className="text-sm font-bold text-indigo-400">{order.itemName} <span className="text-white ml-1">x{order.quantity}</span></p>
          </div>
        </div>

        {/* Continuous Chat History Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50 custom-scrollbar"
        >
          <div className="flex items-center justify-center gap-2 mb-6">
            <History className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">메모 히스토리</span>
          </div>

          {order.memos.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 py-12">
               <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
               <p className="text-xs font-bold uppercase tracking-widest italic">No memos yet.</p>
            </div>
          ) : (
            order.memos.map((memo, idx) => {
              const isMe = memo.senderId === currentUser.id;
              const isFD = memo.senderDept === Department.FRONT_DESK;
              
              return (
                <div 
                  key={memo.id} 
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}
                >
                  <div className={`flex items-center gap-2 mb-1 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <span className={`text-[9px] font-black uppercase tracking-wider ${isFD ? 'text-amber-600' : 'text-indigo-600'}`}>
                      {memo.senderDept === Department.FRONT_DESK ? 'FD' : 'HK'} • {memo.senderName}
                    </span>
                    <span className="text-[8px] font-bold text-slate-400">
                      {new Date(memo.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <div className={`max-w-[85%] p-4 rounded-3xl shadow-sm text-sm font-medium leading-relaxed ${
                    isMe 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : isFD 
                        ? 'bg-amber-100 text-amber-900 border border-amber-200 rounded-tl-none' 
                        : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                  }`}>
                    {memo.text}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input Area (Chat Box) */}
        <div className="p-4 border-t border-slate-100 bg-white shrink-0">
          <form onSubmit={handleSend} className="relative flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                rows={2}
                placeholder="Type a memo or update..."
                className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-400 outline-none transition-all resize-none overflow-hidden"
                value={newMemo}
                onChange={e => setNewMemo(e.target.value)}
                onKeyDown={handleKeyPress}
              />
              <div className="absolute top-2 right-2 p-1 text-[8px] font-black text-slate-300 uppercase tracking-widest hidden sm:block">
                Enter to Send
              </div>
            </div>
            
            <button 
              type="submit"
              disabled={!newMemo.trim()}
              className={`p-4 rounded-2xl flex items-center justify-center transition-all active:scale-90 ${
                !newMemo.trim() 
                  ? 'bg-slate-100 text-slate-400' 
                  : 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700'
              }`}
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          
          <div className="mt-3 flex items-center justify-between px-2">
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-1.5 opacity-60">
                 <UserCircle className="w-3.5 h-3.5 text-slate-400" />
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{currentUser.name}</span>
               </div>
               <div className={`text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest ${
                 currentUser.dept === Department.FRONT_DESK ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
               }`}>
                 {currentUser.dept === Department.HOUSEKEEPING ? 'HOUSE KEEPING' : 'FRONT DESK'}
               </div>
            </div>
            <p className="text-[9px] font-bold text-slate-300 italic">Continuous Recording System v2.0</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoteModal;
