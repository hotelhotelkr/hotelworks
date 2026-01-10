
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
  const [localUsers, setLocalUsers] = React.useState<any[]>([]);

  // 모바일에서도 최신 users를 확인하기 위해 localStorage 직접 읽기
  React.useEffect(() => {
    const loadUsersFromStorage = () => {
      try {
        const saved = localStorage.getItem('hotelflow_users_v1');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setLocalUsers(parsed);
              console.log('📱 Login: localStorage에서 users 로드', {
                count: parsed.length,
                users: parsed.map((u: any) => ({ username: u.username, name: u.name }))
              });
            }
          } catch (e) {
            console.warn('⚠️ Login: localStorage users 파싱 실패:', e);
          }
        }
      } catch (e) {
        console.warn('⚠️ Login: localStorage 접근 실패:', e);
      }
    };

    // 즉시 한 번 로드
    loadUsersFromStorage();

    // 0.5초마다 확인 (모바일에서 빠른 동기화)
    const interval = setInterval(loadUsersFromStorage, 500);

    return () => clearInterval(interval);
  }, []);

  // availableUsers와 localStorage users 병합 (최신 데이터 우선)
  // 🔒 보안: 비밀번호 필드는 제외하고 병합
  const allAvailableUsers = React.useMemo(() => {
    const userMap = new Map<string, any>();
    
    // 먼저 availableUsers 추가 (비밀번호 제외)
    availableUsers.forEach(u => {
      const { password, ...userWithoutPassword } = u;
      userMap.set(u.id, userWithoutPassword);
    });
    
    // localStorage users 추가/업데이트 (더 최신일 수 있음, 비밀번호 제외)
    localUsers.forEach(u => {
      const { password, ...userWithoutPassword } = u;
      userMap.set(u.id, userWithoutPassword);
    });
    
    return Array.from(userMap.values());
  }, [availableUsers, localUsers]);

  // 컴포넌트 마운트 시 availableUsers 확인 (디버깅)
  React.useEffect(() => {
    console.log('📋 Login 컴포넌트 마운트:', {
      availableUsersCount: availableUsers.length,
      localUsersCount: localUsers.length,
      mergedUsersCount: allAvailableUsers.length,
      allUsers: allAvailableUsers.map(u => ({ 
        username: u.username, 
        name: u.name, 
        dept: u.dept,
        id: u.id 
      }))
    });
  }, [availableUsers, localUsers, allAvailableUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 입력값 정리 (공백 제거)
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    // 로그인 시도 전에 localStorage에서 최신 users 확인
    try {
      const saved = localStorage.getItem('hotelflow_users_v1');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLocalUsers(parsed);
            console.log('🔄 로그인 시도 전 localStorage 확인:', parsed.length, '명');
          }
        } catch (e) {
          console.warn('⚠️ localStorage 파싱 실패:', e);
        }
      }
    } catch (e) {
      console.warn('⚠️ localStorage 접근 실패:', e);
    }

    // 디버깅: availableUsers 확인
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 로그인 시도 시작');
    console.log('   입력한 username:', `"${trimmedUsername}"`, `(길이: ${trimmedUsername.length})`);
    console.log('   입력한 password:', trimmedPassword ? `"***" (길이: ${trimmedPassword.length})` : '(empty)');
    console.log('   availableUsers 개수:', availableUsers.length);
    console.log('   localUsers 개수:', localUsers.length);
    console.log('   병합된 사용자 개수:', allAvailableUsers.length);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // 🔒 보안: 서버 API를 통한 인증 (비밀번호는 서버에서만 검증)
    // 클라이언트에는 비밀번호가 없으므로 서버 API 호출 필요
    const getApiBaseUrl = (): string => {
      // WebSocket URL에서 HTTP API URL 추출
      try {
        const envUrl = (import.meta.env as any).VITE_WS_SERVER_URL;
        if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
          // ws:// 또는 wss://를 http:// 또는 https://로 변환
          return envUrl.replace('ws://', 'http://').replace('wss://', 'https://');
        }
      } catch (e) {}
      
      // localStorage에서 WebSocket URL 가져오기
      try {
        const savedUrl = localStorage.getItem('hotelflow_ws_url');
        if (savedUrl && savedUrl.trim() !== '') {
          return savedUrl.replace('ws://', 'http://').replace('wss://', 'https://');
        }
      } catch (e) {}
      
      // 로컬 환경 감지
      if (typeof window !== 'undefined' && window.location) {
        const host = window.location.hostname;
        const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
        
        if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.')) {
          return `${protocol}//${host}:3001`;
        }
      }
      
      // 기본값
      return 'http://localhost:3001';
    };
    
    // 서버 API를 통한 로그인 시도
    const apiBaseUrl = getApiBaseUrl();
    const loginApiUrl = `${apiBaseUrl}/api/login`;
    
    console.log('🔒 서버 API를 통한 로그인 시도:', loginApiUrl);
    
    // 🔒 비동기 함수 내에서 await 사용
    try {
      const response = await fetch(loginApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: trimmedUsername,
          password: trimmedPassword,
        }),
      });
      
      if (response.ok) {
        const userData = await response.json();
        console.log('✅ 서버 인증 성공:', userData);
        
        // username으로 사용자 정보 찾기 (비밀번호 제외)
        const foundUser = allAvailableUsers.find(
          u => u.username?.trim().toLowerCase() === trimmedUsername.toLowerCase()
        );
        
        if (foundUser) {
          // 서버에서 받은 사용자 정보로 로그인
          const authenticatedUser = {
            ...foundUser,
            id: userData.id || foundUser.id,
            name: userData.name || foundUser.name,
            dept: userData.dept || foundUser.dept,
            role: userData.role || foundUser.role,
          };
          
          console.log('✅ 로그인 성공!', authenticatedUser);
          onLogin(authenticatedUser);
          return;
        } else {
          // 서버 인증은 성공했지만 클라이언트에 사용자 정보가 없는 경우
          console.warn('⚠️ 서버 인증 성공, 하지만 클라이언트에 사용자 정보 없음');
          const authenticatedUser = {
            id: userData.id,
            username: userData.username,
            name: userData.name,
            dept: userData.dept,
            role: userData.role,
          };
          onLogin(authenticatedUser as any);
          return;
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ 서버 인증 실패:', response.status, errorData);
        setError('Invalid username or password. Please try again.');
        return;
      }
    } catch (error) {
      console.error('❌ 서버 API 호출 실패:', error);
      console.warn('⚠️ 서버 API 호출 실패, 로컬 사용자 정보로 대체 인증 시도...');
      
      // 서버 API 호출 실패 시 로컬 인증으로 대체 (하위 호환성)
      // ⚠️ 주의: 이는 임시 방편이며, 비밀번호는 클라이언트에 없으므로 username만 확인
      const foundUser = allAvailableUsers.find(
        u => u.username?.trim().toLowerCase() === trimmedUsername.toLowerCase()
      );
      
      if (foundUser && trimmedPassword) {
        // 비밀번호가 있으면 서버 API 재시도 필요
        console.warn('⚠️ 로컬 인증: 비밀번호 검증은 서버에서만 가능');
        setError('Unable to verify credentials. Please check your connection and try again.');
        return;
      }
      
      setError('Unable to connect to server. Please check your connection and try again.');
      return;
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
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Username (LOGIN ID)</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  autoFocus
                  required
                  placeholder="LOGIN ID (e.g. FD, HK)"
                  className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <p className="text-[10px] text-slate-400 px-1">⚠️ 이름이 아닌 LOGIN ID를 입력하세요 (예: FD, HK)</p>
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
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <p className="text-[11px] text-amber-700 leading-relaxed text-center">
                If forgot your password or cannot sign in,<br />
                contact the <strong className="font-semibold">HotelHotel@kakao.com</strong> or{' '}
                <a 
                  href="https://open.kakao.com/o/s7P3BINh" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-amber-900 hover:text-amber-950 underline font-semibold transition-colors"
                >
                  오픈채팅
                </a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
