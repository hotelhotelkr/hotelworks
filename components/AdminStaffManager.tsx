
import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit2, 
  Trash2, 
  ShieldCheck, 
  Key, 
  X,
  Save,
  User as UserIcon
} from 'lucide-react';
import { User, Role, Department } from '../types';

interface AdminStaffManagerProps {
  users: User[];
  currentUser: User;
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
}

const AdminStaffManager: React.FC<AdminStaffManagerProps> = ({ users, currentUser, onAddUser, onUpdateUser, onDeleteUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    username: '',
    password: '',
    dept: Department.FRONT_DESK,
    role: Role.FD_STAFF
  });

  const getRoleLabel = (role: Role) => {
    switch(role) {
      case Role.FD_STAFF: return 'FD직원';
      case Role.HK_STAFF: return 'HK직원';
      case Role.ADMIN: return 'ADMIN';
      default: return role;
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.dept.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData(user);
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        username: '',
        password: '',
        dept: Department.FRONT_DESK,
        role: Role.FD_STAFF
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      onUpdateUser({ ...editingUser, ...formData } as User);
    } else {
      onAddUser({
        ...formData,
        id: `u-${Date.now()}`
      } as User);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (userId: string) => {
    if (userId === currentUser.id) {
      alert('본인 계정은 삭제할 수 없습니다. 시스템 접근 권한이 상실될 위험이 있습니다.');
      return;
    }

    if (window.confirm('정말 이 직원을 삭제하시겠습니까? 삭제 즉시 시스템 접속이 차단됩니다.')) {
      onDeleteUser(userId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-100">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase italic">Staff Management</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Employee Directory & Credentials</p>
          </div>
        </div>
        <button 
          type="button"
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          Register New Staff
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full max-md:max-w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search staff by name, ID or department..."
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Employee</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Login ID</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Department</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">System Role</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map(user => {
                const isMe = user.id === currentUser.id;
                return (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 font-black text-sm uppercase">
                          {user.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-800">{user.name}</span>
                          {isMe && <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">Current Session (Me)</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Key className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-sm font-mono text-slate-950 font-bold">{user.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                        {user.dept.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-slate-500">{getRoleLabel(user.role)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          type="button"
                          onClick={() => handleOpenModal(user)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="정보 수정"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(user.id);
                          }}
                          disabled={isMe}
                          className={`p-2 rounded-lg transition-all min-w-[40px] min-h-[40px] flex items-center justify-center ${isMe ? 'text-slate-200 cursor-not-allowed opacity-30' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'}`}
                          title={isMe ? "본인 계정은 삭제 불가" : "직원 삭제"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-indigo-600" />
                {editingUser ? 'Edit Staff Profile' : 'Register New Staff'}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-2.5 hover:bg-slate-200 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95 transition-all">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Full Name</label>
                <input 
                  type="text" required placeholder="e.g. Michael Scott"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Login ID</label>
                  <input 
                    type="text" required placeholder="m_scott"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Password</label>
                  <input 
                    type="password" required placeholder="••••••••"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Department</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.dept} onChange={e => setFormData({...formData, dept: e.target.value as Department})}
                  >
                    {Object.values(Department).map(d => <option key={d} value={d}>{d.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">System Role</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as Role})}
                  >
                    {Object.values(Role).map(r => (
                      <option key={r} value={r}>{getRoleLabel(r)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 font-bold text-slate-500 border rounded-xl hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-[2] py-3 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-indigo-700 flex items-center justify-center gap-2 transition-all active:scale-95">
                  <Save className="w-4 h-4" />
                  {editingUser ? 'Update Profile' : 'Save Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStaffManager;
