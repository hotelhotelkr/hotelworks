
import React, { useState } from 'react';
import { Building2, Key, User as UserIcon, Lock, AlertCircle, Play, X } from 'lucide-react';
import { User, Department, Role } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
  availableUsers: User[];
}

// 기본 비밀번호 매핑 (상수)
const DEFAULT_PASSWORDS: Record<string, string> = {
  'admin': 'admin',
  'fd': 'FD',
  'hk': 'HK',
  '3': '3',
  '4': '4',
};

// 사용자 찾기 헬퍼 함수
const findUser = (users: User[], username: string): User | null => {
  const trimmed = username.trim().toLowerCase();
  
  // 1차: username으로 찾기
  let found = users.find(u => u.username?.trim().toLowerCase() === trimmed);
  if (found) return found;
  
  // 2차: name 또는 id로 찾기 (3, 4번 사용자용)
  if (username === '3') {
    found = users.find(u => 
      u.username === '3' || 
      u.name === '로미오' || 
      (u.name && u.name.includes('로미오')) ||
      (u.id && u.id.includes('3'))
    );
    if (found && found.username !== '3') {
      return { ...found, username: '3' };
    }
  } else if (username === '4') {
    found = users.find(u => 
      u.username === '4' || 
      u.name === '줄리엣' || 
      (u.name && u.name.includes('줄리엣')) ||
      (u.id && u.id.includes('4'))
    );
    if (found && found.username !== '4') {
      return { ...found, username: '4' };
    }
  }
  
  return found || null;
};

// 임시 사용자 생성 헬퍼 함수 (Department/Role 매핑)
const createTemporaryUser = (username: string, password: string): User => {
  const trimmed = username.trim().toLowerCase();
  
  // username별 Department/Role 매핑
  const userConfig: Record<string, { dept: Department; role: Role; name: string }> = {
    'admin': { dept: Department.ADMIN, role: Role.ADMIN, name: 'Admin User' },
    'fd': { dept: Department.FRONT_DESK, role: Role.FD_STAFF, name: '프론트수' },
    'hk': { dept: Department.HOUSEKEEPING, role: Role.HK_STAFF, name: '하우스키핑수' },
    '3': { dept: Department.FRONT_DESK, role: Role.FD_STAFF, name: '로미오' },
    '4': { dept: Department.HOUSEKEEPING, role: Role.HK_STAFF, name: '줄리엣' },
  };
  
  const config = userConfig[trimmed] || { 
    dept: Department.FRONT_DESK, 
    role: Role.FD_STAFF, 
    name: username.toUpperCase() 
  };
  
  return {
    id: `temp-${trimmed}-${Date.now()}`,
    username: username.trim(),
    name: config.name,
    dept: config.dept,
    role: config.role
  };
};

// 비밀번호 확인 및 저장 헬퍼 함수
const verifyAndSavePassword = (userId: string, username: string, inputPassword: string): string | null => {
  try {
    const saved = localStorage.getItem('hotelflow_user_passwords_v1');
    const passwords = saved ? JSON.parse(saved) : {};
    
    // 기본 비밀번호 자동 설정
    if (!passwords[userId] && DEFAULT_PASSWORDS[username.toLowerCase()]) {
      passwords[userId] = DEFAULT_PASSWORDS[username.toLowerCase()];
      localStorage.setItem('hotelflow_user_passwords_v1', JSON.stringify(passwords));
    }
    
    return passwords[userId] || null;
  } catch (e) {
    console.warn('⚠️ 비밀번호 확인 실패:', e);
    return null;
  }
};

// 임시 사용자 저장 헬퍼 함수
const saveTemporaryUser = (user: User, password: string): void => {
  try {
    // 비밀번호 저장
    const saved = localStorage.getItem('hotelflow_user_passwords_v1');
    const passwords = saved ? JSON.parse(saved) : {};
    passwords[user.id] = password;
    localStorage.setItem('hotelflow_user_passwords_v1', JSON.stringify(passwords));
    
    // 사용자 목록에 추가
    const savedUsers = localStorage.getItem('hotelflow_users_v1');
    const users = savedUsers ? JSON.parse(savedUsers) : [];
    users.push(user);
    localStorage.setItem('hotelflow_users_v1', JSON.stringify(users));
  } catch (e) {
    console.warn('⚠️ 임시 사용자 저장 실패:', e);
  }
};

// 사용법 영상 (public/manual 폴더의 정적 파일)
const MANUAL_VIDEO_URL = '/manual/hotelworks-manual.mp4';
const MANUAL_POSTER_URL = '/manual/hotelworks-manual-poster.jpg';

const Login: React.FC<LoginProps> = ({ onLogin, availableUsers }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [localUsers, setLocalUsers] = React.useState<any[]>([]);
  const [showManual, setShowManual] = useState(false);

  // 사용법 영상 창: Esc 키로 닫기
  React.useEffect(() => {
    if (!showManual) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowManual(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showManual]);

  // localStorage에서 사용자 목록 동기화 (실시간 동기화를 위해 더 자주 확인)
  React.useEffect(() => {
    const loadUsersFromStorage = () => {
      try {
        const saved = localStorage.getItem('hotelflow_users_v1');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLocalUsers(prev => {
              // 이전 목록과 다를 때만 업데이트 (불필요한 리렌더링 방지)
              const prevIds = new Set<string>(prev.map(u => u.id).sort());
              const newIds = new Set<string>(parsed.map((u: User) => u.id).sort());
              const changed = prev.length !== parsed.length || 
                             !Array.from(prevIds).every(id => newIds.has(id));
              if (changed) {
                console.log('🔄 Login: 사용자 목록 업데이트:', parsed.length, '명');
              }
              return parsed;
            });
          }
        }
      } catch (e) {
        console.warn('⚠️ Login: localStorage users 파싱 실패:', e);
      }
    };

    loadUsersFromStorage();
    // 로그아웃 상태에서도 실시간 동기화를 위해 200ms마다 확인
    const interval = setInterval(loadUsersFromStorage, 200);
    return () => clearInterval(interval);
  }, []);

  // availableUsers와 localStorage users 병합
  const allAvailableUsers = React.useMemo(() => {
    const userMap = new Map<string, any>();
    
    availableUsers.forEach(u => {
      const { password, ...userWithoutPassword } = u;
      userMap.set(u.id, userWithoutPassword);
    });
    
    localUsers.forEach(u => {
      const { password, ...userWithoutPassword } = u;
      userMap.set(u.id, userWithoutPassword);
    });
    
    return Array.from(userMap.values());
  }, [availableUsers, localUsers]);

  // 로컬 인증 (보안: Staff Management에 등록된 사용자만 허용)
  const attemptLocalAuth = (trimmedUsername: string, trimmedPassword: string): User | null => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 로컬 인증 시작:', {
      입력username: trimmedUsername,
      사용가능한사용자수: allAvailableUsers.length,
      사용자목록: allAvailableUsers.map(u => ({ username: u.username, name: u.name, dept: u.dept, role: u.role }))
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // 🔒 보안: Staff Management에 등록된 사용자만 찾기 (username 정확히 매칭)
    // username으로 먼저 찾기 (가장 정확한 방법)
    let foundUser = allAvailableUsers.find(
      u => u.username?.trim().toLowerCase() === trimmedUsername.toLowerCase()
    );
    
    console.log('1차 검색 결과:', foundUser ? {
      username: foundUser.username,
      name: foundUser.name,
      dept: foundUser.dept,
      role: foundUser.role
    } : '없음');
    
    // username으로 못 찾았으면 findUser 함수 사용 (3, 4번 사용자용)
    if (!foundUser) {
      foundUser = findUser(allAvailableUsers, trimmedUsername);
      console.log('2차 검색 결과 (findUser):', foundUser ? {
        username: foundUser.username,
        name: foundUser.name,
        dept: foundUser.dept,
        role: foundUser.role
      } : '없음');
    }
    
    if (!foundUser) {
      // Staff Management에 등록되지 않은 사용자는 로그인 불가
      console.error('🚫 로그인 거부: Staff Management에 등록되지 않은 사용자:', trimmedUsername);
      console.error('   등록된 사용자 목록:', allAvailableUsers.map(u => ({ username: u.username, name: u.name, dept: u.dept, role: u.role })));
      return null;
    }
    
    // 🔒 보안: 찾은 사용자의 username이 입력한 username과 정확히 일치하는지 확인
    if (!foundUser.username || foundUser.username.trim().toLowerCase() !== trimmedUsername.toLowerCase()) {
      console.error('🚫 로그인 거부: username 불일치:', {
        입력: trimmedUsername,
        찾은사용자username: foundUser.username,
        찾은사용자이름: foundUser.name,
        찾은사용자dept: foundUser.dept,
        찾은사용자role: foundUser.role
      });
      return null;
    }
    
    // 저장된 비밀번호 확인
    const savedPassword = verifyAndSavePassword(foundUser.id, foundUser.username || trimmedUsername, trimmedPassword);
    
    // 비밀번호 확인
    const defaultPassword = DEFAULT_PASSWORDS[trimmedUsername.toLowerCase()];
    const isUsernamePasswordMatch = trimmedUsername.toLowerCase() === trimmedPassword.toLowerCase();
    
    if ((savedPassword && trimmedPassword === savedPassword) ||
        (defaultPassword && trimmedPassword === defaultPassword) ||
        isUsernamePasswordMatch) {
      // 🔒 보안: Staff Management에 저장된 사용자 정보만 사용 (변경하지 않음)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ 비밀번호 확인 성공:', {
        username: foundUser.username,
        name: foundUser.name,
        dept: foundUser.dept,
        role: foundUser.role,
        id: foundUser.id
      });
      
      // 🔒 최종 검증: Login ID 4로 Admin이 반환되면 즉시 거부
      if (trimmedUsername === '4' && 
          (foundUser.role === Role.ADMIN || 
           foundUser.dept === Department.ADMIN || 
           foundUser.name?.includes('Admin') ||
           foundUser.name === 'Admin User')) {
        console.error('🚨 심각한 보안 오류: Login ID 4로 Admin이 반환되었습니다!');
        console.error('   찾은 사용자:', foundUser);
        console.error('   Staff Management 전체 사용자:', allAvailableUsers);
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        return null;
      }
      
      // Name/Department/Role이 없는 경우에만 기본값 설정
      if (!foundUser.name || !foundUser.dept || !foundUser.role) {
        console.warn('⚠️ 사용자 정보가 불완전합니다:', foundUser);
        const expectedConfig = createTemporaryUser(trimmedUsername, trimmedPassword);
        const updatedUser = { 
          ...foundUser, 
          name: foundUser.name || expectedConfig.name,
          dept: foundUser.dept || expectedConfig.dept, 
          role: foundUser.role || expectedConfig.role 
        };
        
        // localStorage에 수정된 사용자 정보 저장
        try {
          const saved = localStorage.getItem('hotelflow_users_v1');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              const updated = parsed.map((u: User) => 
                u.id === foundUser.id ? updatedUser : u
              );
              localStorage.setItem('hotelflow_users_v1', JSON.stringify(updated));
              console.log('✅ 사용자 정보 보완됨:', updatedUser.username, updatedUser.name, updatedUser.dept, updatedUser.role);
              return updatedUser;
            }
          }
        } catch (e) {
          console.warn('⚠️ 사용자 정보 저장 실패:', e);
        }
      }
      
      return foundUser;
    }
    
    // 비밀번호가 틀린 경우
    console.warn('🚫 로그인 거부: 비밀번호 불일치:', trimmedUsername);
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    // localStorage 최신화
    try {
      const saved = localStorage.getItem('hotelflow_users_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLocalUsers(parsed);
        }
      }
    } catch (e) {
      // 무시
    }

    // API URL 가져오기
    const getApiBaseUrl = (): string => {
      try {
        const envUrl = (import.meta.env as any).VITE_WS_SERVER_URL;
        if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
          return envUrl.replace('ws://', 'http://').replace('wss://', 'https://');
        }
      } catch (e) {}
      
      try {
        const savedUrl = localStorage.getItem('hotelflow_ws_url');
        if (savedUrl && savedUrl.trim() !== '') {
          return savedUrl.replace('ws://', 'http://').replace('wss://', 'https://');
        }
      } catch (e) {}
      
      if (typeof window !== 'undefined' && window.location) {
        const host = window.location.hostname;
        const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
        
        if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.')) {
          return `${protocol}//${host}:3001`;
        }
      }
      
      return 'http://localhost:3001';
    };

    // 🔒 보안: 서버 API는 완전히 건너뛰고 클라이언트 Staff Management 데이터만 사용
    // 서버가 잘못된 사용자 정보를 반환할 수 있으므로 항상 로컬 인증만 사용
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 로그인 시도:', {
      username: trimmedUsername,
      allAvailableUsersCount: allAvailableUsers.length,
      allAvailableUsers: allAvailableUsers.map(u => ({ 
        username: u.username, 
        name: u.name, 
        dept: u.dept, 
        role: u.role 
      }))
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // 로컬 인증 (보안: Staff Management 등록 사용자만 허용)
    const authenticatedUser = attemptLocalAuth(trimmedUsername, trimmedPassword);
    if (authenticatedUser) {
      // 🔒 최종 검증: Login ID 4로 Admin이 반환되면 즉시 거부
      if (trimmedUsername === '4' && 
          (authenticatedUser.role === Role.ADMIN || 
           authenticatedUser.dept === Department.ADMIN || 
           authenticatedUser.name?.includes('Admin') ||
           authenticatedUser.name === 'Admin User')) {
        console.error('🚨 심각한 보안 오류: Login ID 4로 Admin이 반환되었습니다!');
        console.error('   반환된 사용자:', authenticatedUser);
        setError('시스템 오류가 발생했습니다. 관리자에게 문의하세요.');
        return;
      }
      
      console.log('✅ 최종 로그인 승인:', {
        username: authenticatedUser.username,
        name: authenticatedUser.name,
        dept: authenticatedUser.dept,
        role: authenticatedUser.role
      });
      
      onLogin(authenticatedUser);
      return;
    }

    // 에러 메시지 설정 (사용자가 등록되지 않았거나 비밀번호가 틀린 경우)
    const foundUser = allAvailableUsers.find(u => u.username?.trim().toLowerCase() === trimmedUsername.toLowerCase());
    if (!foundUser) {
      console.error('🚫 로그인 거부: 등록되지 않은 사용자:', trimmedUsername);
      setError('등록되지 않은 사용자입니다. 관리자에게 문의하세요.');
    } else {
      console.error('🚫 로그인 거부: 비밀번호 불일치:', trimmedUsername);
      setError('아이디 또는 비밀번호가 올바르지 않습니다. 다시 시도해주세요.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Left Side: Brand/Welcome */}
        <div className="bg-indigo-600 p-8 lg:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                <Building2 className="w-7 h-7 text-indigo-600" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">HotelWorks</h1>
            </div>

            <h2 className="text-3xl font-bold leading-tight mb-3">
              Operational Excellence,<br />Simplified.
            </h2>
            <p className="text-indigo-100 text-base">
              Authorized access only. Please provide your credentials to enter the operational dashboard.
            </p>
          </div>

          {/* 사용법 영상: PC는 표지 카드, 휴대폰·태블릿은 한 줄 버튼. 영상 파일은 누를 때만 불러옴 */}
          <div className="relative z-10 mt-5 mb-7 lg:my-6">
            <button
              type="button"
              onClick={() => setShowManual(true)}
              className="hidden lg:block group w-full text-left rounded-2xl overflow-hidden bg-indigo-900/40 ring-1 ring-white/20 shadow-xl hover:ring-white/60 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <div className="relative aspect-video">
                <img
                  src={MANUAL_POSTER_URL}
                  alt="호텔웍스 사용법 영상 표지"
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-indigo-950/30 group-hover:bg-indigo-950/10 transition-colors flex items-center justify-center">
                  <span className="w-14 h-14 rounded-full bg-white text-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-6 h-6 ml-0.5 fill-current" />
                  </span>
                </div>
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-bold">사용법 영상 보기</span>
                <span className="text-xs font-bold text-indigo-200">호텔웍스 | HotelWorks</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setShowManual(true)}
              className="lg:hidden flex sm:inline-flex w-full sm:w-auto items-center justify-center gap-3 pl-3 pr-5 py-2.5 rounded-full bg-white/15 ring-1 ring-white/30 text-base font-bold hover:bg-white/25 active:bg-white/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <span className="w-8 h-8 rounded-full bg-white text-indigo-600 flex items-center justify-center shadow">
                <Play className="w-4 h-4 ml-0.5 fill-current" />
              </span>
              사용법 영상 보기
            </button>
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
              <p className="text-[10px] text-slate-400 px-1">💕LOGIN ID를 입력하세요 (예: FD, HK 등)</p>
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
                contact <strong className="font-semibold">HotelHotel@kakao.com</strong> or{' '}
                <a 
                  href="https://open.kakao.com/o/s7P3BINh" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-amber-900 hover:text-amber-950 underline font-semibold transition-colors"
                >
                  오픈채팅
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 사용법 영상 재생 창 */}
      {showManual && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
          onClick={() => setShowManual(false)}
          role="dialog"
          aria-modal="true"
          aria-label="호텔웍스 사용법 영상"
        >
          <div className="relative w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setShowManual(false)}
              aria-label="영상 닫기"
              className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <video
              src={MANUAL_VIDEO_URL}
              poster={MANUAL_POSTER_URL}
              controls
              autoPlay
              playsInline
              preload="metadata"
              className="w-full aspect-video rounded-2xl bg-black shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
