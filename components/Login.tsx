
import React, { useState } from 'react';
import { Building2, Key, User as UserIcon, Lock, AlertCircle } from 'lucide-react';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
  availableUsers: User[];
}

const Login: React.FC<LoginProps> = ({ onLogin, availableUsers }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // 컴포넌트 마운트 시 availableUsers 확인 (디버깅)
  React.useEffect(() => {
    console.log('📋 Login 컴포넌트 마운트:', {
      availableUsersCount: availableUsers.length,
      availableUsers: availableUsers.map(u => ({ 
        username: u.username, 
        name: u.name, 
        dept: u.dept,
        id: u.id 
      }))
    });
  }, [availableUsers]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 입력값 정리 (공백 제거)
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    // 디버깅: availableUsers 확인
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 로그인 시도 시작');
    console.log('   입력한 username:', `"${trimmedUsername}"`, `(길이: ${trimmedUsername.length})`);
    console.log('   입력한 password:', trimmedPassword ? `"***" (길이: ${trimmedPassword.length})` : '(empty)');
    console.log('   availableUsers 개수:', availableUsers.length);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // 각 사용자와 비교 (상세 로그)
    console.log('📋 사용 가능한 사용자 목록:');
    availableUsers.forEach((u, index) => {
      const usernameMatch = u.username.trim() === trimmedUsername;
      const passwordMatch = u.password.trim() === trimmedPassword;
      const matchStatus = usernameMatch && passwordMatch ? '✅' : 
                         usernameMatch ? '⚠️ (password 불일치)' : 
                         '❌';
      
      console.log(`   [${index + 1}] ${matchStatus}`, {
        username: `"${u.username}"` + (u.username !== u.username.trim() ? ' (공백 있음)' : ''),
        password: '***' + (u.password !== u.password.trim() ? ' (공백 있음)' : ''),
        name: u.name,
        usernameMatch,
        passwordMatch
      });
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // username과 password 비교 (공백 제거된 값으로)
    const foundUser = availableUsers.find(
      u => u.username.trim() === trimmedUsername && u.password.trim() === trimmedPassword
    );

    if (foundUser) {
      console.log('✅ 로그인 성공!', {
        name: foundUser.name,
        username: foundUser.username,
        dept: foundUser.dept,
        role: foundUser.role
      });
      onLogin(foundUser);
    } else {
      console.error('❌ 로그인 실패: 사용자를 찾을 수 없음');
      console.error('   최종 입력값:', {
        username: `"${trimmedUsername}"`,
        password: trimmedPassword ? '***' : '(empty)'
      });
      
      // 유사한 username이 있는지 확인
      const similarUsername = availableUsers.find(u => 
        u.username.trim().toLowerCase() === trimmedUsername.toLowerCase()
      );
      if (similarUsername) {
        console.warn('   ⚠️ 비슷한 username 발견:', {
          찾은_username: `"${similarUsername.username}"`,
          입력한_username: `"${trimmedUsername}"`,
          대소문자_차이: similarUsername.username.trim() !== trimmedUsername
        });
      }
      
      setError('Invalid username or password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Left Side: Brand/Welcome */}
        <div className="bg-indigo-600 p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                <Building2 className="w-7 h-7 text-indigo-600" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">HotelWorks</h1>
            </div>
            
            <h2 className="text-4xl font-bold leading-tight mb-4">
              Operational Excellence,<br />Simplified.
            </h2>
            <p className="text-indigo-100 text-lg">
              Authorized access only. Please provide your credentials to enter the operational dashboard.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-4 text-xs font-bold text-indigo-200 uppercase tracking-widest">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            Secure Login Server Online
          </div>
        </div>

        {/* Right Side: Credentials Input */}
        <div className="p-8 lg:p-12 flex flex-col justify-center">
          <div className="mb-10 text-center lg:text-left">
            <h3 className="text-2xl font-bold text-slate-800">Staff Portal</h3>
            <p className="text-slate-500 mt-1">Sign in to manage your tasks</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-center gap-3 text-rose-600 text-sm animate-in fade-in duration-200">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="font-bold tracking-tight">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Username</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  autoFocus
                  required
                  placeholder="Enter your ID"
                  className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full py-4 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98] mt-2 flex items-center justify-center gap-3"
            >
              <Key className="w-5 h-5" />
              Sign In
            </button>
          </form>

          <div className="mt-12 pt-6 border-t border-slate-100">
            <p className="text-[11px] text-center text-slate-400 leading-relaxed">
              If forgot your password or cannot sign in,<br />
              contact the <strong>HotelHotel@kakao.com</strong> or{' '}
              <a 
                href="https://open.kakao.com/o/s7P3BINh" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-700 underline font-semibold transition-colors"
              >
                오픈채팅
              </a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
