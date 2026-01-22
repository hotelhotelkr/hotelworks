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
  EyeOff,
  Upload,
  Cloud
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
      // 1순위: 환경 변수
      try {
        const envUrl = (import.meta.env as any).VITE_WS_SERVER_URL;
        if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
          return envUrl.trim();
        }
      } catch (e) {}
      
      // 2순위: localStorage
      try {
        const savedUrl = localStorage.getItem('hotelflow_ws_url');
        if (savedUrl && savedUrl.trim() !== '') {
          return savedUrl.trim();
        }
      } catch (e) {}
      
      // 3순위: 프로덕션 도메인 감지
      if (typeof window !== 'undefined' && window.location) {
        const host = window.location.hostname;
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        
        // 프로덕션 도메인: hotelworks.kr → Render 서버 사용
        if (host === 'hotelworks.kr' || host === 'www.hotelworks.kr') {
          return 'wss://hotelworks-websocket.onrender.com';
        }
        
        // 개발 환경
        if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.') || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
          return `${protocol === 'wss:' ? 'ws:' : 'ws:'}//${host}:3001`;
        }
      }
      
      return 'ws://localhost:3001';
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

  // 캐시 최적화
  const clearCache = () => {
    if (window.confirm('⚠️ 캐시를 최적화하시겠습니까?\n페이지를 새로고침해야 완전히 적용됩니다.')) {
      try {
        // 오프라인 큐와 임시 메시지만 유지하고 나머지 캐시 최적화
        const offlineQueue = localStorage.getItem('hotelflow_offline_queue');
        const pendingMessages = localStorage.getItem('hotelflow_pending_messages');
        const wsUrl = localStorage.getItem('hotelflow_ws_url');
        
        localStorage.clear();
        
        if (offlineQueue) localStorage.setItem('hotelflow_offline_queue', offlineQueue);
        if (pendingMessages) localStorage.setItem('hotelflow_pending_messages', pendingMessages);
        if (wsUrl) localStorage.setItem('hotelflow_ws_url', wsUrl);
        
        alert('✅ 캐시가 최적화되었습니다. 페이지를 새로고침하세요.');
        window.location.reload();
      } catch (e) {
        alert('❌ 캐시 최적화 실패: ' + (e as Error).message);
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

  
  // 주문 동기화 상태
  const [syncStatus, setSyncStatus] = useState<{
    status: 'idle' | 'syncing' | 'success' | 'error';
    message: string;
    results?: { created: number; skipped: number; total: number; errors: number };
  }>({ status: 'idle', message: '' });

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white rounded-[2rem] border border-slate-200 p-6 sm:p-8 shadow-sm">
        <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
          <SettingsIcon className="w-6 h-6 text-indigo-600" />
          Settings
        </h2>

        {/* 연결 상태 */}
        <section className="mb-8 pb-8 border-b-2 border-red-600">
          <h3 className="text-lg font-black text-slate-700 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            연결 상태 (Connection Status)
          </h3>
          
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
        </section>

        {/* 데이터 관리 - ADMIN 전용 */}
        {currentUser.dept === Department.ADMIN && (
          <section className="mb-8 pb-8 border-b-2 border-red-600">
            <h3 className="text-lg font-black text-slate-700 mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-rose-600" />
              데이터 관리 (Data Management)
              <span className="ml-2 px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-black uppercase rounded">
                🔒 ADMIN 전용
              </span>
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
        )}


        {/* 오더 동기화 */}
        <section className="mb-8 pb-8 border-b-2 border-red-600">
          <h3 className="text-lg font-black text-slate-700 mb-4 flex items-center gap-2">
            <Cloud className="w-5 h-5 text-indigo-600" />
            오더 동기화 (Order Sync)
          </h3>
          
          <div className="space-y-4">
            {/* 설명 카드 */}
            <div className="p-4 bg-amber-50 rounded-xl border-2 border-amber-200">
              <div className="flex items-start gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-900 mb-2">언제 사용하나요?</p>
                  <ul className="text-xs text-amber-800 space-y-1">
                    <li>✅ 오더가 데이터 센터(수파베이스)에 저장 안됐을 때</li>
                    <li>✅ 서버 오류로 데이터 누락이 의심될 때</li>
                    <li>✅ 개발자가 복구를 요청했을 때</li>
                  </ul>
                </div>
              </div>
              <div className="flex items-start gap-2 pt-3 border-t border-amber-300">
                <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-900 mb-1">주의사항</p>
                  <p className="text-xs text-amber-800">
                    ⚠️ <span className="font-bold">정상 작동 중에는 사용하지 마세요!</span><br/>
                    오더는 자동으로 저장되므로 불필요한 동기화는 서버에 부담을 줄 수 있어요.
                  </p>
                </div>
              </div>
            </div>

            {/* 오더 수 표시 카드 */}
            <div className="p-4 bg-slate-50 rounded-xl border-2 border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-700">localStorage 오더 수</span>
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-black text-indigo-600">
                    {(() => {
                      try {
                        const ordersJson = localStorage.getItem('hotelflow_orders_v1');
                        if (!ordersJson) return '0개';
                        const orders = JSON.parse(ordersJson);
                        return Array.isArray(orders) ? `${orders.length}개` : '0개';
                      } catch {
                        return '확인 불가';
                      }
                    })()}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                💡 브라우저에 저장된 오더를 데이터 센터(수파베이스)로 백업합니다
              </p>
            </div>
            
            <button
              onClick={async () => {
                try {
                  setSyncStatus({ status: 'syncing', message: '오더 동기화 중...' });
                  
                  const ordersJson = localStorage.getItem('hotelflow_orders_v1');
                  if (!ordersJson) {
                    setSyncStatus({ 
                      status: 'error', 
                      message: 'localStorage에 오더가 없습니다.' 
                    });
                    return;
                  }
                  
                  const orders = JSON.parse(ordersJson);
                  if (!Array.isArray(orders) || orders.length === 0) {
                    setSyncStatus({ 
                      status: 'error', 
                      message: '오더가 0개입니다.' 
                    });
                    return;
                  }
                  
                  const getApiBaseUrl = (): string => {
                    // 1. localStorage에서 WebSocket URL 가져오기 (가장 확실)
                    try {
                      const savedUrl = localStorage.getItem('hotelflow_ws_url');
                      if (savedUrl && savedUrl.trim() !== '') {
                        const apiUrl = savedUrl.replace('ws://', 'http://').replace('wss://', 'https://');
                        console.log('📡 API URL (localStorage):', apiUrl);
                        return apiUrl;
                      }
                    } catch (e) {}
                    
                    // 2. 환경 변수에서 가져오기
                    try {
                      const envUrl = (import.meta.env as any).VITE_WS_SERVER_URL;
                      if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
                        const apiUrl = envUrl.replace('ws://', 'http://').replace('wss://', 'https://');
                        console.log('📡 API URL (환경변수):', apiUrl);
                        return apiUrl;
                      }
                    } catch (e) {}
                    
                    // 3. 현재 페이지에서 자동 감지
                    if (typeof window !== 'undefined' && window.location) {
                      const host = window.location.hostname;
                      const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
                      
                      // 로컬 환경
                      if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.')) {
                        const apiUrl = `${protocol}//${host}:3001`;
                        console.log('📡 API URL (로컬 자동감지):', apiUrl);
                        return apiUrl;
                      }
                      
                      // Vercel 프로덕션 환경
                      if (host.includes('vercel.app') || host === 'hotelworks.kr') {
                        const apiUrl = 'https://hotelworks-backend.onrender.com';
                        console.log('📡 API URL (프로덕션):', apiUrl);
                        return apiUrl;
                      }
                    }
                    
                    // 기본값
                    const defaultUrl = 'https://hotelworks-backend.onrender.com';
                    console.log('📡 API URL (기본값):', defaultUrl);
                    return defaultUrl;
                  };
                  
                  const formattedOrders = orders.map((order: any) => ({
                    ...order,
                    requestedAt: order.requestedAt instanceof Date 
                      ? order.requestedAt.toISOString() 
                      : (typeof order.requestedAt === 'string' ? order.requestedAt : new Date(order.requestedAt).toISOString()),
                    acceptedAt: order.acceptedAt ? (order.acceptedAt instanceof Date ? order.acceptedAt.toISOString() : order.acceptedAt) : undefined,
                    inProgressAt: order.inProgressAt ? (order.inProgressAt instanceof Date ? order.inProgressAt.toISOString() : order.inProgressAt) : undefined,
                    completedAt: order.completedAt ? (order.completedAt instanceof Date ? order.completedAt.toISOString() : order.completedAt) : undefined,
                    memos: (order.memos || []).map((memo: any) => ({
                      ...memo,
                      timestamp: memo.timestamp instanceof Date 
                        ? memo.timestamp.toISOString() 
                        : (typeof memo.timestamp === 'string' ? memo.timestamp : new Date(memo.timestamp).toISOString())
                    }))
                  }));
                  
                  const apiUrl = `${getApiBaseUrl()}/api/orders/sync`;
                  console.log('🔄 동기화 시작:', {
                    localStorageOrders: orders.length,
                    apiUrl,
                    formattedOrdersCount: formattedOrders.length
                  });
                  
                  const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ orders: formattedOrders })
                  });
                  
                  if (!response.ok) {
                    const error = await response.json().catch(() => ({ error: response.statusText }));
                    throw new Error(error.error || `HTTP ${response.status}`);
                  }
                  
                  const result = await response.json();
                  
                  console.log('✅ 동기화 결과:', result);
                  
                  setSyncStatus({
                    status: 'success',
                    message: `동기화 완료! ${result.results.created}개 생성, ${result.results.skipped}개 건너뜀`,
                    results: result.results
                  });
                  
                  // 성공 메시지 알림
                  if (result.results.created > 0) {
                    alert(`✅ ${result.results.created}개의 오더가 데이터베이스에 저장되었습니다!\n\n이제 Supabase에서 확인할 수 있습니다.`);
                  } else if (result.results.skipped > 0) {
                    alert(`⏭️ 모든 오더가 이미 데이터베이스에 있습니다.\n\n(건너뜀: ${result.results.skipped}개)`);
                  }
                } catch (error: any) {
                  console.error('❌ 동기화 실패:', error);
                  setSyncStatus({
                    status: 'error',
                    message: `동기화 실패: ${error.message}`
                  });
                  alert(`❌ 동기화 실패: ${error.message}\n\n콘솔을 확인하세요 (F12)`);
                }
              }}
              disabled={syncStatus.status === 'syncing'}
              className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {syncStatus.status === 'syncing' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  동기화 중...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  오더 동기화 시작
                </>
              )}
            </button>
            
            {syncStatus.status !== 'idle' && (
              <div className={`p-3 rounded-lg ${
                syncStatus.status === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-800' 
                  : syncStatus.status === 'error'
                  ? 'bg-red-50 border border-red-200 text-red-800'
                  : 'bg-blue-50 border border-blue-200 text-blue-800'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {syncStatus.status === 'success' && <CheckCircle className="w-4 h-4" />}
                  {syncStatus.status === 'error' && <XCircle className="w-4 h-4" />}
                  {syncStatus.status === 'syncing' && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span className="font-bold text-sm">{syncStatus.message}</span>
                </div>
                {syncStatus.results && (
                  <div className="text-xs mt-2 space-y-1">
                    <p>총 오더: {syncStatus.results.total}개</p>
                    <p>✅ 생성: {syncStatus.results.created}개</p>
                    <p>⏭️ 건너뜀: {syncStatus.results.skipped}개</p>
                    {syncStatus.results.errors > 0 && (
                      <p>❌ 오류: {syncStatus.results.errors}개</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* 기타 설정 (캐시 최적화) */}
        <section>
          <h3 className="text-lg font-black text-slate-700 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-600" />
            캐시 관리 (Cache Management)
          </h3>
          
          <div className="space-y-4">
            {/* localStorage 사용량 표시 - 상태별 색상 */}
            <div className={`p-4 rounded-xl border-2 ${
              localStorageSize < 102400 // 100 KB
                ? 'bg-emerald-50 border-emerald-200'
                : localStorageSize < 512000 // 500 KB
                ? 'bg-amber-50 border-amber-200'
                : 'bg-rose-50 border-rose-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-slate-700">localStorage 사용량</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    localStorageSize < 102400
                      ? 'bg-emerald-500 animate-pulse'
                      : localStorageSize < 512000
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-rose-500 animate-pulse'
                  }`}></div>
                  <span className={`text-sm font-black ${
                    localStorageSize < 102400
                      ? 'text-emerald-700'
                      : localStorageSize < 512000
                      ? 'text-amber-700'
                      : 'text-rose-700'
                  }`}>
                    {formatBytes(localStorageSize)}
                  </span>
                </div>
              </div>
              
              {/* 상태 표시 */}
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-black uppercase px-2 py-1 rounded ${
                  localStorageSize < 102400
                    ? 'bg-emerald-100 text-emerald-700'
                    : localStorageSize < 512000
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-rose-100 text-rose-700'
                }`}>
                  {localStorageSize < 102400 ? '🟢 정상' : localStorageSize < 512000 ? '🟡 주의' : '🔴 위험'}
                </span>
                <span className={`text-xs font-bold ${
                  localStorageSize < 102400
                    ? 'text-emerald-700'
                    : localStorageSize < 512000
                    ? 'text-amber-700'
                    : 'text-rose-700'
                }`}>
                  {localStorageSize < 102400 ? '청소 불필요' : localStorageSize < 512000 ? '가끔 청소' : '지금 청소!'}
                </span>
              </div>
              
              {/* 프로그레스 바 */}
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    localStorageSize < 102400
                      ? 'bg-emerald-500'
                      : localStorageSize < 512000
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ 
                    width: `${Math.min((localStorageSize / 512000) * 100, 100)}%` 
                  }}
                ></div>
              </div>
              
              {/* 기준 표 */}
              <div className="mt-4 pt-3 border-t border-slate-200">
                <p className="text-[10px] font-bold text-slate-500 mb-2 uppercase">사용량 기준</p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span className="font-bold text-slate-600">0-100 KB</span>
                    </div>
                    <span className="text-emerald-700 font-black">정상 - 청소 불필요</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      <span className="font-bold text-slate-600">100-500 KB</span>
                    </div>
                    <span className="text-amber-700 font-black">주의 - 가끔 청소</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                      <span className="font-bold text-slate-600">500 KB+</span>
                    </div>
                    <span className="text-rose-700 font-black">위험 - 지금 청소!</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 캐시 최적화 버튼 */}
            <button
              onClick={clearCache}
              className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>
                {localStorageSize < 102400 
                  ? '캐시 최적화 (선택사항)' 
                  : localStorageSize < 512000 
                  ? '캐시 최적화 (권장)' 
                  : '⚠️ 캐시 최적화 (필수)'}
              </span>
            </button>
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

