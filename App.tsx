
/// <reference types="vite/client" />

import React, { useState, useCallback, useEffect, useRef, Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { 
  Bell, 
  Plus, 
  Menu,
  Wifi,
  X,
  Loader2
} from 'lucide-react';
import { 
  Order, 
  OrderStatus, 
  Priority, 
  User, 
  FilterOptions,
  Department,
  Memo,
  Toast
} from './types';
import { INITIAL_ORDERS, USERS } from './services/mockData';

// 코드 스플리팅: 컴포넌트를 lazy loading으로 분리
const Sidebar = lazy(() => import('./components/Sidebar'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const OrderList = lazy(() => import('./components/OrderList'));
const OrderCreateModal = lazy(() => import('./components/OrderCreateModal'));
const NoteModal = lazy(() => import('./components/NoteModal'));
const Login = lazy(() => import('./components/Login'));
const AdminStaffManager = lazy(() => import('./components/AdminStaffManager'));
const Settings = lazy(() => import('./components/Settings'));
const ToastNotification = lazy(() => import('./components/ToastNotification'));

// Toast 타입은 types.ts에서 import

// For Excel export
declare const XLSX: any;

// Modern Sound Presets
type SoundEffect = 'NEW_ORDER' | 'SUCCESS' | 'MEMO' | 'ALERT' | 'UPDATE' | 'LOGIN' | 'CANCEL';

const STORAGE_KEY = 'hotelflow_orders_v1';
const SYNC_CHANNEL = 'hotelflow_sync';
const OFFLINE_QUEUE_KEY = 'hotelflow_offline_queue'; // 오프라인 상태에서 생성된 메시지 큐

/**
 * 세션 ID: 각 브라우저 탭/기기를 고유하게 식별
 * - 페이지 로드 시마다 새로 생성
 * - 같은 사용자가 다른 기기/탭에서 로그인해도 서로 다른 세션 ID를 가짐
 * - 중복 알림 방지에 사용: senderId + sessionId가 모두 같으면 같은 기기로 판단
 */
const SESSION_ID = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * WebSocket 서버 URL 동적 감지
 * - 로컬 환경(localhost, IP): 자동으로 포트 3001 사용
 * - 프로덕션: localStorage 또는 환경 변수에서 URL 가져옴
 * - PC와 모바일 모두 같은 서버에 연결
 */
const getWebSocketURL = (): string => {
  // 🚨 개발 환경: localStorage 무시하고 자동 감지 우선
  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname;
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    
    // localhost 또는 로컬 IP 주소인 경우 무조건 로컬 서버 사용
    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.') || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      const wsUrl = `${protocol}//${host}:8000`;
      console.log('🔌 로컬 WebSocket URL:', wsUrl);
      return wsUrl;
    }
  }
  
  // 🚨 프로덕션 환경: localStorage 또는 환경 변수 사용
  try {
    const savedUrl = localStorage.getItem('hotelflow_ws_url');
    if (savedUrl && savedUrl.trim() !== '') {
      console.log('🔌 저장된 WebSocket URL:', savedUrl.trim());
      return savedUrl.trim();
    }
  } catch (e) {
    // localStorage 접근 실패 시 무시
  }
  
  try {
    const envUrl = (import.meta.env as any).VITE_WS_SERVER_URL;
    if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
      console.log('🔌 환경 변수 WebSocket URL:', envUrl);
      return envUrl;
    }
  } catch (e) {
    // 환경 변수 접근 실패 시 무시
  }
  
  console.log('🔌 기본 WebSocket URL: http://localhost:8000');
  return 'http://localhost:8000';
};

/**
 * 디버그 로깅 헬퍼 함수
 * - Settings에서 디버그 모드 활성화 시에만 로그 출력
 * - 프로덕션 성능 최적화: console.log 호출 최소화
 */
const isDebugEnabled = () => {
  try {
    return localStorage.getItem('hotelflow_debug_logging') === 'true';
  } catch (e) {
    return false;
  }
};

const debugLog = (...args: any[]) => {
  if (isDebugEnabled()) console.log(...args);
};

const debugWarn = (...args: any[]) => {
  if (isDebugEnabled()) console.warn(...args);
};

const debugError = (...args: any[]) => {
  if (isDebugEnabled()) console.error(...args);
};

const App: React.FC = () => {
  // Load initial state from localStorage if available
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Convert ISO strings back to Date objects
        return parsed.map((o: any) => ({
          ...o,
          requestedAt: new Date(o.requestedAt),
          acceptedAt: o.acceptedAt ? new Date(o.acceptedAt) : undefined,
          inProgressAt: o.inProgressAt ? new Date(o.inProgressAt) : undefined,
          completedAt: o.completedAt ? new Date(o.completedAt) : undefined,
            memos: (o.memos && Array.isArray(o.memos)) ? o.memos.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })) : []
        }));
      } catch (e) {
        debugWarn('Failed to parse orders from localStorage:', e);
        return INITIAL_ORDERS;
      }
    }
    return INITIAL_ORDERS;
    } catch (e) {
      debugWarn('Failed to access localStorage:', e);
      return INITIAL_ORDERS;
    }
  });

  // users 상태: localStorage에서 초기화 (실시간 동기화된 최신 데이터 유지)
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('hotelflow_users_v1');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return Array.isArray(parsed) && parsed.length > 0 ? parsed : USERS;
        } catch (e) {
          console.warn('Failed to parse users from localStorage:', e);
          return USERS;
        }
      }
      return USERS;
    } catch (e) {
      console.warn('Failed to access localStorage for users:', e);
      return USERS;
    }
  });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [memoOrder, setMemoOrder] = useState<Order | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [serviceWorkerRegistration, setServiceWorkerRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isNativePlatform, setIsNativePlatform] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [notificationHistory, setNotificationHistory] = useState<Toast[]>(() => {
    // localStorage에서 알림 히스토리 로드
    const saved = localStorage.getItem('hotelflow_notifications');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((t: any) => ({
          ...t,
          timestamp: new Date(t.timestamp)
        }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'ALL',
    priority: 'ALL',
    roomNo: '',
    dateRange: 'TODAY'
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const currentUserRef = useRef<User | null>(null);
  const ordersRef = useRef<Order[]>(orders);
  const pendingMessagesProcessingRef = useRef<boolean>(false);
  const [isConnected, setIsConnected] = useState(false);

  // 실시간 날짜/시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000); // 1초마다 업데이트

    return () => clearInterval(timer);
  }, []);

  // orders 상태가 변경될 때마다 ref 업데이트
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  // Persistence effect
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  }, [orders]);

  // Helper to generate the custom Order ID (YYYYMMDD_N)
  const generateOrderId = useCallback((currentOrders: Order[]) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    // Filter orders created today (ignoring legacy IDs that don't match pattern)
    const todayOrders = currentOrders.filter(o => o.id.startsWith(dateStr));
    
    let maxSeq = 0;
    todayOrders.forEach(o => {
      const parts = o.id.split('_');
      if (parts.length === 2) {
        const seq = parseInt(parts[1], 10);
        if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
      }
    });

    return `${dateStr}_${maxSeq + 1}`;
  }, []);

  // Modern UI Sound Synthesizer
  const playSoundEffect = useCallback((effect: SoundEffect) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const playNote = (freq: number, startTime: number, duration: number, volume: number = 0.1, type: OscillatorType = 'sine', decay: boolean = true) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
        if (decay) {
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        } else {
          gain.gain.linearRampToValueAtTime(0, startTime + duration);
        }

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = ctx.currentTime;

      switch (effect) {
        case 'NEW_ORDER':
          playNote(987.77, now, 0.4, 0.15, 'sine'); // B5
          playNote(783.99, now + 0.15, 0.5, 0.12, 'sine'); // G5
          break;
        case 'SUCCESS':
          playNote(523.25, now, 0.1, 0.1, 'triangle');
          playNote(659.25, now + 0.08, 0.1, 0.1, 'triangle');
          playNote(783.99, now + 0.16, 0.4, 0.12, 'triangle');
          break;
        case 'MEMO':
          playNote(880, now, 0.15, 0.1, 'sine');
          break;
        case 'ALERT':
          playNote(220, now, 0.3, 0.15, 'square');
          break;
        case 'CANCEL':
          playNote(440, now, 0.1, 0.12, 'sawtooth');
          playNote(349.23, now + 0.1, 0.3, 0.1, 'sawtooth');
          break;
        case 'UPDATE':
          playNote(659.25, now, 0.2, 0.08, 'sine');
          break;
        case 'LOGIN':
          const sweepOsc = ctx.createOscillator();
          const sweepGain = ctx.createGain();
          sweepOsc.frequency.setValueAtTime(440, now);
          sweepOsc.frequency.exponentialRampToValueAtTime(880, now + 0.6);
          sweepGain.gain.setValueAtTime(0, now);
          sweepGain.gain.linearRampToValueAtTime(0.1, now + 0.1);
          sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
          sweepOsc.connect(sweepGain);
          sweepGain.connect(ctx.destination);
          sweepOsc.start(now);
          sweepOsc.stop(now + 0.6);
          break;
      }
      } catch (e) {
        debugWarn('Audio playback failed', e);
      }
  }, []);

  // Service Worker를 통해 푸시 알림 표시
  const showPushNotification = useCallback(async (title: string, body: string, options: any = {}) => {
    if (!('serviceWorker' in navigator) || !serviceWorkerRegistration || notificationPermission !== 'granted') {
      return;
    }
    
    try {
      serviceWorkerRegistration.active?.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        options: {
          body,
          icon: '/icon-192.svg',
          badge: '/icon-192.svg',
          tag: `hotelworks-${Date.now()}`,
          requireInteraction: false,
          vibrate: [200, 100, 200],
          data: {
            url: window.location.href
          },
          ...options
        }
      });
    } catch (error) {
      debugError('❌ 푸시 알림 전송 실패:', error);
    }
  }, [serviceWorkerRegistration, notificationPermission]);

  const triggerToast = useCallback((message: string, type: Toast['type'] = 'info', dept?: Department, effect: SoundEffect = 'UPDATE') => {
    const now = new Date();
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = {
      id,
      message,
      type,
      dept,
      timestamp: now
    };
    
    // 브라우저가 백그라운드이거나 닫혀있을 때 푸시 알림 표시
    if (document.hidden || !document.hasFocus()) {
      showPushNotification('HotelWorks', message, {
        tag: `toast-${id}`,
        requireInteraction: type === 'warning' || type === 'error'
      });
    }
    
    // 중복 알림 방지: 같은 메시지가 2초 이내에 이미 있으면 추가하지 않음
    setToasts(prev => {
      const duplicate = prev.find(t => {
        const timeDiff = Math.abs(now.getTime() - t.timestamp.getTime());
        return t.message === message && t.type === type && t.dept === dept && timeDiff < 2000; // 2초 이내
      });
      
      if (duplicate) {
        return prev; // 중복이면 기존 알림 유지
      }
      
      return [newToast, ...prev];
    });
    
    // 알림 히스토리에 추가 (최대 1000개 유지, 중복 방지)
    setNotificationHistory(prev => {
      // 히스토리에도 중복 체크 (2초 이내 같은 메시지가 있으면 추가하지 않음)
      const duplicate = prev.find(t => {
        const timeDiff = Math.abs(now.getTime() - t.timestamp.getTime());
        return t.message === message && t.type === type && t.dept === dept && timeDiff < 2000;
      });
      
      if (duplicate) {
        return prev; // 중복이면 기존 히스토리 유지
      }
      
      const updated = [newToast, ...prev].slice(0, 1000);
      // localStorage에 저장
      try {
        localStorage.setItem('hotelflow_notifications', JSON.stringify(updated.map(t => ({
          ...t,
          timestamp: t.timestamp.toISOString()
        }))));
      } catch (e) {
        debugWarn('Failed to save notification history:', e);
      }
      return updated;
    });
    playSoundEffect(effect);
  }, [playSoundEffect]);

  // 오프라인 큐에 저장된 메시지들을 동기화하는 함수
  const syncOfflineQueue = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      debugLog('⚠️ WebSocket 연결되지 않음, 오프라인 큐 동기화 불가');
      return;
    }

    try {
      const saved = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (!saved) {
        debugLog('📭 오프라인 큐가 비어있음');
        return;
      }

      const queue = JSON.parse(saved);
      if (queue.length === 0) {
        debugLog('📭 오프라인 큐가 비어있음');
        return;
      }

      debugLog(`🔄 오프라인 큐 동기화 시작: ${queue.length}개 메시지`);
      
      // 큐에 저장된 모든 메시지를 전송
      queue.forEach((message: any, index: number) => {
        try {
          const wsMessage = {
            type: message.type,
            payload: message.payload,
            senderId: message.senderId,
            sessionId: message.sessionId || SESSION_ID,
            timestamp: message.timestamp || new Date().toISOString()
          };
          
          const wsMessageLogging = localStorage.getItem('hotelflow_ws_message_logging') === 'true';
          if (wsMessageLogging) {
            debugLog(`📤 오프라인 큐 메시지 전송 [${index + 1}/${queue.length}]:`, wsMessage.type);
          }
          
          socket.emit(SYNC_CHANNEL, wsMessage);
          debugLog(`✅ 오프라인 메시지 전송 (${index + 1}/${queue.length}):`, message.type, message.payload.id || message.payload.orderId);
        } catch (error) {
          debugError(`❌ 오프라인 메시지 전송 실패 (${index + 1}/${queue.length}):`, error);
        }
      });

      // 전송 완료 후 큐 비우기
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
      debugLog('✅ 오프라인 큐 동기화 완료, 큐 비움');
    } catch (e) {
      debugError('❌ 오프라인 큐 동기화 실패:', e);
    }
  }, []);

  // Capacitor 네이티브 플랫폼 초기화
  useEffect(() => {
    const initCapacitor = async () => {
      if (Capacitor.isNativePlatform()) {
        setIsNativePlatform(true);
        debugLog('📱 네이티브 앱 환경:', Capacitor.getPlatform());
        
        try {
          await StatusBar.setStyle({ style: Style.Light });
          await StatusBar.setBackgroundColor({ color: '#4f46e5' });
        } catch (error) {
          debugWarn('StatusBar 설정 실패 (웹 환경일 수 있음)');
        }
        
        try {
          let permStatus = await PushNotifications.checkPermissions();
          
          if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
          }
          
          if (permStatus.receive !== 'granted') {
            debugWarn('❌ 푸시 알림 권한이 거부됨');
            return;
          }
          
          debugLog('✅ 푸시 알림 권한 허용됨');
          await PushNotifications.register();
          
          PushNotifications.addListener('registration', (token) => {
            debugLog('📱 푸시 알림 토큰 등록:', token.value);
            setPushToken(token.value);
          });
          
          PushNotifications.addListener('registrationError', (error) => {
            debugError('❌ 푸시 알림 등록 실패:', error);
          });
          
          PushNotifications.addListener('pushNotificationReceived', (notification) => {
            debugLog('📱 푸시 알림 수신:', notification);
          });
          
          PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
            debugLog('📱 푸시 알림 액션:', notification);
          });
          
        } catch (error) {
          debugError('❌ 푸시 알림 초기화 실패:', error);
        }
        
        CapacitorApp.addListener('appStateChange', ({ isActive }) => {
          debugLog('📱 앱 상태 변경:', isActive ? '활성' : '비활성');
        });
        
        // 백버튼 처리 (Android)
        CapacitorApp.addListener('backButton', ({ canGoBack }) => {
          if (!canGoBack) {
            CapacitorApp.exitApp();
          } else {
            window.history.back();
          }
        });
      }
    };
    
    initCapacitor();
  }, []);
  
  // Service Worker 등록 및 푸시 알림 권한 요청 (웹 플랫폼용)
  useEffect(() => {
    // 네이티브 플랫폼이면 Service Worker 사용 안 함
    if (isNativePlatform) {
      return;
    }
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          debugLog('✅ Service Worker 등록 성공:', registration.scope);
          setServiceWorkerRegistration(registration);
          
          if ('Notification' in window) {
            const currentPermission = Notification.permission;
            setNotificationPermission(currentPermission);
            debugLog('📱 푸시 알림 권한:', currentPermission);
          }
        })
        .catch((error) => {
          debugError('❌ Service Worker 등록 실패:', error);
        });
    } else {
      debugWarn('⚠️ Service Worker를 지원하지 않는 브라우저입니다.');
    }
  }, []);

  // WebSocket 연결을 로그인 상태와 무관하게 항상 유지
  useEffect(() => {
    // WebSocket 서버에 연결 (서버가 없어도 앱은 작동하도록)
    let mounted = true;
    
    // 기존 연결이 있고 연결되어 있으면 재사용
    if (socketRef.current && socketRef.current.connected) {
      debugLog('🔌 WebSocket 연결 재사용');
      return () => {
        mounted = false;
      };
    }
    
    // 기존 연결이 있지만 연결되지 않았으면 정리
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    try {
      const wsUrl = getWebSocketURL();
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔌 WebSocket 초기화 시작');
      console.log('   대상 URL:', wsUrl);
      console.log('   현재 페이지:', window.location.href);
      console.log('   시간:', new Date().toLocaleString('ko-KR'));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      socketRef.current = io(wsUrl, {
        transports: ['websocket', 'polling'], // websocket 우선, 실패 시 polling으로 폴백
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity,
        timeout: 20000, // 모바일 네트워크를 위해 타임아웃 증가
        autoConnect: true,
        forceNew: false, // 기존 연결 재사용 허용
        upgrade: true, // polling에서 websocket으로 업그레이드 허용
        rememberUpgrade: true, // 업그레이드 기억
        withCredentials: false // CORS 문제 방지
      });

      const socket = socketRef.current;

      socket.on('connect', () => {
        console.log('✅ WebSocket 연결 성공:', socket.id, '| URL:', wsUrl);
        setIsConnected(true);
        syncOfflineQueue();
        
        const user = currentUserRef.current;
        if (user) {
          socket.emit('request_all_orders', {
            senderId: user.id,
            timestamp: new Date().toISOString()
          });
        }
      });

      socket.on('disconnect', (reason) => {
        debugWarn('❌ WebSocket 연결 해제:', reason);
        setIsConnected(false);
        
        // 자동 재연결 (Socket.IO가 자동으로 재연결 시도하지만 명시적으로도 시도)
        setTimeout(() => {
          if (socket && !socket.connected) {
            debugLog('🔄 연결 해제 후 재연결 시도');
            socket.connect();
          }
        }, 1000);
      });

      socket.on('connect_error', (error) => {
        console.error('❌ WebSocket 연결 오류:', error.message, '| URL:', wsUrl);
        setIsConnected(false);
        
        // 사용자에게 연결 문제 알림 (디버그 모드에서만)
        if (isDebugEnabled()) {
          console.error('💡 해결 방법: 서버가 실행 중인지 확인하세요 (npm run dev:server)');
        }
        
        // 연결 오류 시 자동 재연결 시도 (실시간 동기화 보장)
        // Socket.IO가 자동으로 재연결을 시도하지만, 명시적으로도 시도
        setTimeout(() => {
          if (socket && !socket.connected) {
            debugLog('🔄 연결 오류 후 자동 재연결 시도:', wsUrl);
            socket.connect();
          }
        }, 3000); // 3초 후 재시도
      });

      socket.on('reconnect', (attemptNumber) => {
        console.log('🔄 WebSocket 재연결 성공, 시도 횟수:', attemptNumber);
        console.log('   - 재연결 시간:', new Date().toISOString());
        console.log('   - Socket ID:', socket.id);
        setIsConnected(true);
        
        // 오프라인 큐에 저장된 메시지들을 모두 전송
        syncOfflineQueue();
        
        // 로그인 상태와 관계없이 재연결 성공 시 전체 주문 목록 동기화 요청 (실시간 동기화 보장)
        const user = currentUserRef.current;
        if (user) {
          console.log('📤 WebSocket 재연결 후 전체 주문 목록 동기화 요청');
          
          const requestData = {
            senderId: user.id,
            timestamp: new Date().toISOString()
          };
          
          console.log('📤 WebSocket 메시지 전송 - request_all_orders (재연결)');
          console.log('   - 발신자:', requestData.senderId);
          console.log('   - Socket ID:', socket.id);
          console.log('   - 연결 상태:', socket.connected);
          
          socket.emit('request_all_orders', requestData);
        } else {
          console.log('📤 WebSocket 재연결 성공 (로그아웃 상태) - 실시간 동기화 준비 완료');
        }
      });

      socket.on('reconnect_attempt', (attemptNumber) => {
        debugLog('🔄 WebSocket 재연결 시도:', attemptNumber);
      });

      socket.on('reconnect_error', (error) => {
        debugWarn('⚠️ WebSocket 재연결 오류:', error.message);
      });

      socket.on('reconnect_failed', () => {
        debugError('❌ WebSocket 재연결 실패');
        setIsConnected(false);
      });

      // 전체 주문 목록 요청 수신 (다른 클라이언트가 로그인했을 때)
      socket.on('request_all_orders', (data: any) => {
        if (!mounted) return;
        const { senderId } = data;
        const user = currentUserRef.current;
        
        // 로그인 상태이고, 요청한 클라이언트가 아닐 때만 응답
        if (user && senderId !== user.id) {
          debugLog('📤 전체 주문 목록 응답 전송 to', senderId);
          // ordersRef를 통해 최신 주문 목록 참조
          const currentOrders = ordersRef.current;
          
          const responseData = {
            orders: currentOrders.map(o => ({
              ...o,
              requestedAt: o.requestedAt.toISOString(),
              acceptedAt: o.acceptedAt?.toISOString(),
              inProgressAt: o.inProgressAt?.toISOString(),
              completedAt: o.completedAt?.toISOString(),
              memos: o.memos.map(m => ({
                ...m,
                timestamp: m.timestamp.toISOString()
              }))
            })),
            senderId: user.id,
            timestamp: new Date().toISOString()
          };
          
          // WebSocket 메시지 로깅 설정 확인
          const wsMessageLogging = localStorage.getItem('hotelflow_ws_message_logging') === 'true';
        if (wsMessageLogging) {
          debugLog('📤 WebSocket 메시지 전송 - all_orders_response:', {
            senderId: responseData.senderId,
            receiverId: senderId,
            orderCount: responseData.orders.length
          });
        }
          
          socket.emit('all_orders_response', responseData);
        }
      });

      // 전체 주문 목록 응답 수신
      socket.on('all_orders_response', (data: any) => {
        if (!mounted) return;
        const { orders: receivedOrders, senderId } = data;
        const user = currentUserRef.current;
        
        // 로그인 상태일 때만 처리
        if (!user) return;
        
        // 자신이 보낸 응답은 무시
        if (senderId === user.id) return;
        
        // 임시 메시지 처리 중이면 로그만 출력 (메모 병합 로직이 중복을 방지하므로 대기 불필요)
        if (pendingMessagesProcessingRef.current) {
          debugLog('⏳ 임시 메시지 처리 중이지만 전체 주문 동기화 진행 (메모 중복 방지 로직 적용)');
        }
        
        // WebSocket 메시지 로깅 설정 확인
        const wsMessageLogging = localStorage.getItem('hotelflow_ws_message_logging') === 'true';
        
        debugLog(`📥 전체 주문 목록 수신 from ${senderId}, 주문 수: ${receivedOrders?.length || 0}`);
        
        if (!receivedOrders || !Array.isArray(receivedOrders) || receivedOrders.length === 0) {
          debugLog('📭 수신된 주문 목록이 비어있음');
          return;
        }
        
        // 수신된 주문들을 Date 객체로 변환
        const parsedOrders = receivedOrders.map((o: any) => ({
          ...o,
          requestedAt: o.requestedAt ? new Date(o.requestedAt) : new Date(),
          acceptedAt: o.acceptedAt ? new Date(o.acceptedAt) : undefined,
          inProgressAt: o.inProgressAt ? new Date(o.inProgressAt) : undefined,
          completedAt: o.completedAt ? new Date(o.completedAt) : undefined,
          memos: (o.memos && Array.isArray(o.memos)) 
            ? o.memos.map((m: any) => ({ 
                ...m, 
                timestamp: m.timestamp ? new Date(m.timestamp) : new Date() 
              })) 
            : []
        }));
        
        // 기존 주문과 병합 (중복 제거, 최신 정보 우선)
        setOrders(prev => {
          const orderMap = new Map<string, Order>();
          
          // 기존 주문 추가
          prev.forEach(o => {
            orderMap.set(o.id, o);
          });
          
          // 수신된 주문 병합 (최신 정보로 업데이트)
          parsedOrders.forEach((newOrder: Order) => {
            const existing = orderMap.get(newOrder.id);
            if (existing) {
              // 기존 주문이 있으면 메모 병합 및 최신 정보로 업데이트
              // 메모 병합: 기존 메모와 새 메모를 합치되 중복 제거
              // ID 기반 중복 체크
              const existingMemoIds = new Set(existing.memos.map(m => m.id));
              // 텍스트 + 발신자 기반 중복 체크 (타임스탬프는 5초 이내 차이는 같은 메모로 간주)
              const existingMemoKeys = new Set(
                existing.memos.map(m => `${m.text.trim()}|${m.senderId}`)
              );
              const newMemos = newOrder.memos.filter(m => {
                // ID가 이미 있으면 제외
                if (existingMemoIds.has(m.id)) {
                  debugLog('⚠️ [전체 주문 동기화] 중복 메모 무시 (ID):', m.id);
                  return false;
                }
                // 같은 텍스트와 발신자가 있으면 제외 (타임스탬프는 5초 이내 차이 허용)
                const memoKey = `${m.text.trim()}|${m.senderId}`;
                if (existingMemoKeys.has(memoKey)) {
                  // 타임스탬프가 5초 이내 차이면 같은 메모로 간주
                  const existingMemo = existing.memos.find(existing => 
                    `${existing.text.trim()}|${existing.senderId}` === memoKey
                  );
                  if (existingMemo) {
                    const timeDiff = Math.abs(new Date(m.timestamp).getTime() - existingMemo.timestamp.getTime());
                    if (timeDiff < 5000) { // 5초 이내
                      debugLog('⚠️ [전체 주문 동기화] 중복 메모 무시 (내용 + 시간):', m.id, m.text);
                      return false;
                    }
                  } else {
                    debugLog('⚠️ [전체 주문 동기화] 중복 메모 무시 (내용):', m.id, m.text);
                    return false;
                  }
                }
                return true;
              });
              orderMap.set(newOrder.id, {
                ...newOrder,
                memos: [...existing.memos, ...newMemos]
              });
            } else {
              // 새 주문 추가
              orderMap.set(newOrder.id, newOrder);
            }
          });
          
          // 시간순으로 정렬 (최신순)
          const merged = Array.from(orderMap.values()).sort((a, b) => 
            b.requestedAt.getTime() - a.requestedAt.getTime()
          );
          
          debugLog(`✅ 주문 목록 병합 완료: 기존 ${prev.length}개 + 수신 ${parsedOrders.length}개 = 총 ${merged.length}개`);
          return merged;
        });
      });

      // 서버로부터 메시지 수신 (로그인 상태와 무관하게 항상 수신)
      socket.on(SYNC_CHANNEL, (data: any) => {
        if (!mounted) return; // 컴포넌트가 언마운트되면 처리하지 않음
        
        const { type, payload, senderId, sessionId, timestamp } = data;
        
        const user = currentUserRef.current;
        
        // WebSocket 메시지 수신 로그 (디버그 모드에서만)
        debugLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        debugLog('📥 WebSocket 메시지 수신:', type);
        debugLog('   발신자:', senderId, '| 세션:', sessionId);
        debugLog('   로그인:', user ? `${user.name} (${user.dept})` : '로그아웃');
        
        if (type === 'STATUS_UPDATE') {
          debugLog('   주문:', payload?.id, '| 상태:', payload?.status, '| 방:', payload?.roomNo);
        } else if (type === 'NEW_ORDER') {
          debugLog('   주문:', payload?.id, '| 방:', payload?.roomNo, '| 아이템:', payload?.itemName, '| 수량:', payload?.quantity);
        } else if (type === 'NEW_MEMO') {
          debugLog('   주문:', payload?.orderId, '| 메모:', payload?.memo?.text);
        }
        debugLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // currentUserRef를 통해 최신 로그인 상태 확인
        const isLoggedIn = currentUserRef.current !== null;
        
        // 🚨 로그아웃 상태: localStorage만 업데이트하고 pending_messages에 저장
        if (!isLoggedIn) {
          console.log('💾 로그아웃 상태 - localStorage만 업데이트');
          try {
            // localStorage에서 현재 orders 읽기
            const savedOrders = localStorage.getItem(STORAGE_KEY);
            let currentOrders: Order[] = savedOrders ? JSON.parse(savedOrders).map((o: any) => ({
              ...o,
              requestedAt: new Date(o.requestedAt),
              acceptedAt: o.acceptedAt ? new Date(o.acceptedAt) : undefined,
              inProgressAt: o.inProgressAt ? new Date(o.inProgressAt) : undefined,
              completedAt: o.completedAt ? new Date(o.completedAt) : undefined,
              memos: (o.memos && Array.isArray(o.memos)) ? o.memos.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })) : []
            })) : [];
            
            // 메시지 타입에 따라 orders 업데이트
            let updatedOrders = currentOrders;
            
            switch (type) {
              case 'NEW_ORDER': {
                const newOrder = {
                  ...payload,
                  requestedAt: payload.requestedAt ? new Date(payload.requestedAt) : new Date(),
                  acceptedAt: payload.acceptedAt ? new Date(payload.acceptedAt) : undefined,
                  inProgressAt: payload.inProgressAt ? new Date(payload.inProgressAt) : undefined,
                  completedAt: payload.completedAt ? new Date(payload.completedAt) : undefined,
                  memos: payload.memos && Array.isArray(payload.memos) 
                    ? payload.memos.map((m: any) => ({ ...m, timestamp: m.timestamp ? new Date(m.timestamp) : new Date() })) 
                    : []
                };
                const exists = updatedOrders.find(o => o.id === newOrder.id);
                if (!exists) {
                  updatedOrders = [newOrder, ...updatedOrders].sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
                }
                break;
              }
              case 'STATUS_UPDATE': {
                updatedOrders = updatedOrders.map(o => {
                  if (o.id === payload.id) {
                    return {
                      ...o,
                      status: payload.status,
                      acceptedAt: payload.acceptedAt ? new Date(payload.acceptedAt) : o.acceptedAt,
                      inProgressAt: payload.inProgressAt ? new Date(payload.inProgressAt) : o.inProgressAt,
                      completedAt: payload.completedAt ? new Date(payload.completedAt) : o.completedAt,
                      assignedTo: payload.assignedTo !== undefined ? payload.assignedTo : o.assignedTo
                    };
                  }
                  return o;
                });
                break;
              }
              case 'NEW_MEMO': {
                updatedOrders = updatedOrders.map(o => {
                  if (o.id === payload.orderId) {
                    const newMemo = { ...payload.memo, timestamp: new Date(payload.memo.timestamp) };
                    const memoExistsById = o.memos.find(m => m.id === newMemo.id);
                    if (!memoExistsById) {
                      return { ...o, memos: [...o.memos, newMemo] };
                    }
                  }
                  return o;
                });
                break;
              }
            }
            
            // 업데이트된 orders를 localStorage에 저장
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));
            console.log('✅ 로그아웃 상태 - localStorage 업데이트 완료:', type);
            
            // pending_messages에도 저장 (로그인 시 알림 표시용)
            const pendingMessagesKey = 'hotelflow_pending_messages';
            const existing = localStorage.getItem(pendingMessagesKey);
            const pendingMessages = existing ? JSON.parse(existing) : [];
            pendingMessages.push({ type, payload, senderId, timestamp });
            const trimmed = pendingMessages.slice(-1000);
            localStorage.setItem(pendingMessagesKey, JSON.stringify(trimmed));
          } catch (e) {
            console.error('❌ 로그아웃 상태 localStorage 업데이트 실패:', e);
          }
          return; // 로그아웃 상태에서는 UI 업데이트하지 않음
        }

        // 🚨 로그인 상태: UI 업데이트 + 알림 표시 (모든 로그인된 사용자)
      switch (type) {
          case 'NEW_ORDER': {
            try {
          const newOrder = {
            ...payload,
                requestedAt: payload.requestedAt ? new Date(payload.requestedAt) : new Date(),
                acceptedAt: payload.acceptedAt ? new Date(payload.acceptedAt) : undefined,
                inProgressAt: payload.inProgressAt ? new Date(payload.inProgressAt) : undefined,
                completedAt: payload.completedAt ? new Date(payload.completedAt) : undefined,
                memos: payload.memos && Array.isArray(payload.memos) 
                  ? payload.memos.map((m: any) => ({ 
                      ...m, 
                      timestamp: m.timestamp ? new Date(m.timestamp) : new Date() 
                    })) 
                  : []
              };
              
              const user = currentUserRef.current;
              // 같은 사용자 ID + 같은 세션 ID = 같은 기기 → WebSocket 알림 스킵
              const isSelfMessage = senderId === user?.id && sessionId === SESSION_ID;
              
              debugLog('🆕 NEW_ORDER 처리:', user?.name, '| 발신자:', senderId, '| 같은 기기:', isSelfMessage);
              
              // 🚨 UI 업데이트 (모든 로그인된 사용자)
              setOrders(prev => {
                const exists = prev.find(o => o.id === newOrder.id);
                if (exists) {
                  console.log('   기존 주문 발견 - 업데이트');
                  // 자신이 보낸 메시지는 중복 방지를 위해 스킵 (로컬에 이미 추가됨)
                  if (isSelfMessage) {
                    console.log('   자신이 보낸 메시지 - 스킵');
                    return prev;
                  }
                  // 다른 사용자가 보낸 메시지는 업데이트
                  return prev.map(o => o.id === newOrder.id ? newOrder : o);
                }
                // 새 주문 추가
                console.log('   새 주문 추가 - 추가 전:', prev.length, '개');
                const newOrders = [newOrder, ...prev].sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
                console.log('   새 주문 추가 - 추가 후:', newOrders.length, '개');
                return newOrders;
              });
              
              // 🚨 알림 표시: 모든 메시지에 대해 WebSocket 알림 표시
              debugLog('🔔 알림:', newOrder.roomNo, newOrder.itemName, '| 발신자:', senderId);
              triggerToast(
                `${newOrder.roomNo}호 신규 요청: ${newOrder.itemName} (수량: ${newOrder.quantity})`, 
                'info', 
                Department.FRONT_DESK, 
                'NEW_ORDER'
              );
            } catch (error) {
              console.error('❌ NEW_ORDER 처리 오류:', error, payload);
          }
          break;
          }

          case 'STATUS_UPDATE': {
            const user = currentUserRef.current;
            // 같은 사용자 ID + 같은 세션 ID = 같은 기기
            const isSelfMessage = senderId === user?.id && sessionId === SESSION_ID;
            
            console.log('🔄 STATUS_UPDATE 처리 시작');
            console.log('   주문 ID:', payload.id);
            console.log('   새 상태:', payload.status);
            console.log('   방번호:', payload.roomNo);
            console.log('   현재 사용자:', user?.name, `(${user?.dept})`);
            console.log('   자신의 메시지:', isSelfMessage ? 'YES' : 'NO');
            
            // 항상 상태 업데이트 수행 (실시간 동기화 보장)
            setOrders(prev => {
              const found = prev.find(o => o.id === payload.id);
              
              if (!found) {
                console.warn('⚠️ 상태 업데이트 대상 주문을 찾을 수 없음:', payload.id);
                console.warn('   - 현재 주문 목록:', prev.map(o => o.id));
                console.warn('   - 페이로드:', payload);
                
                // 주문이 없으면 localStorage에서 확인
                try {
                  const savedOrders = localStorage.getItem(STORAGE_KEY);
                  if (savedOrders) {
                    const parsed = JSON.parse(savedOrders);
                    const foundInStorage = parsed.find((o: any) => o.id === payload.id);
                    if (foundInStorage) {
                      console.log('💾 localStorage에서 주문 발견, 상태 업데이트 적용');
                      const updatedOrder = {
                        ...foundInStorage,
                        status: payload.status,
                        acceptedAt: payload.acceptedAt ? new Date(payload.acceptedAt) : (foundInStorage.acceptedAt ? new Date(foundInStorage.acceptedAt) : undefined),
                        inProgressAt: payload.inProgressAt ? new Date(payload.inProgressAt) : (foundInStorage.inProgressAt ? new Date(foundInStorage.inProgressAt) : undefined),
                        completedAt: payload.completedAt ? new Date(payload.completedAt) : (foundInStorage.completedAt ? new Date(foundInStorage.completedAt) : undefined),
                        assignedTo: payload.assignedTo !== undefined ? payload.assignedTo : foundInStorage.assignedTo,
                        memos: payload.memos ? payload.memos.map((m: any) => ({ 
                          ...m, 
                          timestamp: m.timestamp ? new Date(m.timestamp) : new Date() 
                        })) : (foundInStorage.memos || []).map((m: any) => ({ 
                          ...m, 
                          timestamp: m.timestamp ? new Date(m.timestamp) : new Date() 
                        })),
                        requestedAt: foundInStorage.requestedAt ? new Date(foundInStorage.requestedAt) : new Date()
                      };
                      const newOrders = [updatedOrder, ...prev].sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
                      localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrders));
                      console.log('✅ localStorage에서 주문 복원 후 상태 업데이트 완료');
                      return newOrders;
                    }
                  }
                } catch (e) {
                  console.warn('⚠️ localStorage 확인 실패:', e);
                }
                
                console.warn('⚠️ 주문을 찾을 수 없어 상태 업데이트 스킵:', payload.id);
                return prev;
              }
              
              // 모든 메시지를 항상 처리 (실시간 동기화 보장)
              // 자신이 보낸 메시지도 다른 기기에서 동기화를 위해 항상 업데이트
              const updated = prev.map(o => {
                if (o.id === payload.id) {
                  // 메모 병합: 기존 메모와 새 메모를 합치되 중복 제거
                  const existingMemoIds = new Set(o.memos.map(m => m.id));
                  const existingMemoKeys = new Set(o.memos.map(m => `${m.text.trim()}|${m.senderId}`));
                  const newMemos = (payload.memos || []).filter((m: any) => {
                    if (existingMemoIds.has(m.id)) return false;
                    const memoKey = `${m.text.trim()}|${m.senderId}`;
                    if (existingMemoKeys.has(memoKey)) {
                      const existingMemo = o.memos.find(existing => `${existing.text.trim()}|${existing.senderId}` === memoKey);
                      if (existingMemo) {
                        const timeDiff = Math.abs(new Date(m.timestamp).getTime() - new Date(existingMemo.timestamp).getTime());
                        if (timeDiff < 5000) return false; // 5초 이내 중복 메모 제외
                      }
                      return false;
                    }
                    return true;
                  });
                  
                  // 항상 최신 정보로 업데이트 (실시간 동기화 보장)
                  // 상태, 타임스탬프, 메모, 할당 등 모든 정보를 최신으로 유지
                  const updatedOrder = { 
                    ...o, 
                    status: payload.status,
                    acceptedAt: payload.acceptedAt ? new Date(payload.acceptedAt) : o.acceptedAt,
                    inProgressAt: payload.inProgressAt ? new Date(payload.inProgressAt) : o.inProgressAt,
                    completedAt: payload.completedAt ? new Date(payload.completedAt) : o.completedAt,
                    assignedTo: payload.assignedTo !== undefined ? payload.assignedTo : o.assignedTo,
                    memos: [...o.memos, ...newMemos.map((m: any) => ({ 
                      ...m, 
                      timestamp: m.timestamp ? new Date(m.timestamp) : new Date() 
                    }))]
                  };
                  
                  console.log('✅ 상태 업데이트 완료:', payload.id, o.status, '->', updatedOrder.status, isSelfMessage ? '(자신의 메시지 - 다른 기기 동기화)' : '(다른 사용자)');
                  console.log('   - 변경 전 상태:', o.status);
                  console.log('   - 변경 후 상태:', updatedOrder.status);
                  console.log('   - 새 메모 수:', newMemos.length);
                  return updatedOrder;
                }
                return o;
              });
              
              // localStorage에도 즉시 저장 (PC와 모바일 동기화 보장)
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                console.log('💾 상태 업데이트 후 localStorage 저장 완료');
              } catch (e) {
                console.warn('⚠️ localStorage 저장 실패:', e);
              }
              
              return updated;
            });
            
            // 🚨 알림 표시: 모든 상태 변경에 대해 알림 표시
            debugLog('🔔 상태 변경 알림:', payload.status, '| 방:', payload.roomNo);
            const effect: SoundEffect = payload.status === OrderStatus.COMPLETED ? 'SUCCESS' : 'UPDATE';
            const toastType = payload.status === OrderStatus.COMPLETED ? 'success' : payload.status === OrderStatus.CANCELLED ? 'warning' : 'info';
            const statusText = payload.status === OrderStatus.CANCELLED ? '취소됨' 
              : payload.status === OrderStatus.COMPLETED ? '완료됨'
              : payload.status === OrderStatus.IN_PROGRESS ? '진행중'
              : payload.status === OrderStatus.ACCEPTED ? '접수됨'
              : payload.status;
            triggerToast(
              `${payload.roomNo}호 상태 변경: ${statusText}`, 
              toastType, 
              payload.status === OrderStatus.COMPLETED ? Department.HOUSEKEEPING : undefined, 
              effect
            );
            console.log('✅ 알림 표시 완료');
            break;
          }

          case 'NEW_MEMO': {
            const user = currentUserRef.current;
            // 같은 사용자 ID + 같은 세션 ID = 같은 기기
            const isSelfMemo = payload.memo.senderId === user?.id && sessionId === SESSION_ID;
            
            console.log('💬 NEW_MEMO 처리 시작');
            console.log('   주문 ID:', payload.orderId);
            console.log('   메모 내용:', payload.memo.text);
            console.log('   작성자:', payload.memo.senderName, `(${payload.memo.senderDept})`);
            console.log('   현재 사용자:', user?.name, `(${user?.dept})`);
            console.log('   자신의 메모:', isSelfMemo ? 'YES' : 'NO');
            
            // 🚨 UI 업데이트 (모든 로그인된 사용자)
            let foundRoomNo: string | null = null;
            setOrders(prev => {
              const found = prev.find(o => o.id === payload.orderId);
              if (!found) {
                console.warn('   ⚠️ 주문을 찾을 수 없음');
                return prev;
              }
              
              const updated = prev.map(o => {
                if (o.id === payload.orderId) {
                  foundRoomNo = o.roomNo;
                  const newMemo = { ...payload.memo, timestamp: new Date(payload.memo.timestamp) };
                  
                  // ID 기반 중복 체크
                  const memoExistsById = o.memos.find(m => m.id === newMemo.id);
                  if (memoExistsById) {
                    console.log('   ⏭️  중복 메모 - 스킵');
                    return o;
                  }
                  
                  console.log('   ✅ 메모 추가');
                  return { ...o, memos: [...o.memos, newMemo] };
                }
                return o;
              });
              
              if (!foundRoomNo) {
                const targetOrder = updated.find(o => o.id === payload.orderId);
                foundRoomNo = targetOrder ? targetOrder.roomNo : null;
              }
              return updated;
            });
            
            // 🚨 알림 표시: 모든 메모에 대해 알림 표시
            const roomDisplay = foundRoomNo ? `${foundRoomNo}호` : `#${payload.orderId}`;
            debugLog('🔔 메모 알림:', roomDisplay, '|', payload.memo.text);
            triggerToast(
              `${roomDisplay} 새 메모: ${payload.memo.text}`, 
              'memo', 
              payload.memo.senderDept, 
              'MEMO'
            );
            break;
          }

          case 'USER_ADD': {
            console.log('📥 사용자 추가 수신:', payload.name, 'from', senderId);
            const user = currentUserRef.current;
            // 같은 사용자 ID + 같은 세션 ID = 같은 기기
            const isSelfMessage = senderId === user?.id && sessionId === SESSION_ID;
            // 🚨 로그인/로그아웃 상태 모두에서 사용자 목록 업데이트 (모바일 로그인 화면에서도 동기화)
            setUsers(prev => {
              // 이미 존재하는 사용자인지 확인
              const exists = prev.find(u => u.id === payload.id);
              if (exists) {
                console.log('⚠️ 사용자가 이미 존재함:', payload.id, isSelfMessage ? '(자신이 보낸 메시지)' : '(다른 사용자)');
                return prev;
              }
              console.log('✅ 새 사용자 추가:', payload.name, isSelfMessage ? '(자신이 보낸 메시지)' : '(다른 사용자)', user ? '(로그인 상태)' : '(로그아웃 상태)');
              const updated = [...prev, payload];
              // localStorage에 저장 (앱 재시작 시에도 유지)
              try {
                localStorage.setItem('hotelflow_users_v1', JSON.stringify(updated));
              } catch (e) {
                console.warn('⚠️ localStorage에 users 저장 실패:', e);
              }
              return updated;
            });
            // 모든 기기에서 알림 표시 (로그인/로그아웃 상태 모두 포함)
            triggerToast(`새 직원 등록됨: ${payload.name}`, 'success', Department.ADMIN, 'SUCCESS');
            console.log('🔔 사용자 추가 알림 표시:', payload.name, isSelfMessage ? '(자신이 보낸 메시지)' : '(다른 사용자)', user ? '(로그인 상태)' : '(로그아웃 상태)');
            break;
          }

          case 'USER_UPDATE': {
            console.log('📥 사용자 수정 수신:', payload.name, 'from', senderId);
            const user = currentUserRef.current;
            // 같은 사용자 ID + 같은 세션 ID = 같은 기기
            const isSelfMessage = senderId === user?.id && sessionId === SESSION_ID;
            // 🚨 로그인/로그아웃 상태 모두에서 사용자 목록 업데이트 (모바일 로그인 화면에서도 동기화)
            setUsers(prev => {
              const exists = prev.find(u => u.id === payload.id);
              if (!exists) {
                console.log('⚠️ 수정할 사용자를 찾을 수 없음:', payload.id, isSelfMessage ? '(자신이 보낸 메시지)' : '(다른 사용자)');
                return prev;
              }
              console.log('✅ 사용자 정보 업데이트:', payload.name, isSelfMessage ? '(자신이 보낸 메시지)' : '(다른 사용자)', user ? '(로그인 상태)' : '(로그아웃 상태)');
              const updated = prev.map(u => u.id === payload.id ? payload : u);
              // localStorage에 저장 (앱 재시작 시에도 유지)
              try {
                localStorage.setItem('hotelflow_users_v1', JSON.stringify(updated));
              } catch (e) {
                console.warn('⚠️ localStorage에 users 저장 실패:', e);
              }
              return updated;
            });
            // 모든 기기에서 알림 표시 (로그인/로그아웃 상태 모두 포함)
            triggerToast(`직원 정보 수정됨: ${payload.name}`, 'info', Department.ADMIN, 'UPDATE');
            console.log('🔔 사용자 수정 알림 표시:', payload.name, isSelfMessage ? '(자신이 보낸 메시지)' : '(다른 사용자)', user ? '(로그인 상태)' : '(로그아웃 상태)');
            break;
          }

          case 'USER_DELETE': {
            console.log('📥 사용자 삭제 수신:', payload.userId, 'from', senderId);
            const user = currentUserRef.current;
            // 같은 사용자 ID + 같은 세션 ID = 같은 기기
            const isSelfMessage = senderId === user?.id && sessionId === SESSION_ID;
            let deletedUserName = '직원';
            // 🚨 로그인/로그아웃 상태 모두에서 사용자 목록 업데이트 (모바일 로그인 화면에서도 동기화)
            setUsers(prev => {
              const exists = prev.find(u => u.id === payload.userId);
              if (!exists) {
                console.log('⚠️ 삭제할 사용자를 찾을 수 없음:', payload.userId, isSelfMessage ? '(자신이 보낸 메시지)' : '(다른 사용자)');
                return prev;
              }
              deletedUserName = exists.name;
              console.log('✅ 사용자 삭제:', payload.userId, isSelfMessage ? '(자신이 보낸 메시지)' : '(다른 사용자)', user ? '(로그인 상태)' : '(로그아웃 상태)');
              const updated = prev.filter(u => u.id !== payload.userId);
              // localStorage에 저장 (앱 재시작 시에도 유지)
              try {
                localStorage.setItem('hotelflow_users_v1', JSON.stringify(updated));
              } catch (e) {
                console.warn('⚠️ localStorage에 users 저장 실패:', e);
              }
              return updated;
            });
            // 모든 기기에서 알림 표시 (로그인/로그아웃 상태 모두 포함)
            triggerToast(`직원 계정이 삭제되었습니다: ${deletedUserName}`, 'warning', Department.ADMIN, 'CANCEL');
            console.log('🔔 사용자 삭제 알림 표시:', deletedUserName, isSelfMessage ? '(자신이 보낸 메시지)' : '(다른 사용자)', user ? '(로그인 상태)' : '(로그아웃 상태)');
            break;
          }
        }
      });

    } catch (error) {
      console.warn('⚠️ WebSocket 초기화 실패:', error);
      setIsConnected(false);
    }

    return () => {
      mounted = false;
      // 컴포넌트 언마운트 시에만 연결 해제 (로그아웃 시에는 해제하지 않음)
      if (socketRef.current) {
        debugLog('🧹 WebSocket 연결 정리 (컴포넌트 언마운트)');
        socketRef.current.off(SYNC_CHANNEL);
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
    };
  }, [triggerToast, syncOfflineQueue]); // triggerToast와 syncOfflineQueue를 의존성에 추가

  // PC와 모바일에서 동일하게 동작: 네트워크 상태 변화 감지 및 자동 재연결
  useEffect(() => {
    const handleOnline = () => {
      debugLog('🌐 네트워크 온라인 감지: WebSocket 재연결 시도');
      if (socketRef.current && !socketRef.current.connected) {
        socketRef.current.connect();
      }
    };

    const handleOffline = () => {
      debugLog('📴 네트워크 오프라인 감지');
      setIsConnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // PC와 모바일에서 동일하게 동작: 페이지 가시성 변화 감지 및 자동 재연결 (모바일 앱 전환 시)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        debugLog('👁️ 페이지 가시성 복원: WebSocket 상태 확인 및 재연결 시도');
        // 페이지가 다시 보이면 WebSocket 연결 상태 확인 및 재연결
        if (socketRef.current) {
          if (!socketRef.current.connected) {
            debugLog('🔄 페이지 가시성 복원 후 WebSocket 재연결 시도');
            socketRef.current.connect();
          } else {
            // 연결되어 있으면 오프라인 큐 동기화
            syncOfflineQueue();
            
            // 로그인 상태이고 연결 성공 시 전체 주문 목록 동기화 요청
            const user = currentUserRef.current;
            if (user && socketRef.current.connected) {
              debugLog('📤 페이지 가시성 복원 후 전체 주문 목록 동기화 요청');
              socketRef.current.emit('request_all_orders', {
                senderId: user.id,
                timestamp: new Date().toISOString()
              });
            }
          }
        }
      } else {
        debugLog('👁️ 페이지 가시성 손실 (백그라운드로 전환)');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 모바일 브라우저에서도 동작하도록 focus/blur 이벤트도 처리
    const handleFocus = () => {
      debugLog('🎯 윈도우 포커스: WebSocket 상태 확인');
      if (socketRef.current && !socketRef.current.connected) {
        socketRef.current.connect();
      } else if (socketRef.current && socketRef.current.connected) {
        syncOfflineQueue();
        const user = currentUserRef.current;
        if (user) {
          socketRef.current.emit('request_all_orders', {
            senderId: user.id,
            timestamp: new Date().toISOString()
          });
        }
      }
    };

    const handleBlur = () => {
      debugLog('🎯 윈도우 블러 (백그라운드로 전환)');
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [syncOfflineQueue]);

  // 로그인 시 localStorage의 최신 orders를 상태에 복원 (실시간 동기화 보장)
  useEffect(() => {
    if (!currentUser) return; // 로그아웃 상태에서는 실행하지 않음

    debugLog('🔓 로그인 감지: localStorage의 최신 orders 복원 및 임시 저장된 메시지 적용 시작');
    
    // 1. localStorage에서 최신 orders 읽어서 상태 복원 (로그아웃 중에 업데이트된 데이터 반영)
    try {
      const savedOrders = localStorage.getItem(STORAGE_KEY);
      if (savedOrders) {
        const parsed = JSON.parse(savedOrders);
        const restoredOrders = parsed.map((o: any) => ({
          ...o,
          requestedAt: new Date(o.requestedAt),
          acceptedAt: o.acceptedAt ? new Date(o.acceptedAt) : undefined,
          inProgressAt: o.inProgressAt ? new Date(o.inProgressAt) : undefined,
          completedAt: o.completedAt ? new Date(o.completedAt) : undefined,
          memos: (o.memos && Array.isArray(o.memos)) ? o.memos.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })) : []
        }));
        setOrders(restoredOrders);
        debugLog(`✅ localStorage에서 ${restoredOrders.length}개의 orders 복원 완료`);
      }
    } catch (e) {
      debugWarn('⚠️ localStorage orders 복원 실패:', e);
    }

    // 2. 임시 저장된 메시지들을 적용 (알림 표시용)
    debugLog('🔓 로그인 감지: 임시 저장된 메시지 적용 시작');
    try {
      const pendingMessagesKey = 'hotelflow_pending_messages';
      const saved = localStorage.getItem(pendingMessagesKey);
      if (!saved) {
        debugLog('📭 임시 저장된 메시지 없음');
        return;
      }

      const pendingMessages = JSON.parse(saved);
      debugLog(`📦 ${pendingMessages.length}개의 임시 메시지 발견`);

      // 메시지들을 시간순으로 정렬하여 순차적으로 적용
      const sortedMessages = pendingMessages.sort((a: any, b: any) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      sortedMessages.forEach((data: any) => {
        const { type, payload, senderId } = data;
        debugLog('📥 임시 메시지 적용:', type, 'from', senderId);

        switch (type) {
          case 'NEW_ORDER':
            try {
              const newOrder = {
                ...payload,
                requestedAt: payload.requestedAt ? new Date(payload.requestedAt) : new Date(),
                acceptedAt: payload.acceptedAt ? new Date(payload.acceptedAt) : undefined,
                inProgressAt: payload.inProgressAt ? new Date(payload.inProgressAt) : undefined,
                completedAt: payload.completedAt ? new Date(payload.completedAt) : undefined,
                memos: payload.memos && Array.isArray(payload.memos) 
                  ? payload.memos.map((m: any) => ({ 
                      ...m, 
                      timestamp: m.timestamp ? new Date(m.timestamp) : new Date() 
                    })) 
                  : []
              };
              setOrders(prev => {
                const exists = prev.find(o => o.id === newOrder.id);
                if (exists) {
                  // 기존 주문이 있으면 메모 병합 (중복 제거)
                  return prev.map(o => {
                    if (o.id === newOrder.id) {
                      // 메모 병합: 기존 메모와 새 메모를 합치되 중복 제거
                      // ID 기반 중복 체크
                      const existingMemoIds = new Set(o.memos.map(m => m.id));
                      // 텍스트 + 발신자 기반 중복 체크 (타임스탬프는 5초 이내 차이는 같은 메모로 간주)
                      const existingMemoKeys = new Set(
                        o.memos.map(m => `${m.text.trim()}|${m.senderId}`)
                      );
                      const newMemos = newOrder.memos.filter(m => {
                        // ID가 이미 있으면 제외
                        if (existingMemoIds.has(m.id)) {
                          debugLog('⚠️ [임시 메시지] 중복 메모 무시 (ID):', m.id);
                          return false;
                        }
                        // 같은 텍스트와 발신자가 있으면 제외 (타임스탬프는 5초 이내 차이 허용)
                        const memoKey = `${m.text.trim()}|${m.senderId}`;
                        if (existingMemoKeys.has(memoKey)) {
                          // 타임스탬프가 5초 이내 차이면 같은 메모로 간주
                          const existingMemo = o.memos.find(existing => 
                            `${existing.text.trim()}|${existing.senderId}` === memoKey
                          );
                          if (existingMemo) {
                            const timeDiff = Math.abs(new Date(m.timestamp).getTime() - existingMemo.timestamp.getTime());
                            if (timeDiff < 5000) { // 5초 이내
                              debugLog('⚠️ [임시 메시지] 중복 메모 무시 (내용 + 시간):', m.id, m.text);
                              return false;
                            }
                          } else {
                            debugLog('⚠️ [임시 메시지] 중복 메모 무시 (내용):', m.id, m.text);
                            return false;
                          }
                        }
                        return true;
                      });
                      return {
                        ...o,
                        memos: [...o.memos, ...newMemos]
                      };
                    }
                    return o;
                  });
                }
                // 최신순으로 정렬하여 반환
                return [newOrder, ...prev].sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
              });
            } catch (error) {
              console.error('❌ 임시 NEW_ORDER 처리 오류:', error);
            }
            break;

          case 'STATUS_UPDATE':
            setOrders(prev => prev.map(o => {
              if (o.id === payload.id) {
                return { 
                  ...o, 
                  status: payload.status,
                  acceptedAt: payload.acceptedAt ? new Date(payload.acceptedAt) : o.acceptedAt,
                  inProgressAt: payload.inProgressAt ? new Date(payload.inProgressAt) : o.inProgressAt,
                  completedAt: payload.completedAt ? new Date(payload.completedAt) : o.completedAt,
                  assignedTo: payload.assignedTo || o.assignedTo,
                  memos: payload.memos ? payload.memos.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })) : o.memos
                };
              }
              return o;
            }));
            break;

          case 'NEW_MEMO':
            setOrders(prev => {
              return prev.map(o => {
                if (o.id === payload.orderId) {
                  const newMemo = { ...payload.memo, timestamp: new Date(payload.memo.timestamp) };
                  
                  // ID 기반 중복 체크
                  const memoExistsById = o.memos.find(m => m.id === newMemo.id);
                  if (memoExistsById) {
                    debugLog('⚠️ [임시 메시지] 중복 메모 무시 (ID):', newMemo.id);
                    return o;
                  }
                  
                  // 텍스트 + 발신자 기반 중복 체크 (타임스탬프는 5초 이내 차이는 같은 메모로 간주)
                  const memoKey = `${newMemo.text.trim()}|${newMemo.senderId}`;
                  const existingMemo = o.memos.find(m => 
                    `${m.text.trim()}|${m.senderId}` === memoKey
                  );
                  if (existingMemo) {
                    // 타임스탬프가 5초 이내 차이면 같은 메모로 간주
                    const timeDiff = Math.abs(newMemo.timestamp.getTime() - existingMemo.timestamp.getTime());
                    if (timeDiff < 5000) { // 5초 이내
                      debugLog('⚠️ [임시 메시지] 중복 메모 무시 (내용 + 시간):', newMemo.id, newMemo.text);
                      return o;
                    }
                  }
                  
                  return {
                    ...o,
                    memos: [...o.memos, newMemo]
                  };
                }
                return o;
              });
            });
            break;
        }
      });

      // 적용 완료 후 임시 메시지 삭제
      localStorage.removeItem(pendingMessagesKey);
      debugLog('✅ 임시 메시지 적용 완료 및 삭제');
      pendingMessagesProcessingRef.current = false;

    } catch (error) {
      console.error('❌ 임시 메시지 적용 오류:', error);
      pendingMessagesProcessingRef.current = false;
    }
  }, [currentUser]); // currentUser가 변경될 때마다 실행 (로그인 시)

  const handleLogin = (user: User) => {
    currentUserRef.current = user;
    setCurrentUser(user);
    triggerToast(`${user.name} 님이 로그인했습니다.`, 'success', user.dept, 'LOGIN');
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // 로그인 후 CONTROL CENTER 페이지로 리다이렉트
    if (typeof window !== 'undefined') {
      window.location.hash = '#/';
    }
    
    // 로그인 시 전체 주문 목록 동기화 요청
    const socket = socketRef.current;
    if (socket && socket.connected) {
      debugLog('📤 전체 주문 목록 동기화 요청');
      
      const requestData = {
        senderId: user.id,
        timestamp: new Date().toISOString()
      };
      
      // WebSocket 메시지 로깅 설정 확인
      const wsMessageLogging = localStorage.getItem('hotelflow_ws_message_logging') === 'true';
      if (wsMessageLogging) {
        console.group('📤 WebSocket 메시지 전송 (상세) - request_all_orders (로그인)');
        console.log('타입: request_all_orders');
        console.log('발신자:', requestData.senderId);
        console.log('타임스탬프:', requestData.timestamp);
        console.log('Socket ID:', socket.id);
        console.log('연결 상태:', socket.connected);
        console.groupEnd();
      }
      
      socket.emit('request_all_orders', requestData);
    }
  };

  const handleLogout = () => {
    // 로그아웃 시 Settings 잠금 해제 상태 초기화
    try {
      localStorage.removeItem('hotelflow_debug_logging_unlocked');
      localStorage.removeItem('hotelflow_ws_logging_unlocked');
    } catch (e) {
      console.warn('Failed to reset Settings unlock states:', e);
    }
    currentUserRef.current = null;
    setCurrentUser(null);
  };

  const handleCreateOrder = (newOrderData: Partial<Order>) => {
    if (!currentUser) return;
    
    const roomNo = newOrderData.roomNo || '';
    const itemName = newOrderData.itemName || '';
    const now = new Date();
    
    // 함수형 업데이트를 사용하여 최신 상태에서 중복 체크 및 주문 생성
    setOrders(prev => {
      // 중복 주문 방지: 같은 방번호, 같은 아이템, 같은 사용자가 최근 2초 이내에 생성한 주문이 있는지 확인
      const recentDuplicate = prev.find(o => 
        o.roomNo === roomNo && 
        o.itemName === itemName && 
        o.createdBy === currentUser.id &&
        o.status === OrderStatus.REQUESTED &&
        Math.abs(now.getTime() - o.requestedAt.getTime()) < 2000 // 2초 이내
      );
      
      if (recentDuplicate) {
        console.warn('⚠️ 중복 주문 방지:', roomNo, itemName, '최근 주문 ID:', recentDuplicate.id);
        // 토스트는 비동기로 표시 (상태 업데이트 외부에서)
        setTimeout(() => {
          triggerToast(`${roomNo}호 ${itemName} 주문이 이미 생성되었습니다.`, 'warning', currentUser.dept, 'ALERT');
        }, 0);
        return prev; // 상태 변경 없이 반환
      }
      
      // 최신 주문 목록을 사용하여 ID 생성
      const newId = generateOrderId(prev);
      
    const initialMemos: Memo[] = [];
      if (newOrderData.requestNote && newOrderData.requestNote.trim()) {
        // 주문 ID를 포함한 고유한 메모 ID 생성 (동일 주문의 동일 메모는 같은 ID를 가지도록)
        const orderIdPrefix = generateOrderId(prev).split('_')[0]; // 날짜 부분만 사용
        const memoId = `MEMO-${orderIdPrefix}-${Date.now()}-${currentUser.id}-${Math.random().toString(36).substr(2, 6)}`;
      initialMemos.push({
          id: memoId,
          text: newOrderData.requestNote.trim(),
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderDept: currentUser.dept,
          timestamp: now
      });
    }

    const order: Order = {
      id: newId,
        roomNo: roomNo,
      guestName: newOrderData.guestName || '',
      category: newOrderData.category || 'Amenities',
        itemName: itemName,
      quantity: newOrderData.quantity || 1,
      priority: newOrderData.priority || Priority.NORMAL,
      status: OrderStatus.REQUESTED,
        requestedAt: now,
      createdBy: currentUser.id,
      requestChannel: newOrderData.requestChannel || 'Phone',
      memos: initialMemos
    };

      debugLog('📝 새 주문 생성:', order.id, order.roomNo, order.itemName, order.quantity);
      
      // 중복 체크 (같은 ID가 이미 있는지 확인)
      const exists = prev.find(o => o.id === order.id);
      if (exists) {
        debugWarn('⚠️ 주문 ID 중복:', order.id, '기존 주문 유지');
        return prev;
      }
      
      // 최신순으로 정렬 (위에서 아래로: 가장 최근 주문이 위에)
      const newOrders = [order, ...prev].sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
      debugLog('✅ 주문 상태 업데이트 완료:', order.id, '총 주문 수:', newOrders.length);
      debugLog('   - 방번호:', order.roomNo);
      debugLog('   - 아이템:', order.itemName);
      debugLog('   - 수량:', order.quantity);
      debugLog('   - 상태:', order.status);
      
      // 🚨 로컬 알림 제거: WebSocket 알림만 사용하여 중복 방지
      // 모든 기기(생성한 기기 포함)에서 WebSocket을 통해 알림을 받음
      
      // 브로드캐스트는 비동기로 수행 (상태 업데이트 후)
      setTimeout(() => {
        const socket = socketRef.current;
        
        // 오프라인 큐에 저장하는 함수
        const saveToOfflineQueue = (type: string, payload: any, senderId: string) => {
          try {
            const existing = localStorage.getItem(OFFLINE_QUEUE_KEY);
            const queue = existing ? JSON.parse(existing) : [];
            
            const message = {
              type,
              payload: {
                ...payload,
                requestedAt: payload.requestedAt?.toISOString(),
                acceptedAt: payload.acceptedAt?.toISOString(),
                inProgressAt: payload.inProgressAt?.toISOString(),
                completedAt: payload.completedAt?.toISOString(),
                memos: payload.memos?.map((m: any) => ({
                  ...m,
                  timestamp: m.timestamp?.toISOString()
                })) || []
              },
              senderId,
              sessionId: SESSION_ID,
              timestamp: new Date().toISOString()
            };
            
            // 🚨 중복 체크: 같은 타입 + 같은 ID의 메시지가 이미 큐에 있으면 스킵
            const messageId = payload.id || payload.orderId;
            const isDuplicate = queue.some((m: any) => 
              m.type === type && 
              (m.payload.id === messageId || m.payload.orderId === messageId)
            );
            
            if (isDuplicate) {
              debugLog('⏭️ 오프라인 큐 중복 스킵:', type, messageId);
              return;
            }
            
            queue.push(message);
            // 최대 500개까지만 저장 (메모리 효율)
            const trimmed = queue.slice(-500);
            localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(trimmed));
            debugLog('💾 오프라인 큐 저장:', type, messageId, '| 크기:', trimmed.length);
          } catch (e) {
            console.error('❌ 오프라인 큐 저장 실패:', e);
            // localStorage quota 초과 시 큐 초기화
            if (e instanceof Error && e.name === 'QuotaExceededError') {
              console.warn('⚠️ localStorage 용량 초과, 오프라인 큐 초기화');
              localStorage.removeItem(OFFLINE_QUEUE_KEY);
            }
          }
        };

        if (!socket) {
          console.warn('⚠️ WebSocket 소켓이 없음, 오프라인 큐에 저장');
          saveToOfflineQueue('NEW_ORDER', order, currentUser.id);
          return;
        }

        if (socket.connected) {
          debugLog('📤 주문 브로드캐스트:', order.id, '| 방:', order.roomNo, '| 아이템:', order.itemName);
          
          try {
            const payload = {
              ...order,
              requestedAt: order.requestedAt.toISOString(),
              acceptedAt: order.acceptedAt?.toISOString(),
              inProgressAt: order.inProgressAt?.toISOString(),
              completedAt: order.completedAt?.toISOString(),
              memos: order.memos.map(m => ({
                ...m,
                timestamp: m.timestamp.toISOString()
              }))
            };
            
            const message = {
              type: 'NEW_ORDER',
              payload,
              senderId: currentUser.id,
              sessionId: SESSION_ID,
              timestamp: new Date().toISOString()
            };
            
            // 메시지 전송 (실시간 동기화)
            socket.emit(SYNC_CHANNEL, message);
            debugLog('✅ 브로드캐스트 완료:', order.id);
            
            // 전송 확인을 위한 짧은 딜레이 후 연결 상태 확인
            setTimeout(() => {
              if (!socket.connected) {
                console.error('❌ 메시지 전송 후 WebSocket 연결 끊김 감지');
                console.error('   - 재연결 시도 필요');
              } else {
                console.log('✅ 메시지 전송 후 WebSocket 연결 유지 확인');
              }
            }, 100);
          } catch (error) {
            console.error('❌ 브로드캐스트 전송 실패:', error);
            console.error('   - Socket ID:', socket.id);
            console.error('   - 연결 상태:', socket.connected);
            console.error('   - 에러 상세:', error);
            // 오프라인 큐에 저장
            saveToOfflineQueue('NEW_ORDER', order, currentUser.id);
          }
        } else {
          console.warn('⚠️ WebSocket 연결되지 않음, 오프라인 큐에 저장:', order.id, order.roomNo);
          console.warn('   - Socket ID:', socket.id);
          console.warn('   - 연결 상태:', socket.connected);
          // 오프라인 큐에 저장
          saveToOfflineQueue('NEW_ORDER', order, currentUser.id);
          
          // 연결 시도
          if (!socket.connected) {
            console.log('🔄 WebSocket 재연결 시도');
            socket.connect();
          }
        }
      }, 0);
      
      return newOrders;
    });
    
    // setCreateModalOpen은 OrderCreateModal에서만 사용되므로 여기서는 호출하지 않음
    // (RapidOrder에서는 사용되지 않음)
  };

  const handleUpdateStatus = (orderId: string, nextStatus: OrderStatus, note?: string) => {
    if (!currentUser) return;
    
    // 현재 주문 찾기
    const currentOrder = orders.find(o => o.id === orderId);
    if (!currentOrder) {
      console.warn('⚠️ 주문을 찾을 수 없음:', orderId);
      return;
    }

    // 업데이트된 주문 데이터 미리 계산 (WebSocket 브로드캐스트용)
    let updatedPayload: any = {
      id: orderId,
      roomNo: currentOrder.roomNo,
      status: nextStatus,
      assignedTo: undefined,
      acceptedAt: undefined,
      inProgressAt: undefined,
      completedAt: undefined,
      memos: [...currentOrder.memos]
    };

    // 메모 추가
    if (note && note.trim()) {
      updatedPayload.memos = [
        ...currentOrder.memos,
        {
          id: `MEMO-${Date.now()}`,
          text: note,
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderDept: currentUser.dept,
          timestamp: new Date()
        }
      ];
    }

    // 상태별 타임스탬프 설정
    if (nextStatus === OrderStatus.REQUESTED) {
      // REQUESTED로 되돌릴 때 모든 타임스탬프 초기화
      updatedPayload.acceptedAt = undefined;
      updatedPayload.inProgressAt = undefined;
      updatedPayload.completedAt = undefined;
      updatedPayload.assignedTo = undefined;
    } else if (nextStatus === OrderStatus.ACCEPTED) {
      updatedPayload.acceptedAt = new Date();
      updatedPayload.assignedTo = currentUser.id;
      updatedPayload.inProgressAt = undefined;
      updatedPayload.completedAt = undefined;
    } else if (nextStatus === OrderStatus.IN_PROGRESS) {
      updatedPayload.inProgressAt = new Date();
      updatedPayload.acceptedAt = currentOrder.acceptedAt || new Date();
      updatedPayload.assignedTo = currentOrder.assignedTo || currentUser.id;
      updatedPayload.completedAt = undefined;
    } else if (nextStatus === OrderStatus.COMPLETED) {
      updatedPayload.completedAt = new Date();
      updatedPayload.inProgressAt = currentOrder.inProgressAt || new Date();
      updatedPayload.acceptedAt = currentOrder.acceptedAt || new Date();
      updatedPayload.assignedTo = currentOrder.assignedTo || currentUser.id;
    } else if (nextStatus === OrderStatus.CANCELLED) {
      updatedPayload.assignedTo = undefined;
      updatedPayload.acceptedAt = undefined;
      updatedPayload.inProgressAt = undefined;
      updatedPayload.completedAt = undefined;
    }

    // 상태 업데이트
    setOrders(prevOrders => {
      return prevOrders.map(order => {
        if (order.id === orderId) {
          return {
            ...order,
            status: nextStatus,
            acceptedAt: updatedPayload.acceptedAt,
            inProgressAt: updatedPayload.inProgressAt,
            completedAt: updatedPayload.completedAt,
            assignedTo: updatedPayload.assignedTo,
            memos: updatedPayload.memos
          };
        }
        return order;
      });
    });

    // 로컬에서 토스트 생성하지 않음 - WebSocket을 통해 모든 기기에서 알림 표시
    // (로컬 기기 포함하여 모든 기기에서 WebSocket 메시지를 받아 알림 표시)

    // BROADCAST via WebSocket (PC와 모바일 모두에서 동기화 보장)
    const socket = socketRef.current;
    const message = {
      type: 'STATUS_UPDATE',
      payload: {
        ...updatedPayload,
        acceptedAt: updatedPayload.acceptedAt?.toISOString(),
        inProgressAt: updatedPayload.inProgressAt?.toISOString(),
        completedAt: updatedPayload.completedAt?.toISOString(),
        memos: updatedPayload.memos?.map((m: any) => ({
          ...m,
          timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : (m.timestamp || new Date().toISOString())
        })) || []
      },
      senderId: currentUser.id,
      sessionId: SESSION_ID,
      timestamp: new Date().toISOString()
    };
    
    if (socket?.connected) {
      // WebSocket 메시지 로깅 설정 확인
      const wsMessageLogging = localStorage.getItem('hotelflow_ws_message_logging') === 'true';
      
      if (wsMessageLogging) {
        console.group('📤 WebSocket 메시지 전송 (상세) - STATUS_UPDATE');
        console.log('타입:', message.type);
        console.log('발신자:', message.senderId);
        console.log('타임스탬프:', message.timestamp);
        console.log('페이로드:', message.payload);
        console.log('Socket ID:', socket.id);
        console.log('연결 상태:', socket.connected);
        console.groupEnd();
      }
      
      try {
        // 항상 상세 로그 출력 (실시간 동기화 확인용)
        console.log('📤 WebSocket 메시지 전송 시작:', message.type);
        console.log('   - 주문 ID:', updatedPayload.id);
        console.log('   - 상태:', updatedPayload.status);
        console.log('   - 방번호:', updatedPayload.roomNo);
        console.log('   - Socket ID:', socket.id);
        console.log('   - 연결 상태:', socket.connected);
        console.log('   - 발신자:', message.senderId);
        console.log('   - 현재 사용자:', currentUser.id, currentUser.name);
        console.log('   - 전송 시간:', new Date().toISOString());
        console.log('   - 페이로드:', JSON.stringify(message.payload, null, 2));
        
        // 메시지 전송 (항상 전송 - 실시간 동기화 보장)
        socket.emit(SYNC_CHANNEL, message);
        
        console.log('✅ 상태 업데이트 브로드캐스트 전송 완료:', updatedPayload.id, updatedPayload.status);
        console.log('   - 전송 완료 시간:', new Date().toISOString());
        console.log('   - 모든 연결된 클라이언트에게 브로드캐스트됨');
        
        // 전송 확인을 위한 짧은 딜레이 후 연결 상태 확인
        setTimeout(() => {
          if (!socket.connected) {
            console.error('❌ 메시지 전송 후 WebSocket 연결 끊김 감지');
            console.error('   - 재연결 시도 필요');
            console.error('   - 오프라인 큐에 저장됨');
          } else {
            console.log('✅ 메시지 전송 후 WebSocket 연결 유지 확인');
          }
        }, 100);
      } catch (error) {
        console.error('❌ WebSocket 브로드캐스트 전송 실패:', error);
        console.error('   - Socket ID:', socket.id);
        console.error('   - 연결 상태:', socket.connected);
        console.error('   - 에러 상세:', error);
        console.error('   - 메시지:', message);
        // 오프라인 큐에 저장
        try {
          const existing = localStorage.getItem(OFFLINE_QUEUE_KEY);
          const queue = existing ? JSON.parse(existing) : [];
          queue.push(message);
          const trimmed = queue.slice(-1000);
          localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(trimmed));
          console.log('💾 상태 업데이트 오프라인 큐에 저장:', updatedPayload.id);
        } catch (e) {
          console.error('❌ 오프라인 큐 저장 실패:', e);
        }
      }
    } else {
      // 오프라인 큐에 저장
      console.warn('⚠️ WebSocket 연결되지 않음, 오프라인 큐에 저장:', updatedPayload.id);
      try {
        const existing = localStorage.getItem(OFFLINE_QUEUE_KEY);
        const queue = existing ? JSON.parse(existing) : [];
        queue.push(message);
        const trimmed = queue.slice(-1000);
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(trimmed));
        console.log('💾 상태 업데이트 오프라인 큐에 저장:', updatedPayload.id);
        
        // 연결 시도
        if (socket && !socket.connected) {
          debugLog('🔄 WebSocket 재연결 시도');
          socket.connect();
        }
      } catch (e) {
        console.error('❌ 오프라인 큐 저장 실패:', e);
      }
    }
  };

  const handleAddMemo = (orderId: string, text: string) => {
    if (!currentUser || !text.trim()) return;
    
    const newMemoObj = {
      id: `MEMO-${Date.now()}`,
      text: text.trim(),
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderDept: currentUser.dept,
      timestamp: new Date()
    };

    let foundRoomNo: string | null = null;
    setOrders(prev => {
      const updated = prev.map(order => {
      if (order.id === orderId) {
          foundRoomNo = order.roomNo; // 주문을 찾았으면 roomNo 저장
        return {
          ...order,
          memos: [...order.memos, newMemoObj]
        };
      }
      return order;
      });
      // 업데이트된 주문 목록에서 다시 찾기 (혹시 모를 경우를 대비)
      if (!foundRoomNo) {
        const targetOrder = updated.find(o => o.id === orderId);
        foundRoomNo = targetOrder ? targetOrder.roomNo : null;
      }
      return updated;
    });

    // 로컬에서 토스트 생성하지 않음 - WebSocket을 통해 모든 기기에서 알림 표시
    // (로컬 기기 포함하여 모든 기기에서 WebSocket 메시지를 받아 알림 표시)

    // BROADCAST via WebSocket (연결된 경우에만, 아니면 오프라인 큐에 저장)
    const socket = socketRef.current;
    if (socket?.connected) {
      const message = {
      type: 'NEW_MEMO',
        payload: { 
          orderId, 
          memo: {
            ...newMemoObj,
            timestamp: newMemoObj.timestamp.toISOString()
          },
          roomNo: foundRoomNo // roomNo도 함께 전송
        },
        senderId: currentUser.id,
        sessionId: SESSION_ID,
        timestamp: new Date().toISOString()
      };
      
      // WebSocket 메시지 로깅 설정 확인
      const wsMessageLogging = localStorage.getItem('hotelflow_ws_message_logging') === 'true';
      
      if (wsMessageLogging) {
        console.group('📤 WebSocket 메시지 전송 (상세) - NEW_MEMO');
        console.log('타입:', message.type);
        console.log('발신자:', message.senderId);
        console.log('타임스탬프:', message.timestamp);
        console.log('페이로드:', message.payload);
        console.groupEnd();
      }
      
      socket.emit(SYNC_CHANNEL, message);
      debugLog('📤 메모 브로드캐스트:', orderId, '| 메모:', newMemoObj.id);
    } else {
      // 오프라인 큐에 저장
      try {
        const existing = localStorage.getItem(OFFLINE_QUEUE_KEY);
        const queue = existing ? JSON.parse(existing) : [];
        queue.push({
          type: 'NEW_MEMO',
          payload: { 
            orderId, 
            memo: {
              ...newMemoObj,
              timestamp: newMemoObj.timestamp.toISOString()
            },
            roomNo: foundRoomNo
          },
          senderId: currentUser.id,
          sessionId: SESSION_ID,
          timestamp: new Date().toISOString()
        });
        const trimmed = queue.slice(-1000);
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(trimmed));
        console.log('💾 메모 추가 오프라인 큐에 저장:', orderId);
      } catch (e) {
        console.error('❌ 오프라인 큐 저장 실패:', e);
      }
    }
  };

  const handleExportExcel = () => {
    const filtered = orders.filter(o => {
      if (filters.status !== 'ALL' && o.status !== filters.status) return false;
      if (filters.priority !== 'ALL' && o.priority !== filters.priority) return false;
      if (filters.roomNo && !o.roomNo.includes(filters.roomNo)) return false;
      return true;
    });

    const dataToExport = filtered.map(o => ({
      'ID': o.id,
      '상태': o.status,
      '객실번호': o.roomNo,
      '카테고리': o.category,
      '항목': o.itemName,
      '수량': o.quantity,
      '우선순위': o.priority,
      '요청시간': o.requestedAt.toLocaleString(),
      '완료시간': o.completedAt ? o.completedAt.toLocaleString() : '-',
      '담당자': users.find(u => u.id === o.assignedTo)?.name || '-',
      '메모내역': o.memos.map(m => `[${m.senderDept}] ${m.senderName}: ${m.text}`).join(' / ')
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    
    // 파일명 생성: Hotel_Orders_2025-12-24_20251224_153045.xlsx
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    const dateStr = `${year}-${month}-${day}`;
    const dateCompact = `${year}${month}${day}`;
    const timeCompact = `${hours}${minutes}${seconds}`;
    
    const filename = `Hotel_Orders_${dateStr}_${dateCompact}_${timeCompact}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const handleAddUser = useCallback((newUser: User) => {
    setUsers(prev => {
      const updated = [...prev, newUser];
      // localStorage에 저장 (앱 재시작 시에도 유지)
      try {
        localStorage.setItem('hotelflow_users_v1', JSON.stringify(updated));
      } catch (e) {
        console.warn('⚠️ localStorage에 users 저장 실패:', e);
      }
      return updated;
    });
    triggerToast(`새 직원 등록됨: ${newUser.name}`, 'success', Department.ADMIN, 'SUCCESS');
    
    // WebSocket을 통해 다른 모든 사용자에게 동기화
    const socket = socketRef.current;
    const user = currentUserRef.current;
    if (socket?.connected && user) {
      const message = {
        type: 'USER_ADD',
        payload: newUser,
        senderId: user.id,
        timestamp: new Date().toISOString()
      };
      socket.emit(SYNC_CHANNEL, message);
      debugLog('📤 사용자 추가:', newUser.name);
    }
  }, [triggerToast]);

  const handleUpdateUser = useCallback((updatedUser: User) => {
    setUsers(prev => {
      const updated = prev.map(u => u.id === updatedUser.id ? updatedUser : u);
      // localStorage에 저장 (앱 재시작 시에도 유지)
      try {
        localStorage.setItem('hotelflow_users_v1', JSON.stringify(updated));
      } catch (e) {
        console.warn('⚠️ localStorage에 users 저장 실패:', e);
      }
      return updated;
    });
    triggerToast(`직원 정보 수정됨: ${updatedUser.name}`, 'info', Department.ADMIN, 'UPDATE');
    
    // WebSocket을 통해 다른 모든 사용자에게 동기화
    const socket = socketRef.current;
    const user = currentUserRef.current;
    if (socket?.connected && user) {
      const message = {
        type: 'USER_UPDATE',
        payload: updatedUser,
        senderId: user.id,
        timestamp: new Date().toISOString()
      };
      socket.emit(SYNC_CHANNEL, message);
      debugLog('📤 사용자 수정:', updatedUser.name);
    }
  }, [triggerToast]);

  const handleDeleteUser = useCallback((userId: string) => {
    setUsers(prev => {
      const updated = prev.filter(u => u.id !== userId);
      // localStorage에 저장 (앱 재시작 시에도 유지)
      try {
        localStorage.setItem('hotelflow_users_v1', JSON.stringify(updated));
      } catch (e) {
        console.warn('⚠️ localStorage에 users 저장 실패:', e);
      }
      return updated;
    });
    triggerToast(`직원 계정이 삭제되었습니다.`, 'warning', Department.ADMIN, 'CANCEL');
    
    // WebSocket을 통해 다른 모든 사용자에게 동기화
    const socket = socketRef.current;
    const user = currentUserRef.current;
    if (socket?.connected && user) {
      const message = {
        type: 'USER_DELETE',
        payload: { userId },
        senderId: user.id,
        timestamp: new Date().toISOString()
      };
      socket.emit(SYNC_CHANNEL, message);
      debugLog('📤 사용자 삭제:', userId);
    }
  }, [triggerToast]);

  const handleOrdersReset = useCallback(() => {
    setOrders([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear orders from localStorage:', e);
    }
  }, []);

  const handleNotificationsReset = useCallback(() => {
    setNotificationHistory([]);
    setToasts([]);
    try {
      localStorage.removeItem('hotelflow_notifications');
    } catch (e) {
      console.warn('Failed to clear notifications from localStorage:', e);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  if (!currentUser) {
    return (
      <>
        <Suspense fallback={
          <div className="flex items-center justify-center h-screen">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-sm font-bold text-slate-600">로딩 중...</p>
            </div>
          </div>
        }>
          <Login onLogin={handleLogin} availableUsers={users} />
        </Suspense>
        <Suspense fallback={null}>
          <Suspense fallback={null}>
          <ToastNotification toasts={toasts} onRemove={removeToast} />
        </Suspense>
        </Suspense>
      </>
    );
  }

  const formatDept = (dept: string) => {
    if (dept === Department.HOUSEKEEPING) return 'HOUSE KEEPING';
    return dept.replace('_', ' ');
  };

  return (
    <Router>
      <div className="flex h-screen bg-slate-50 relative overflow-x-hidden touch-pan-y w-full max-w-full" style={{ touchAction: 'pan-y', width: '100%', maxWidth: '100vw' }}>
        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden text-slate-900 touch-pan-y w-full max-w-full" style={{ touchAction: 'pan-y', width: '100%', maxWidth: '100vw' }}>
          <header className="bg-white border-b border-slate-200 h-14 sm:h-16 flex items-center justify-between px-3 sm:px-4 lg:px-8 shrink-0 w-full max-w-full overflow-x-hidden relative z-10">
            <div className="flex items-center gap-2 sm:gap-4">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2.5 sm:p-2 hover:bg-slate-100 rounded-md active:scale-95 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0"
              >
                <Menu className="w-6 h-6 text-slate-600" />
              </button>
              <h1 className="text-lg sm:text-xl font-black text-slate-800 lg:block hidden tracking-tighter uppercase italic">HotelWorks</h1>
              <div className="flex items-center gap-1.5 bg-indigo-50 px-2 py-1 sm:py-0.5 rounded-full border border-indigo-100">
                <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                <span className="text-[8px] sm:text-[9px] font-black text-indigo-600 uppercase tracking-widest">
                  {isConnected ? 'Live Sync' : 'Connecting...'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-4 shrink-0">
              {/* 실시간 날짜/시간 */}
              <div className="flex flex-col items-end px-2 sm:px-3 py-1 bg-slate-50 rounded-lg border border-slate-200 shrink-0">
                <div className="text-[9px] sm:text-[10px] lg:text-xs font-black text-slate-700 uppercase tracking-tight whitespace-nowrap max-w-[120px] sm:max-w-none overflow-hidden text-ellipsis">
                  {(() => {
                    const dateStr = currentDateTime.toLocaleDateString('ko-KR', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric'
                    });
                    const weekdayStr = currentDateTime.toLocaleDateString('ko-KR', { 
                      weekday: 'short'
                    });
                    // "2025년 12월 26일" + " (금)" 형식으로 조합
                    return `${dateStr} (${weekdayStr})`;
                  })()}
                </div>
                <div className="text-[10px] sm:text-[11px] lg:text-sm font-black text-indigo-600 tracking-tighter mt-0.5 whitespace-nowrap max-w-[120px] sm:max-w-none overflow-hidden text-ellipsis">
                  {currentDateTime.toLocaleTimeString('ko-KR', { 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit',
                    hour12: false
                  })}
                </div>
              </div>
              
              {/* 알림 아이콘 */}
              <div className="relative">
                <button 
                  onClick={() => setNotificationPanelOpen(!notificationPanelOpen)}
                  className="relative flex items-center justify-center w-10 h-10 sm:w-9 sm:h-9 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all active:scale-95 min-h-[40px] sm:min-h-[36px]"
                >
                  <Bell className="w-5 h-5 sm:w-4 sm:h-4 text-slate-600" />
                  {notificationHistory.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center border-2 border-white">
                      {notificationHistory.length > 99 ? '99+' : notificationHistory.length}
                    </span>
                  )}
                </button>
              </div>
              
              {currentUser && (
                <div className="flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-2 border-l border-slate-200">
                  <div className="w-8 h-8 sm:w-8 sm:h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-xs shadow-inner">
                    {currentUser.dept === Department.FRONT_DESK ? 'FD' : currentUser.dept === Department.HOUSEKEEPING ? 'HK' : 'AD'}
                </div>
                  <div className="hidden sm:block text-left">
                  <p className="text-xs font-black text-slate-800 leading-none">{currentUser.name}</p>
                  <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold tracking-widest">{formatDept(currentUser.dept)}</p>
                </div>
              </div>
              )}
            </div>
          </header>

          {/* 알림 패널 - 헤더 외부로 분리 */}
          {notificationPanelOpen && (
            <>
              <div 
                className="fixed inset-0 z-[110]"
                onClick={() => setNotificationPanelOpen(false)}
              ></div>
              <div className="fixed right-4 top-20 sm:right-4 sm:top-20 w-[calc(100vw-2rem)] sm:w-80 md:w-96 max-w-[calc(100vw-2rem)] sm:max-w-none bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-2xl z-[120] max-h-[calc(100vh-5rem)] sm:max-h-[500px] flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">알림</h3>
                  <div className="flex items-center gap-2">
                    {notificationHistory.length > 0 && (
                      <button 
                        onClick={() => {
                          // 모든 활성 알림 제거
                          toasts.forEach(t => removeToast(t.id));
                          // 히스토리도 모두 제거
                          setNotificationHistory([]);
                          try {
                            localStorage.removeItem('hotelflow_notifications');
                          } catch (e) {
                            console.warn('Failed to clear notification history:', e);
                          }
                          setNotificationPanelOpen(false);
                        }}
                        className="text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-wider transition-colors px-2 py-1"
                      >
                        모두 지우기
                      </button>
                    )}
                    <button 
                      onClick={() => setNotificationPanelOpen(false)}
                      className="p-1 hover:bg-slate-100 rounded-lg transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                </div>
                <div className="overflow-y-auto flex-1 min-h-0">
                  {notificationHistory.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p className="text-xs font-bold">알림이 없습니다</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {notificationHistory.map((toast) => {
                        const isActive = toasts.some(t => t.id === toast.id);
                        return (
                          <div 
                            key={toast.id}
                            className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer ${isActive ? 'bg-indigo-50/50' : ''}`}
                            onClick={() => {
                              removeToast(toast.id);
                              // 히스토리에서도 제거
                              setNotificationHistory(prev => {
                                const updated = prev.filter(t => t.id !== toast.id);
                                try {
                                  localStorage.setItem('hotelflow_notifications', JSON.stringify(updated.map(t => ({
                                    ...t,
                                    timestamp: t.timestamp.toISOString()
                                  }))));
                                } catch (e) {
                                  console.warn('Failed to save notification history:', e);
                                }
                                return updated;
                              });
                              if (notificationHistory.length === 1) setNotificationPanelOpen(false);
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                                toast.type === 'success' ? 'bg-emerald-500' :
                                toast.type === 'warning' ? 'bg-amber-500' :
                                toast.type === 'memo' ? 'bg-indigo-500' :
                                'bg-blue-500'
                              }`}></div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-slate-800 leading-tight mb-1">
                                  {toast.message}
                                </p>
                                <div className="flex items-center gap-2">
                                  <p className="text-[9px] text-slate-400 font-bold">
                                    {toast.timestamp.toLocaleString([], { 
                                      year: 'numeric',
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit', 
                                      minute: '2-digit', 
                                      second: '2-digit' 
                                    })}
                                  </p>
                                  {isActive && (
                                    <span className="text-[8px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-full font-black uppercase">
                                      New
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {notificationHistory.length > 0 && (
                  <div className="p-3 border-t border-slate-100">
                    <button 
                      onClick={() => {
                        // 모든 활성 알림 제거
                        toasts.forEach(t => removeToast(t.id));
                        // 히스토리도 모두 제거
                        setNotificationHistory([]);
                        try {
                          localStorage.removeItem('hotelflow_notifications');
                        } catch (e) {
                          console.warn('Failed to clear notification history:', e);
                        }
                        setNotificationPanelOpen(false);
                      }}
                      className="w-full text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-wider transition-colors"
                    >
                      모두 지우기
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8 custom-scrollbar w-full max-w-full">
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  <p className="text-sm font-bold text-slate-600">로딩 중...</p>
                </div>
              </div>
            }>
              <Routes>
                <Route path="/" element={
                  <Dashboard 
                    orders={orders} 
                    onExport={handleExportExcel} 
                    currentUser={currentUser} 
                    onUpdateStatus={handleUpdateStatus}
                    onOpenMemo={(order) => setMemoOrder(order)}
                    onDispatch={handleCreateOrder}
                  />
                } />
                <Route path="/orders" element={
                  <OrderList 
                    orders={orders} 
                    filters={filters} 
                    setFilters={setFilters} 
                    onUpdateStatus={handleUpdateStatus}
                    onExport={handleExportExcel}
                    currentUser={currentUser}
                    onOpenMemo={(order) => setMemoOrder(order)}
                  />
                } />
                <Route path="/staff" element={
                  currentUser && currentUser.dept === Department.ADMIN ? (
                    <AdminStaffManager 
                      users={users}
                      currentUser={currentUser}
                      onAddUser={handleAddUser}
                      onUpdateUser={handleUpdateUser}
                      onDeleteUser={handleDeleteUser}
                    />
                  ) : <Navigate to="/" />
                } />
                <Route path="/settings" element={
                  currentUser ? (
                    <Settings 
                      currentUser={currentUser}
                      socketRef={socketRef}
                      isConnected={isConnected}
                      onOrdersReset={handleOrdersReset}
                      onNotificationsReset={handleNotificationsReset}
                    />
                  ) : <Navigate to="/" />
                } />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Suspense>
          </main>
        </div>

        {isCreateModalOpen && (
          <Suspense fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-white rounded-2xl p-8">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
            </div>
          }>
            <OrderCreateModal 
              onClose={() => setCreateModalOpen(false)} 
              onSubmit={handleCreateOrder} 
            />
          </Suspense>
        )}

        {memoOrder && (
          <Suspense fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-white rounded-2xl p-8">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
            </div>
          }>
            <NoteModal 
              order={orders.find(o => o.id === memoOrder.id) || memoOrder}
              currentUser={currentUser}
              onClose={() => setMemoOrder(null)}
              onSubmit={(text) => handleAddMemo(memoOrder.id, text)}
            />
          </Suspense>
        )}

        <Suspense fallback={null}>
          <ToastNotification toasts={toasts} onRemove={removeToast} />
        </Suspense>
      </div>
    </Router>
  );
};

export default App;
