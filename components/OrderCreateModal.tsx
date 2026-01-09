import React, { useState } from 'react';
import { X, MapPin, Package } from 'lucide-react';
import { Priority, Order } from '../types';
import { CATEGORIES, AMENITY_ITEMS } from '../constants';

interface OrderCreateModalProps {
  onClose: () => void;
  onSubmit: (data: Partial<Order>) => void;
}

const OrderCreateModal: React.FC<OrderCreateModalProps> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    roomNo: '',
    category: 'Amenities',
    itemName: AMENITY_ITEMS[0],
    quantity: 1,
    priority: Priority.NORMAL,
    requestChannel: 'Phone',
    requestNote: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.roomNo || !formData.itemName) return;
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
        onClick={onClose}
      ></div>
      
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">Create New Request</h2>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-slate-200 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Room Number</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  autoFocus
                  required
                  type="text" 
                  placeholder="e.g. 1205"
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                  value={formData.roomNo}
                  onChange={e => setFormData({...formData, roomNo: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Category</label>
              <select 
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Priority</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, priority: Priority.NORMAL})}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${formData.priority === Priority.NORMAL ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, priority: Priority.URGENT})}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${formData.priority === Priority.URGENT ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                >
                  Urgent
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Request Item</label>
            <div className="grid grid-cols-2 gap-2">
              <select 
                className="col-span-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.itemName}
                onChange={e => setFormData({...formData, itemName: e.target.value})}
              >
                {AMENITY_ITEMS.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
              <input 
                type="number" 
                min="1"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.quantity}
                onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 1})}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Internal Notes</label>
            <textarea 
              rows={3}
              placeholder="Any specific instructions (e.g. Leave at door, extra ice...)"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all resize-none"
              value={formData.requestNote}
              onChange={e => setFormData({...formData, requestNote: e.target.value})}
            ></textarea>
          </div>

          <div className="pt-2 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="flex-[2] py-4 rounded-xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center gap-3 hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all active:scale-[0.95] ring-4 ring-indigo-500/20"
            >
              HK에 요청하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderCreateModal;