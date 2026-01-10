import React, { useState, useEffect, useRef } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Trash2, 
  RefreshCw, 
  Database, 
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Settings as SettingsIcon,
  Server,
  HardDrive,
  MessageSquare,
  Code,
  Zap,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { User, Department, Role } from '../types';

interface SettingsProps {
  currentUser: User;
  socketRef: React.RefObject<any>;
  isConnected: boolean;
  onOrdersReset: () => void;
  onNotificationsReset: () => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  currentUser, 
  socketRef, 
  isConnected,
  onOrdersReset,
  onNotificationsReset
}) => {
  const [wsUrl, setWsUrl] = useState('');
  const [connectionTestResult, setConnectionTestResult] = useState<{
    status: 'idle' | 'testing' | 'success' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });
  
  const [localStorageSize, setLocalStorageSize] = useState(0);
  const [offlineQueueSize, setOfflineQueueSize] = useState(0);
  const [pendingMessagesSize, setPendingMessagesSize] = useState(0);
  const [debugLogging, setDebugLogging] = useState(() => {
    try {
      return localStorage.getItem('hotelflow_debug_logging') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [wsMessageLogging, setWsMessageLogging] = useState(() => {
    try {
      return localStorage.getItem('hotelflow_ws_message_logging') === 'true';
    } catch (e) {
      return false;
    }
  });

  // 관리자 권한 체크
  const isAdmin = currentUser.dept === Department.ADMIN || currentUser.role === Role.ADMIN;
  
  // 암호 관련 상태
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [currentPasswordSection, setCurrentPasswordSection] = useState<'debug' | 'ws' | null>(null);
  const [debugLoggingUnlocked, setDebugLoggingUnlocked] = useState(() => {
    try {
      return localStorage.getItem('hotelflow_debug_logging_unlocked') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [wsLoggingUnlocked, setWsLoggingUnlocked] = useState(() => {
    try {
      return localStorage.getItem('hotelflow_ws_logging_unlocked') === 'true';
    } catch (e) {
      return false;
    }
  });

  const ADMIN_PASSWORD = '82@82';

  // 암호 확인 함수
  const verifyPassword = () => {
    if (!currentPasswordSection) return;
    
    if (passwordInput === ADMIN_PASSWORD) {
      if (currentPasswordSection === 'debug') {
        setDebugLoggingUnlocked(true);
        localStorage.setItem('hotelflow_debug_logging_unlocked', 'true');
      } else {
        setWsLoggingUnlocked(true);
        localStorage.setItem('hotelflow_ws_logging_unlocked', 'true');
      }
      setShowPasswordModal(false);
      setPasswordInput('');
      setPasswordError('');
      setCurrentPasswordSection(null);
    } else {
      setPasswordError('❌ 암호가 올바르지 않습니다.');
      setPasswordInput('');
    }
  };

  // 암호 모달 열기
  const openPasswordModal = (section: 'debug' | 'ws') => {
    if (isAdmin) {
      // 관리자는 바로 접근 가능
      if (section === 'debug') {
        setDebugLoggingUnlocked(true);
        localStorage.setItem('hotelflow_debug_logging_unlocked', 'true');
      } else {
        setWsLoggingUnlocked(true);
        localStorage.setItem('hotelflow_ws_logging_unlocked', 'true');
      }
    } else {
      // 일반 사용자는 암호 입력 필요
      setCurrentPasswordSection(section);
      setShowPasswordModal(true);
      setPasswordError('');
      setPasswordInput('');
    }
  };

  // localStorage 크기 계산
  const calculateStorageSize = () => {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return total;
  };

  // 오프라인 큐 크기 계산
  const getOfflineQueueSize = () => {
    try {
      const saved = localStorage.getItem('hotelflow_offline_queue');
      if (saved) {
        const queue = JSON.parse(saved);
        return Array.isArray(queue) ? queue.length : 0;
      }
    } catch (e) {
      return 0;
    }
    return 0;
  };

  // 임시 메시지 크기 계산
  const getPendingMessagesSize = () => {
    try {
      const saved = localStorage.getItem('hotelflow_pending_messages');
      if (saved) {
        const messages = JSON.parse(saved);
        return Array.isArray(messages) ? messages.length : 0;
      }
    } catch (e) {
      return 0;
    }
    return 0;
  };

  // currentUser 변경 시 잠금 상태 동기화 (로그아웃 후 재로그인 시 localStorage 확인)
  useEffect(() => {
    try {
      const debugUnlocked = localStorage.getItem('hotelflow_debug_logging_unlocked') === 'true';
      const wsUnlocked = localStorage.getItem('hotelflow_ws_logging_unlocked') === 'true';
      
      // 관리자는 항상 잠금 해제, 일반 사용자는 localStorage 상태 확인
      if (isAdmin) {
        setDebugLoggingUnlocked(true);
        setWsLoggingUnlocked(true);
      } else {
        // 일반 사용자: localStorage에 잠금 해제 상태가 없으면 잠금 상태
        setDebugLoggingUnlocked(debugUnlocked);
        setWsLoggingUnlocked(wsUnlocked);
      }
    } catch (e) {
      console.warn('Failed to sync unlock states:', e);
    }
  }, [currentUser, isAdmin]);

  // 초기화 및 주기적 업데이트
  useEffect(() => {
    const updateInfo = () => {
      setLocalStorageSize(calculateStorageSize());
      setOfflineQueueSize(getOfflineQueueSize());
      setPendingMessagesSize(getPendingMessagesSize());
    };

    updateInfo();
    const interval = setInterval(updateInfo, 2000);
    return () => clearInterval(interval);
  }, []);

  // WebSocket URL 가져오기
  useEffect(() => {
    const getWebSocketURL = (): string => {
      try {
        const envUrl = (import.meta.env as any).VITE_WS_SERVER_URL;
        if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
          return envUrl;
        }
      } catch (e) {}
      
      if (typeof window !== 'undefined' && window.location) {
        const host = window.location.hostname;
        const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
        const port = window.location.port;
        // WebSocket 서버는 항상 3001 포트에서 실행됨
        // 프론트엔드가 3000 포트에서 실행되면 WebSocket은 3001 포트로 연결
        const wsPort = port === '3000' ? '3001' : (port || '3001');
        return `${protocol}//${host}:${wsPort}`;
      }
      
      return 'http://localhost:3001';
    };

    setWsUrl(getWebSocketURL());
  }, []);

  // 연결 테스트
  const testConnection = async () => {
    setConnectionTestResult({ status: 'testing', message: '연결 테스트 중...' });
    
    try {
      // WebSocket URL을 HTTP URL로 변환하고 /health 엔드포인트 추가
      let testUrl = wsUrl || 'http://localhost:3001';
      
      // ws:// 또는 wss://를 http:// 또는 https://로 변환
      testUrl = testUrl.replace('ws://', 'http://').replace('wss://', 'https://');
      
      // /health 엔드포인트 추가
      if (!testUrl.endsWith('/health')) {
        testUrl = testUrl.endsWith('/') ? testUrl + 'health' : testUrl + '/health';
      }
      
      console.log('🔍 연결 테스트 URL:', testUrl);
      
      // CORS 문제를 피하기 위해 일반 fetch 사용
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ 연결 테스트 성공:', data);
        setConnectionTestResult({ 
          status: 'success', 
          message: `연결 성공! 서버 상태: ${data.status || 'ok'}, 연결된 클라이언트: ${data.connectedClients || 0}개` 
        });
      } else {
        console.error('❌ 연결 테스트 실패:', response.status, response.statusText);
        setConnectionTestResult({ 
          status: 'error', 
          message: `연결 실패: 서버가 응답하지 않습니다 (상태 코드: ${response.status})` 
        });
      }
    } catch (error: any) {
      console.error('❌ 연결 테스트 오류:', error);
      setConnectionTestResult({ 
        status: 'error', 
        message: `연결 실패: ${error.message || '서버에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.'}` 
      });
    }
  };

  // WebSocket URL 저장
  const saveWsUrl = () => {
    if (wsUrl.trim()) {
      try {
        localStorage.setItem('hotelflow_ws_url', wsUrl.trim());
        setConnectionTestResult({ 
          status: 'success', 
          message: 'WebSocket URL이 저장되었습니다. 페이지를 새로고침하면 적용됩니다.' 
        });
      } catch (e) {
        setConnectionTestResult({ 
          status: 'error', 
          message: '저장 실패: ' + (e as Error).message 
        });
      }
    }
  };

  // 저장된 WebSocket URL 로드
  useEffect(() => {
    try {
      const saved = localStorage.getItem('hotelflow_ws_url');
      if (saved) {
        setWsUrl(saved);
      }
    } catch (e) {
      // 무시
    }
  }, []);

  // 캐시 정리
  const clearCache = () => {
    if (window.confirm('⚠️ 캐시를 정리하시겠습니까?\n페이지를 새로고침해야 완전히 적용됩니다.')) {
      try {
        // 오프라인 큐와 임시 메시지만 유지하고 나머지 캐시 정리
        const offlineQueue = localStorage.getItem('hotelflow_offline_queue');
        const pendingMessages = localStorage.getItem('hotelflow_pending_messages');
        const wsUrl = localStorage.getItem('hotelflow_ws_url');
        
        localStorage.clear();
        
        if (offlineQueue) localStorage.setItem('hotelflow_offline_queue', offlineQueue);
        if (pendingMessages) localStorage.setItem('hotelflow_pending_messages', pendingMessages);
        if (wsUrl) localStorage.setItem('hotelflow_ws_url', wsUrl);
        
        alert('✅ 캐시가 정리되었습니다. 페이지를 새로고침하세요.');
        window.location.reload();
      } catch (e) {
        alert('❌ 캐시 정리 실패: ' + (e as Error).message);
      }
    }
  };

  // 바이트를 읽기 쉬운 형식으로 변환
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // 고급 설정 표시 상태
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white rounded-[2rem] border border-slate-200 p-6 sm:p-8 shadow-sm">
        <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
          <SettingsIcon className="w-6 h-6 text-indigo-600" />
          Settings
        </h2>

        {/* 1. 연결 설정 (고급 - 숨김) */}
        {showAdvancedSettings && (
          <section className="mb-8">
            <h3 className="text-lg font-black text-slate-700 mb-4 flex items-center gap-2">
              <Server className="w-5 h-5 text-amber-600" />
              1. 연결 설정 (Connection Settings) - 고급
            </h3>
            
            <div className="space-y-4 p-4 bg-amber-50 rounded-xl border-2 border-amber-200">
              <div className="flex items-start gap-2 text-sm text-amber-800 mb-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold mb-1">⚠️ 고급 사용자 전용 설정</p>
                  <p className="text-xs">
                    • 로컬 테스트: 설정 불필요 (자동 연결)<br/>
                    • 다른 기기 연결 시: IP:포트 입력 필요<br/>
                    • 예: http://192.168.0.100:8000
                  </p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">
                  WebSocket 서버 URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={wsUrl}
                    onChange={(e) => setWsUrl(e.target.value)}
                    placeholder="http://localhost:8000"
                    className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <button
                    onClick={saveWsUrl}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors"
                  >
                    저장
                  </button>
                  <button
                    onClick={testConnection}
                    disabled={connectionTestResult.status === 'testing'}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-300 transition-colors disabled:opacity-50"
                  >
                    {connectionTestResult.status === 'testing' ? '테스트 중...' : '연결 테스트'}
                  </button>
                </div>
                {connectionTestResult.message && (
                  <div className={`mt-2 p-3 rounded-lg text-sm flex items-center gap-2 ${
                    connectionTestResult.status === 'success' ? 'bg-emerald-50 text-emerald-700' :
                    connectionTestResult.status === 'error' ? 'bg-rose-50 text-rose-700' :
                    'bg-blue-50 text-blue-700'
                  }`}>
                    {connectionTestResult.status === 'success' && <CheckCircle className="w-4 h-4" />}
                    {connectionTestResult.status === 'error' && <XCircle className="w-4 h-4" />}
                    {connectionTestResult.status === 'testing' && <RefreshCw className="w-4 h-4 animate-spin" />}
                    {connectionTestResult.message}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                <span className="text-sm font-bold text-slate-700">
                  현재 연결 상태: {isConnected ? '✅ 연결됨' : '❌ 연결 안 됨'}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* 2. 연결 상태 (간단 버전) */}
        {!showAdvancedSettings && (
          <section className="mb-8">
            <h3 className="text-lg font-black text-slate-700 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              1. 연결 상태 (Connection Status)
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                  <span className="text-sm font-bold text-slate-700">
                    WebSocket: {isConnected ? '✅ 연결됨' : '❌ 연결 안 됨'}
                  </span>
                </div>
                {!isConnected && (
                  <span className="text-xs text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
                    서버 실행 중인지 확인하세요
                  </span>
                )}
              </div>

              <button
                onClick={() => setShowAdvancedSettings(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
              >
                <Code className="w-4 h-4" />
                고급 설정 표시 (다른 기기 연결 시)
              </button>
            </div>
          </section>
        )}

        {showAdvancedSettings && (
          <div className="mb-8">
            <button
              onClick={() => setShowAdvancedSettings(false)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
            >
              <EyeOff className="w-4 h-4" />
              고급 설정 숨기기
            </button>
          </div>
        )}

        {/* 3. 데이터 관리 */}
        <section className="mb-8">
          <h3 className="text-lg font-black text-slate-700 mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600" />
            3. 데이터 관리 (Data Management)
          </h3>
          
          <div className="space-y-3">
            <button
              onClick={() => {
                if (window.confirm('⚠️ 모든 주문 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다!')) {
                  onOrdersReset();
                  alert('✅ 모든 주문 데이터가 삭제되었습니다.');
                }
              }}
              className="w-full flex items-center gap-3 px-4 py-3 bg-rose-50 text-rose-700 rounded-xl hover:bg-rose-100 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
              <span className="font-bold">모든 주문 데이터 초기화</span>
            </button>

            <button
              onClick={() => {
                if (window.confirm('⚠️ 알림 히스토리를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다!')) {
                  onNotificationsReset();
                  alert('✅ 알림 히스토리가 삭제되었습니다.');
                }
              }}
              className="w-full flex items-center gap-3 px-4 py-3 bg-rose-50 text-rose-700 rounded-xl hover:bg-rose-100 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
              <span className="font-bold">알림 히스토리 초기화</span>
            </button>
          </div>
        </section>

        {/* 4. 시스템 정보 (고급 설정에만 표시) */}
        {showAdvancedSettings && (
        <section className="mb-8">
          <h3 className="text-lg font-black text-slate-700 mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-amber-600" />
            4. 시스템 정보 (System Information) - 고급
          </h3>
          
          <div className="space-y-3">
            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-600 flex items-center gap-2">
                  <Wifi className="w-4 h-4" />
                  WebSocket 연결 상태
                </span>
                <span className={`text-sm font-black ${isConnected ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {isConnected ? '연결됨' : '연결 안 됨'}
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-600 flex items-center gap-2">
                  <HardDrive className="w-4 h-4" />
                  로컬 저장 데이터 크기
                </span>
                <span className="text-sm font-black text-slate-700">
                  {formatBytes(localStorageSize)}
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-600 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  오프라인 큐 대기 메시지
                </span>
                <span className="text-sm font-black text-slate-700">
                  {offlineQueueSize}개
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-600 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  임시 저장 메시지
                </span>
                <span className="text-sm font-black text-slate-700">
                  {pendingMessagesSize}개
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-600 flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  앱 버전
                </span>
                <span className="text-sm font-black text-slate-700">
                  v1.0.0
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-600 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  마지막 업데이트
                </span>
                <span className="text-sm font-black text-slate-700">
                  {new Date().toLocaleDateString('ko-KR')}
                </span>
              </div>
            </div>
          </div>
        </section>
        )}

        {/* 6. 콘솔 로그 레벨 (개발자 전용 - 고급 설정에만 표시) */}
        {showAdvancedSettings && (
          <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-slate-700 flex items-center gap-2">
              <Code className="w-5 h-5 text-indigo-600" />
              6. 콘솔 로그 레벨
            </h3>
            {!isAdmin && !debugLoggingUnlocked && (
              <button
                onClick={() => openPasswordModal('debug')}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
              >
                <Lock className="w-3 h-3" />
                잠금 해제
              </button>
            )}
            {(isAdmin || debugLoggingUnlocked) && (
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                접근 허용됨
              </span>
            )}
          </div>
          
          {(isAdmin || debugLoggingUnlocked) ? (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-sm font-bold text-slate-700 block mb-1">콘솔 로그 레벨</span>
                    <span className="text-xs text-slate-500">디버깅을 위한 상세 로그 출력</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={debugLogging}
                      onChange={(e) => {
                        setDebugLogging(e.target.checked);
                        localStorage.setItem('hotelflow_debug_logging', String(e.target.checked));
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 text-center">
              <Lock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-600 mb-1">관리자 전용 기능</p>
              <p className="text-xs text-slate-500">이 기능을 사용하려면 관리자 권한이 필요합니다.</p>
            </div>
          )}
        </section>
        )}

        {/* 7. WebSocket 메시지 로깅 (개발자 전용 - 고급 설정에만 표시) */}
        {showAdvancedSettings && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-slate-700 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              7. WebSocket 메시지 로깅
            </h3>
            {!isAdmin && !wsLoggingUnlocked && (
              <button
                onClick={() => openPasswordModal('ws')}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
              >
                <Lock className="w-3 h-3" />
                잠금 해제
              </button>
            )}
            {(isAdmin || wsLoggingUnlocked) && (
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                접근 허용됨
              </span>
            )}
          </div>
          
          {(isAdmin || wsLoggingUnlocked) ? (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-sm font-bold text-slate-700 block mb-1">WebSocket 메시지 로깅</span>
                    <span className="text-xs text-slate-500">WebSocket 메시지를 콘솔에 출력</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wsMessageLogging}
                      onChange={(e) => {
                        setWsMessageLogging(e.target.checked);
                        localStorage.setItem('hotelflow_ws_message_logging', String(e.target.checked));
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 text-center">
              <Lock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-600 mb-1">관리자 전용 기능</p>
              <p className="text-xs text-slate-500">이 기능을 사용하려면 관리자 권한이 필요합니다.</p>
            </div>
          )}
        </section>
        )}

        {/* 2. 기타 설정 (캐시 정리만) */}
        <section>
          <h3 className="text-lg font-black text-slate-700 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-600" />
            2. 기타 설정 (Other Settings)
          </h3>
          
          <div className="space-y-4">
            <button
              onClick={clearCache}
              className="w-full flex items-center gap-3 px-4 py-3 bg-amber-50 text-amber-700 rounded-xl hover:bg-amber-100 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              <span className="font-bold">캐시 정리</span>
            </button>

            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-600">localStorage 사용량</span>
                <span className="text-sm font-black text-slate-700">
                  {formatBytes(localStorageSize)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 암호 입력 모달 */}
        {showPasswordModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <Lock className="w-6 h-6 text-indigo-600" />
                <h3 className="text-xl font-black text-slate-800">관리자 암호 입력</h3>
              </div>
              
              <p className="text-sm text-slate-600 mb-4">
                이 기능을 사용하려면 관리자 암호가 필요합니다.
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  암호
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setPasswordError('');
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      verifyPassword();
                    }
                  }}
                  placeholder="관리자 암호를 입력하세요"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  autoFocus
                />
                {passwordError && (
                  <p className="mt-2 text-sm text-rose-600">{passwordError}</p>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordInput('');
                    setPasswordError('');
                    setCurrentPasswordSection(null);
                  }}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={verifyPassword}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;

