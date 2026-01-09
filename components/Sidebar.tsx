
import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Settings, 
  Users, 
  X,
  LogOut,
  Building2
} from 'lucide-react';
import { User, Department, Role } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, currentUser, onLogout }) => {
  const navItems = [
    { name: 'Control Center', icon: LayoutDashboard, path: '/', end: true },
    { name: 'Order Logs', icon: ClipboardList, path: '/orders' },
    { 
      name: 'Staff Directory', 
      icon: Users, 
      path: '/staff', 
      hidden: currentUser.role !== Role.ADMIN 
    },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        ></div>
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 w-64 bg-white border-r border-slate-200 z-50 transform transition-transform duration-300 ease-in-out max-w-full overflow-hidden
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-100">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="font-black text-slate-800 text-lg tracking-tighter uppercase italic">HotelWorks</span>
            </div>
            <button onClick={onClose} className="lg:hidden p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95 transition-all">
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-6 px-4 space-y-2">
            {navItems.filter(item => !item.hidden).map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={() => onClose()}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all
                  ${isActive 
                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' 
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}
                `}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* Bottom Actions */}
          <div className="p-4 border-t border-slate-100">
            <div className="mb-4 px-4 py-3 bg-slate-50 rounded-2xl">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Active Duty</p>
               <p className="text-xs font-bold text-slate-700">{currentUser.name}</p>
            </div>
            <button 
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 transition-all active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              End Shift
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
