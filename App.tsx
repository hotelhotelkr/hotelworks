
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
// MemoHistory 컴포넌트는 아직 구현되지 않았으므로 주석 처리
// const MemoHistory = lazy(() => import('./components/MemoHistory'));
const ToastNotification = lazy(() => import('./components/ToastNotification'));

// Toast 타입은 types.ts에서 import

// For Excel export
declare const XLSX: any;

// Modern Sound Presets
type SoundEffect = 'NEW_ORDER' | 'SUCCESS' | 'MEMO' | 'ALERT' | 'UPDATE' | 'LOGIN' | 'CANCEL';

const STORAGE_KEY = 'hotelflow_orders_v1';
const SYNC_CHANNEL = 'hotelflow_sync';
const OFFLINE_QUEUE_KEY = 'hotelflow_offline_queue'; // 오프라인 상태에서 생성된 메시지 큐

// 기본 비밀번호 매핑 (공통 상수)
const DEFAULT_PASSWORDS: Record<string, string> = {
  'admin': 'admin',
  'FD': 'FD',
  'HK': 'HK',
  '3': '3',
  '4': '4',
};

/**
 * 세션 ID: 각 브라우저 탭/기기를 고유하게 식별
 * - 페이지 로드 시마다 새로 생성
 * - 같은 사용자가 다른 기기/탭에서 로그인해도 서로 다른 세션 ID를 가짐
 * - 중복 알림 방지에 사용: senderId + sessionId가 모두 같으면 같은 기기로 판단
 */
const SESSION_ID = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * 한국 시간(KST) 유틸리티 함수
 * - 모든 사용자가 한국에 있으므로 한국 시간(KST) 기준으로 작동
 * - 한국에서 실행되는 브라우저의 new Date()는 이미 한국 시간입니다
 * - 서버(Supabase)에 저장할 때도 한국 시간 그대로 저장합니다
 */
const getKoreaTime = (): Date => {
  // 한국에서 실행되는 브라우저는 이미 한국 시간(KST)을 반환합니다
  return new Date();
};

const toKoreaISO = (date: Date): string => {
  // Date를 ISO 문자열로 변환 (한국 시간 그대로)
  // toISOString()은 UTC로 변환하므로, 대신 로컬 시간 문자열 사용
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}+09:00`;
};

/**
 * WebSocket 서버 URL 동적 감지
 * - 환경 변수(VITE_WS_SERVER_URL) 최우선 사용
 * - localStorage 저장된 URL 사용
 * - 프로덕션(hotelworks.kr): Render 서버 사용 (wss://hotelworks-websocket.onrender.com)
 * - 로컬 환경: 자동으로 포트 3001 사용
 * - PC와 모바일 모두 같은 서버에 연결
 */
const getWebSocketURL = (): string => {
  // 🚨 1순위: 환경 변수 우선 사용 (Vercel에서 설정한 값)
  try {
    const envUrl = (import.meta.env as any).VITE_WS_SERVER_URL;
    if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
      console.log('🔌 [1순위] 환경 변수 WebSocket URL:', envUrl);
      return envUrl.trim();
    }
  } catch (e) {
    // 환경 변수 접근 실패 시 무시
  }
  
  // 🚨 2순위: localStorage에 저장된 URL 사용 (사용자가 설정한 값)
  try {
    const savedUrl = localStorage.getItem('hotelflow_ws_url');
    if (savedUrl && savedUrl.trim() !== '') {
      console.log('🔌 [2순위] 저장된 WebSocket URL:', savedUrl.trim());
      return savedUrl.trim();
    }
  } catch (e) {
    // localStorage 접근 실패 시 무시
  }
  
  // 🚨 3순위: 프로덕션 도메인 감지
  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // 🏨 프로덕션 도메인: hotelworks.kr → Render 서버 사용
    if (host === 'hotelworks.kr' || host === 'www.hotelworks.kr') {
      // Render 서버 URL 사용 (환경 변수가 없을 때)
      const renderUrl = 'wss://hotelworks-websocket.onrender.com';
      console.log('🔌 [3순위] 프로덕션 WebSocket URL (Render):', renderUrl);
      return renderUrl;
    }
    
    // 🚨 개발 환경: localhost 또는 로컬 IP 주소인 경우
    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.') || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      const wsUrl = `${protocol === 'wss:' ? 'ws:' : 'ws:'}//${host}:3001`;
      console.log('🔌 [3순위] 로컬 WebSocket URL:', wsUrl);
      return wsUrl;
    }
  }
  
  // 🚨 기본값: 로컬 개발 서버
  console.log('🔌 [기본값] 기본 WebSocket URL: ws://localhost:3001');
  return 'ws://localhost:3001';
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
  // 🚨 [최신순 정렬 수정] localStorage 데이터 버전 관리
  // 기존 localStorage 데이터가 오래되었을 수 있으므로 버전 체크
  const ORDERS_VERSION = 'v5_20260122_2250_KST'; // 시간별 버전 관리 (한국 시간 기준으로 전환)
  
  // Load initial state from localStorage if available
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const savedVersion = localStorage.getItem(`${STORAGE_KEY}_version`);
    
    // 🚨 버전이 다르면 localStorage 초기화 (최신 데이터 동기화 보장)
    if (savedVersion !== ORDERS_VERSION) {
      console.log('🔄 [최신순 정렬] localStorage 버전 불일치 - 초기화 중...');
      console.log('   이전 버전:', savedVersion);
      console.log('   현재 버전:', ORDERS_VERSION);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(`${STORAGE_KEY}_version`, ORDERS_VERSION);
      console.log('✅ [최신순 정렬] localStorage 초기화 완료');
      // INITIAL_ORDERS도 최신순으로 정렬하여 반환 (created_at 기준)
      const sortedInitial = [...INITIAL_ORDERS].sort((a, b) => {
        const aTime = (a.createdAt ? new Date(a.createdAt).getTime() : a.requestedAt.getTime());
        const bTime = (b.createdAt ? new Date(b.createdAt).getTime() : b.requestedAt.getTime());
        return bTime - aTime; // DESC (최신순)
      });
      console.log('✅ [최신순 정렬] INITIAL_ORDERS 정렬 완료:', sortedInitial.length, '개');
      return sortedInitial;
    }
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Convert ISO strings back to Date objects
        const ordersWithDates = parsed.map((o: any) => ({
          ...o,
          requestedAt: new Date(o.requestedAt),
          createdAt: o.createdAt ? new Date(o.createdAt) : new Date(o.requestedAt), // created_at 우선, 없으면 requestedAt 사용
          acceptedAt: o.acceptedAt ? new Date(o.acceptedAt) : undefined,
          inProgressAt: o.inProgressAt ? new Date(o.inProgressAt) : undefined,
          completedAt: o.completedAt ? new Date(o.completedAt) : undefined,
            memos: (o.memos && Array.isArray(o.memos)) ? o.memos.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })) : []
        }));
        // 🚨 최신순 정렬 (최우선 목표: 모든 사용자에게 최신 오더가 위에 표시, created_at 기준)
        const sorted = ordersWithDates.sort((a, b) => {
          const aTime = (a.createdAt ? new Date(a.createdAt).getTime() : a.requestedAt.getTime());
          const bTime = (b.createdAt ? new Date(b.createdAt).getTime() : b.requestedAt.getTime());
          return bTime - aTime; // DESC (최신순)
        });
        console.log('✅ [최신순 정렬] localStorage에서 로드 완료:', sorted.length, '개 주문');
        return sorted;
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
          if (Array.isArray(parsed) && parsed.length > 0) {
            // 기존 사용자 정보 마이그레이션 (username 업데이트, 비밀번호 제거)
            let needsUpdate = false;
            const migrated = parsed.map((u: User) => {
              // 🔒 보안: 비밀번호 필드 제거
              const { password, ...userWithoutPassword } = u;
              
              // u1 (프론트수): username을 "1"에서 "FD"로 변경
              if (u.id === 'u1' && u.username === '1') {
                needsUpdate = true;
                return { ...userWithoutPassword, username: 'FD' };
              }
              // u2 (하우스키핑수): username을 "2"에서 "HK"로 변경
              if (u.id === 'u2' && u.username === '2') {
                needsUpdate = true;
                return { ...userWithoutPassword, username: 'HK' };
              }
              // 로미오: username을 "FD"에서 "3"으로 변경
              if (u.name === '로미오' && u.username === 'FD') {
                needsUpdate = true;
                return { ...userWithoutPassword, username: '3' };
              }
              // 줄리엣: username을 "HK"에서 "4"로 변경
              if (u.name === '줄리엣' && u.username === 'HK') {
                needsUpdate = true;
                return { ...userWithoutPassword, username: '4' };
              }
              // 비밀번호 필드만 제거
              if (password !== undefined) {
                needsUpdate = true;
                return userWithoutPassword;
              }
              return userWithoutPassword;
            });
            
            // 마이그레이션이 필요한 경우 localStorage에 저장
            if (needsUpdate) {
              try {
                localStorage.setItem('hotelflow_users_v1', JSON.stringify(migrated));
                console.log('✅ 기존 사용자 정보 마이그레이션 완료:', {
                  프론트수: migrated.find((u: User) => u.id === 'u1')?.username,
                  하우스키핑수: migrated.find((u: User) => u.id === 'u2')?.username,
                  로미오: migrated.find((u: User) => u.name === '로미오')?.username,
                  줄리엣: migrated.find((u: User) => u.name === '줄리엣')?.username
                });
              } catch (e) {
                console.warn('⚠️ 마이그레이션된 users 저장 실패:', e);
              }
              
              // 초기 사용자 비밀번호 설정
              try {
                const saved = localStorage.getItem('hotelflow_user_passwords_v1');
                const passwords = saved ? JSON.parse(saved) : {};
                let passwordsUpdated = false;
                
                migrated.forEach((u: User) => {
                  if (!passwords[u.id] && DEFAULT_PASSWORDS[u.username]) {
                    passwords[u.id] = DEFAULT_PASSWORDS[u.username];
                    passwordsUpdated = true;
                  }
                });
                
                if (passwordsUpdated) {
                  localStorage.setItem('hotelflow_user_passwords_v1', JSON.stringify(passwords));
                  console.log('✅ 초기 사용자 비밀번호 설정 완료');
                }
              } catch (e) {
                console.warn('⚠️ 초기 비밀번호 설정 실패:', e);
              }
              
              return migrated;
            }
            
            // 마이그레이션이 필요 없어도 초기 비밀번호 확인
            try {
              const saved = localStorage.getItem('hotelflow_user_passwords_v1');
              const passwords = saved ? JSON.parse(saved) : {};
              let passwordsUpdated = false;
              
              parsed.forEach((u: User) => {
                if (!passwords[u.id] && DEFAULT_PASSWORDS[u.username]) {
                  passwords[u.id] = DEFAULT_PASSWORDS[u.username];
                  passwordsUpdated = true;
                }
              });
              
              if (passwordsUpdated) {
                localStorage.setItem('hotelflow_user_passwords_v1', JSON.stringify(passwords));
                console.log('✅ 초기 사용자 비밀번호 설정 완료');
              }
            } catch (e) {
              console.warn('⚠️ 초기 비밀번호 설정 실패:', e);
            }
            
            return parsed;
          }
          return USERS;
        } catch (e) {
          console.warn('Failed to parse users from localStorage:', e);
          return USERS;
        }
      }
      // USERS가 반환되는 경우도 초기 비밀번호 설정
      try {
        const saved = localStorage.getItem('hotelflow_user_passwords_v1');
        const passwords = saved ? JSON.parse(saved) : {};
        let passwordsUpdated = false;
        
        USERS.forEach((u: User) => {
          if (!passwords[u.id] && DEFAULT_PASSWORDS[u.username]) {
            passwords[u.id] = DEFAULT_PASSWORDS[u.username];
            passwordsUpdated = true;
          }
        });
        
        if (passwordsUpdated) {
          localStorage.setItem('hotelflow_user_passwords_v1', JSON.stringify(passwords));
          console.log('✅ 초기 사용자 비밀번호 설정 완료 (USERS 반환)');
        }
      } catch (e) {
        console.warn('⚠️ 초기 비밀번호 설정 실패:', e);
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
  const usersRef = useRef<User[]>(users);
  const pendingMessagesProcessingRef = useRef<boolean>(false);
  const wsUrlRef = useRef<string>('');
  const messageHandlerRef = useRef<((data: any) => void) | null>(null); // 🚨 messageHandler 참조 저장
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

  // users 상태가 변경될 때마다 ref 업데이트
  useEffect(() => {
    usersRef.current = users;
  }, [users]);

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

  const triggerToast = useCallback((message: string, type: Toast['type'] = 'info', dept?: Department, effect: SoundEffect = 'UPDATE', orderId?: string, roomNo?: string, memoText?: string) => {
    const now = new Date();
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = {
      id,
      message,
      type,
      dept,
      timestamp: now,
      orderId,
      roomNo,
      memoText
    };
    
    // 브라우저가 백그라운드이거나 닫혀있을 때 푸시 알림 표시
    if (document.hidden || !document.hasFocus()) {
      showPushNotification('HotelWorks', message, {
        tag: `toast-${id}`,
        requireInteraction: type === 'warning' || type === 'error'
      });
    }
    
    // 🚨 토스트 알림 추가 (항상 로그 출력)
    // 🚨 최우선 목표: 토스트 알림 보장
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔔 triggerToast 호출 (최우선 목표)');
    console.log('   메시지:', message.substring(0, 80) + (message.length > 80 ? '...' : ''));
    console.log('   타입:', type);
    console.log('   부서:', dept);
    console.log('   주문 ID:', orderId);
    console.log('   방번호:', roomNo);
    console.log('   타임스탬프:', now.toISOString());
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // 🚨 최우선 목표: 토스트 알림 보장
    // 중복 알림 방지: 같은 주문 ID가 1초 이내에 이미 있으면 추가하지 않음
    // 주문 ID로 구분하여 더 정확한 중복 방지
    setToasts(prev => {
      // 주문 ID가 있으면 주문 ID로 중복 체크 (더 정확)
      if (orderId) {
        const duplicate = prev.find(t => {
          const timeDiff = Math.abs(now.getTime() - t.timestamp.getTime());
          return t.orderId === orderId && timeDiff < 1000; // 1초 이내, 같은 주문 ID
        });
        
        if (duplicate) {
          console.log('⏭️ 중복 알림 스킵 (같은 주문 ID):', orderId, message.substring(0, 50));
          return prev; // 중복이면 기존 알림 유지
        }
      }
      
      // 주문 ID가 없으면 메시지로 중복 체크 (1초 이내)
      const duplicate = prev.find(t => {
        const timeDiff = Math.abs(now.getTime() - t.timestamp.getTime());
        return t.message === message && t.type === type && t.dept === dept && timeDiff < 1000; // 1초 이내
      });
      
      if (duplicate) {
        console.log('⏭️ 중복 알림 스킵 (같은 메시지):', message.substring(0, 50));
        return prev; // 중복이면 기존 알림 유지
      }
      
      console.log('✅ 새 토스트 추가:', {
        id,
        message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        type,
        dept,
        orderId,
        roomNo,
        totalToasts: prev.length + 1
      });
      
      const updated = [newToast, ...prev];
      
      // 🚨 최우선 목표: 토스트 알림 보장
      // 토스트가 실제로 추가되었는지 확인 (다음 렌더링 사이클에서)
      setTimeout(() => {
        // React state는 직접 확인할 수 없으므로 로그만 출력
        console.log('✅ 토스트 상태 업데이트 완료 (React state)');
        console.log('   - ToastNotification 컴포넌트가 자동으로 렌더링합니다');
        console.log('   - 토스트는 화면 우측 상단에 표시됩니다');
      }, 0);
      
      return updated;
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
      console.warn('⚠️ WebSocket 연결되지 않음, 오프라인 큐 동기화 불가');
      console.warn('   Socket 존재:', !!socket);
      console.warn('   연결 상태:', socket?.connected);
      return;
    }

    console.log('🔄 오프라인 큐 동기화 시작');
    
    try {
      const saved = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (!saved) {
        console.log('📭 오프라인 큐가 비어있음');
        return;
      }

      const queue = JSON.parse(saved);
      if (queue.length === 0) {
        console.log('📭 오프라인 큐가 비어있음');
        return;
      }

      console.log(`🔄 오프라인 큐 동기화 시작: ${queue.length}개 메시지`);
      console.log('   큐 내용:', JSON.stringify(queue, null, 2));
      
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
          
          console.log(`📤 오프라인 큐 메시지 전송 [${index + 1}/${queue.length}]:`, wsMessage.type);
          console.log('   메시지 내용:', JSON.stringify(wsMessage, null, 2));
          
          socket.emit(SYNC_CHANNEL, wsMessage);
          console.log(`✅ 오프라인 메시지 전송 완료 (${index + 1}/${queue.length}):`, message.type, message.payload.id || message.payload.orderId);
        } catch (error) {
          console.error(`❌ 오프라인 메시지 전송 실패 (${index + 1}/${queue.length}):`, error);
        }
      });

      // 전송 완료 후 큐 비우기
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
      console.log('✅ 오프라인 큐 동기화 완료, 큐 비움');
    } catch (e) {
      console.error('❌ 오프라인 큐 동기화 실패:', e);
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
    
    // 🚨 중요: 기존 연결이 있어도 항상 정리하고 새로 생성
    // 이벤트 리스너 중복 등록 방지를 위해
    if (socketRef.current) {
      console.log('🧹 기존 WebSocket 연결 정리 중...');
      // 모든 이벤트 리스너 제거
      socketRef.current.removeAllListeners();
      // 연결 해제
      socketRef.current.disconnect();
      socketRef.current = null;
      console.log('✅ 기존 WebSocket 연결 정리 완료');
    }
    
    try {
      const wsUrl = getWebSocketURL();
      wsUrlRef.current = wsUrl; // useRef에 저장
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

      // 🚨 디버깅: 모든 WebSocket 이벤트 로깅
      const originalEmit = socket.emit.bind(socket);
      socket.emit = function(...args: any[]) {
        console.log('📤 [WebSocket] emit 호출:', args[0], args[1] ? JSON.stringify(args[1]).substring(0, 100) : '');
        return originalEmit(...args);
      };

      // 🚨 중요: messageHandler를 connect/reconnect 등록 **전**에 정의!
      // 래퍼 함수를 먼저 정의하고, 실제 핸들러는 나중에 messageHandlerRef에 저장
      const messageHandlerWrapper = (data: any) => {
        if (messageHandlerRef.current) {
          messageHandlerRef.current(data);
        } else {
          console.error('❌ messageHandlerRef.current가 null - 메시지 처리 불가');
        }
      };

      socket.on('connect', () => {
        console.log('✅ WebSocket 연결 성공:', socket.id, '| URL:', wsUrlRef.current || getWebSocketURL());
        console.log('✅ 세션 ID:', SESSION_ID);
        setIsConnected(true);
        syncOfflineQueue();
        
        // 🚨 연결 성공 후 이벤트 리스너 재등록 (안전장치)
        // 중요: 연결이 끊겼다가 다시 연결될 때 리스너가 사라질 수 있음
        console.log('🔌 연결 성공 후 이벤트 리스너 재등록 확인');
        const existingListeners = socket.listeners(SYNC_CHANNEL).length;
        console.log('   - 현재 등록된 리스너 수:', existingListeners);
        if (existingListeners === 0) {
          console.warn('⚠️ 리스너가 없음 - 재등록 시도');
          try {
            // messageHandlerRef.current가 있으면 사용, 없으면 나중에 등록될 것임
            if (messageHandlerRef.current) {
              socket.on(SYNC_CHANNEL, messageHandlerRef.current);
              console.log('✅ 리스너 재등록 완료 (messageHandlerRef 사용)');
            } else {
              console.warn('⚠️ messageHandlerRef.current가 아직 없음 - 나중에 등록될 예정');
            }
          } catch (error) {
            console.error('❌ 리스너 재등록 실패:', error);
          }
        }
        
        // WebSocket 연결 후 localStorage 주문들을 DB로 동기화
        if (currentUserRef.current) {
          setTimeout(() => {
            syncLocalStorageOrdersToDB();
          }, 1000);
        }
        
        const user = currentUserRef.current;
        
        // 로그인 상태와 무관하게 항상 사용자 목록 동기화 요청 (로그인 화면에서도 동기화)
        setTimeout(() => {
          const requestData = {
            senderId: user?.id || `anonymous_${socket.id}`,
            timestamp: new Date().toISOString()
          };
          socket.emit('request_all_users', requestData);
          console.log('📤 WebSocket 메시지 전송 - request_all_users (연결)', {
            senderId: requestData.senderId,
            loginStatus: user ? '로그인 상태' : '로그아웃 상태',
            socketId: socket.id
          });
        }, 1000); // 1초 후 실행 (다른 기기들이 준비될 시간 확보)
        
        // 주문 목록 동기화는 WebSocket 실시간 메시지로 자동 처리되므로 별도 요청 불필요
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
        console.error('❌ WebSocket 연결 오류:', error.message, '| URL:', wsUrlRef.current || getWebSocketURL());
        setIsConnected(false);
        
        // 사용자에게 연결 문제 알림 (디버그 모드에서만)
        if (isDebugEnabled()) {
          console.error('💡 해결 방법: 서버가 실행 중인지 확인하세요 (npm run dev:server)');
        }
        
        // 연결 오류 시 자동 재연결 시도 (실시간 동기화 보장)
        // Socket.IO가 자동으로 재연결을 시도하지만, 명시적으로도 시도
        setTimeout(() => {
          if (socket && !socket.connected) {
            const currentWsUrl = wsUrlRef.current || getWebSocketURL();
            debugLog('🔄 연결 오류 후 자동 재연결 시도:', currentWsUrl);
            socket.connect();
          }
        }, 3000); // 3초 후 재시도
      });

      socket.on('reconnect', (attemptNumber) => {
        console.log('🔄 WebSocket 재연결 성공, 시도 횟수:', attemptNumber);
        console.log('   - 재연결 시간:', new Date().toISOString());
        console.log('   - Socket ID:', socket.id);
        setIsConnected(true);
        
        // 🚨 재연결 후 이벤트 리스너 재등록 (중요!)
        // 재연결 시 리스너가 사라질 수 있으므로 반드시 재등록
        console.log('🔌 재연결 후 이벤트 리스너 재등록');
        const existingListeners = socket.listeners(SYNC_CHANNEL).length;
        console.log('   - 현재 등록된 리스너 수:', existingListeners);
        if (existingListeners === 0) {
          console.warn('⚠️ 리스너가 없음 - 재등록 시도');
          try {
            // 래퍼 함수를 사용하여 리스너 등록
            socket.on(SYNC_CHANNEL, messageHandlerWrapper);
            console.log('✅ 리스너 재등록 완료 (messageHandlerWrapper 사용)');
          } catch (error) {
            console.error('❌ 리스너 재등록 실패:', error);
          }
        } else {
          console.log('✅ 리스너가 이미 등록되어 있음');
        }
        
        // 오프라인 큐에 저장된 메시지들을 모두 전송
        syncOfflineQueue();
        
        // 재연결 후 localStorage 주문들을 DB로 동기화
        if (currentUserRef.current) {
          setTimeout(() => {
            syncLocalStorageOrdersToDB();
          }, 1000);
        }
        
        // 로그인 상태와 관계없이 재연결 성공 시 전체 주문 목록 동기화 요청 (실시간 동기화 보장)
        const user = currentUserRef.current;
        
        // 로그인 상태와 무관하게 항상 사용자 목록 동기화 요청 (로그인 화면에서도 동기화)
        setTimeout(() => {
          const requestData = {
            senderId: user?.id || `anonymous_${socket.id}`,
            timestamp: new Date().toISOString()
          };
          socket.emit('request_all_users', requestData);
          console.log('📤 WebSocket 메시지 전송 - request_all_users (재연결)', {
            senderId: requestData.senderId,
            loginStatus: user ? '로그인 상태' : '로그아웃 상태',
            socketId: socket.id
          });
        }, 1000); // 1초 후 실행 (다른 기기들이 준비될 시간 확보)
        
        // 주문 목록 동기화는 WebSocket 실시간 메시지로 자동 처리되므로 별도 요청 불필요
        if (user) {
          console.log('📤 WebSocket 재연결 성공 (로그인 상태) - 실시간 동기화 준비 완료');
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
              requestedAt: toKoreaISO(o.requestedAt),
              acceptedAt: o.acceptedAt ? toKoreaISO(o.acceptedAt) : undefined,
              inProgressAt: o.inProgressAt ? toKoreaISO(o.inProgressAt) : undefined,
              completedAt: o.completedAt ? toKoreaISO(o.completedAt) : undefined,
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
      // 사용자 목록 동기화 요청 수신
      socket.on('request_all_users', (data: any) => {
        if (!mounted) return;
        const { senderId } = data;
        const user = currentUserRef.current;
        
        // 요청한 클라이언트가 자신이 아닐 때만 응답 (로그인 상태와 무관)
        // 로그인하지 않은 상태에서도 사용자 목록을 동기화할 수 있도록
        if (senderId !== (user?.id || 'anonymous')) {
          console.log('📤 전체 사용자 목록 응답 전송 to', senderId, user ? '(로그인 상태)' : '(로그아웃 상태)');
          const currentUsers = usersRef.current;
          
          // localStorage에서도 사용자 확인 (usersRef가 비어있을 수 있음)
          let allUsers = currentUsers;
          if (currentUsers.length === 0) {
            try {
              const saved = localStorage.getItem('hotelflow_users_v1');
              if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  allUsers = parsed;
                  console.log('📋 localStorage에서 사용자 목록 로드:', allUsers.length, '명');
                }
              }
            } catch (e) {
              console.warn('⚠️ localStorage에서 사용자 로드 실패:', e);
            }
          }
          
          // 저장된 비밀번호 가져오기
          try {
            const saved = localStorage.getItem('hotelflow_user_passwords_v1');
            const passwords = saved ? JSON.parse(saved) : {};
            
            // 사용자 목록에 비밀번호 포함 (동기화 필요)
            const usersWithPasswords = allUsers.map((u: User) => {
              const password = passwords[u.id] || undefined;
              return { ...u, password };
            });
            
            const responseData = {
              users: usersWithPasswords,
              senderId: user?.id || 'anonymous',
              timestamp: new Date().toISOString()
            };
            
            console.log('📤 WebSocket 메시지 전송 - all_users_response:', {
              senderId: responseData.senderId,
              receiverId: senderId,
              userCount: responseData.users.length,
              users: responseData.users.map((u: any) => ({ id: u.id, username: u.username, name: u.name }))
            });
            
            socket.emit('all_users_response', responseData);
          } catch (e) {
            console.warn('⚠️ 비밀번호 로드 실패:', e);
            // 비밀번호 없이 전송 (하위 호환성)
            const usersWithoutPasswords = allUsers.map((u: User) => {
              const { password, ...userWithoutPassword } = u;
              return userWithoutPassword;
            });
            
            const responseData = {
              users: usersWithoutPasswords,
              senderId: user?.id || 'anonymous',
              timestamp: new Date().toISOString()
            };
            
            socket.emit('all_users_response', responseData);
          }
        } else {
          console.log('⚠️ 자신이 보낸 request_all_users 무시:', senderId);
        }
      });

      // 사용자 목록 응답 수신
      socket.on('all_users_response', (data: any) => {
        if (!mounted) return;
        const { users: receivedUsers, senderId } = data;
        const user = currentUserRef.current;
        
        // 자신이 보낸 응답은 무시 (단, 로그인하지 않은 상태에서는 무시하지 않음)
        // 로그인 화면에서도 사용자 목록을 받아야 하므로
        if (user && senderId === user.id) {
          console.log('⚠️ 자신이 보낸 users 응답 무시:', senderId);
          return;
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📥 [all_users_response] 사용자 목록 동기화 수신');
        console.log('   발신자:', senderId);
        console.log('   수신한 사용자 수:', receivedUsers?.length || 0);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        if (!receivedUsers || !Array.isArray(receivedUsers)) {
          console.warn('⚠️ 잘못된 users 응답 데이터');
          return;
        }
        
        // 수신한 사용자 목록에서 비밀번호 저장 및 초기 비밀번호 설정
        try {
          const saved = localStorage.getItem('hotelflow_user_passwords_v1');
          const passwords = saved ? JSON.parse(saved) : {};
          let passwordsUpdated = false;
          
          receivedUsers.forEach((u: any) => {
            if (u.password && u.id) {
              // 수신한 비밀번호 저장
              passwords[u.id] = u.password;
              passwordsUpdated = true;
            } else if (!passwords[u.id] && u.username && DEFAULT_PASSWORDS[u.username]) {
              // 비밀번호가 없고 기본 비밀번호가 있으면 설정
              passwords[u.id] = DEFAULT_PASSWORDS[u.username];
              passwordsUpdated = true;
            }
          });
          
          if (passwordsUpdated) {
            localStorage.setItem('hotelflow_user_passwords_v1', JSON.stringify(passwords));
            console.log('✅ 비밀번호 동기화 완료:', Object.keys(passwords).length, '개');
          }
        } catch (e) {
          console.warn('⚠️ 비밀번호 저장 실패:', e);
        }
        
        setUsers(prev => {
          // 현재 사용자 목록과 수신한 사용자 목록 병합
          const userMap = new Map<string, User>();
          
          // 현재 사용자 목록 추가
          prev.forEach(u => {
            const { password, ...userWithoutPassword } = u;
            userMap.set(u.id, userWithoutPassword as User);
          });
          
          // 수신한 사용자 목록 추가/업데이트 (더 최신 데이터로)
          receivedUsers.forEach((u: any) => {
            const { password, ...userWithoutPassword } = u;
            userMap.set(u.id, userWithoutPassword as User);
          });
          
          const merged = Array.from(userMap.values());
          
          // 병합된 사용자 목록이 이전과 다르면 localStorage에 저장
          const prevIds = new Set(prev.map(u => u.id).sort());
          const mergedIds = new Set(merged.map(u => u.id).sort());
          const idsChanged = prevIds.size !== mergedIds.size || 
            !Array.from(prevIds).every(id => mergedIds.has(id));
          
          if (idsChanged || prev.length !== merged.length) {
            try {
              localStorage.setItem('hotelflow_users_v1', JSON.stringify(merged));
              console.log('✅ 사용자 목록 동기화 완료:', {
                이전: prev.length,
                병합: merged.length,
                localStorage: '저장됨'
              });
            } catch (e) {
              console.warn('⚠️ localStorage에 users 저장 실패:', e);
            }
          }
          
          return merged;
        });
      });

      // ❌ all_orders_response 핸들러 비활성화
      // 이유: Supabase가 Single Source of Truth이므로 다른 클라이언트의 localStorage 데이터로 덮어쓰면 안 됨
      // 실시간 업데이트는 NEW_ORDER, ORDER_UPDATE 등의 이벤트로 처리됨
      socket.on('all_orders_response', (data: any) => {
        if (!mounted) return;
        const { orders: receivedOrders, senderId } = data;
        const user = currentUserRef.current;
        
        // 로그인 상태일 때만 처리
        if (!user) return;
        
        // 🚨 Supabase 데이터가 이미 로드된 경우 무시 (Supabase = Single Source of Truth)
        // handleLogin에서 Supabase 데이터를 로드했으므로, 다른 클라이언트의 localStorage 데이터로 덮어쓰면 안 됨
        const supabaseDataLoaded = localStorage.getItem('hotelflow_supabase_data_loaded') === 'true';
        if (supabaseDataLoaded) {
          debugLog(`🚫 all_orders_response 무시: Supabase 데이터가 이미 로드됨 (from ${senderId})`);
          return;
        }
        
        // 자신이 보낸 응답은 무시 (단, 서버 응답은 항상 처리)
        if (senderId === user.id && senderId !== 'server') return;
        
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
          
          // ⚠️ 정렬 제거: Supabase 순서를 유지하기 위해 클라이언트 정렬 안 함
          // Supabase가 Single Source of Truth이므로 서버 순서를 그대로 유지
          const merged = Array.from(orderMap.values());
          
          debugLog(`✅ 주문 목록 병합 완료: 기존 ${prev.length}개 + 수신 ${parsedOrders.length}개 = 총 ${merged.length}개`);
          debugLog(`⚠️ 정렬 안 함: Supabase 순서 유지 (Single Source of Truth)`);
          return merged;
        });
      });

      // 🚨 중복 리스너 방지: 모든 리스너 제거 후 새로 등록
      // 중요: socket.off()만으로는 부족할 수 있으므로 removeAllListeners() 사용
      const existingListeners = socket.listeners(SYNC_CHANNEL).length;
      if (existingListeners > 0) {
        console.log(`🧹 기존 리스너 제거 중 (${existingListeners}개 발견)`);
        socket.removeAllListeners(SYNC_CHANNEL); // 모든 SYNC_CHANNEL 리스너 제거
        socket.off(SYNC_CHANNEL); // 추가 안전장치
        console.log('✅ 기존 리스너 제거 완료');
      }
      
      console.log('🔌 WebSocket 이벤트 리스너 등록 시작');
      console.log('   - 채널:', SYNC_CHANNEL);
      console.log('   - Socket ID:', socket.id);
      console.log('   - 연결 상태:', socket.connected ? '✅ 연결됨' : '❌ 연결 안 됨');
      
      // 🚨 최우선 목표: 실시간 동기화 및 토스트 알림 보장
      // 서버로부터 메시지 수신 (로그인 상태와 무관하게 항상 수신)
      // 중요: 이벤트 리스너는 한 번만 등록되어야 함
      // 🚨 중요: messageHandler를 먼저 정의하고 messageHandlerRef에 저장 (connect/reconnect에서 사용)
      const messageHandler = (data: any) => {
        // 🚨 최우선: 메시지 수신 확인 로그 (항상 출력 - 가장 중요!)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📥 [✅✅✅ 메시지 수신 확인] WebSocket 메시지 수신됨!');
        console.log('   수신 시간:', new Date().toISOString());
        console.log('   Socket ID:', socket.id);
        console.log('   연결 상태:', socket.connected ? '✅ 연결됨' : '❌ 연결 안 됨');
        console.log('   리스너 작동 확인: ✅ messageHandler 호출됨');
        console.log('   메시지 데이터:', JSON.stringify(data).substring(0, 200));
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        if (!mounted) {
          console.warn('⚠️ 컴포넌트 언마운트 상태 - 메시지 처리 스킵');
          return; // 컴포넌트가 언마운트되면 처리하지 않음
        }
        
        // 🚨 최우선 목표: 실시간 동기화 및 토스트 알림 보장
        // 메시지 수신 즉시 처리 (지연 없음)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📥 [이벤트 리스너] WebSocket 메시지 수신 시작 (즉시 처리)');
        console.log('   수신 시간:', new Date().toISOString());
        console.log('   Socket ID:', socket.id);
        console.log('   연결 상태:', socket.connected ? '✅ 연결됨' : '❌ 연결 안 됨');
        console.log('   리스너 등록 확인: ✅ 정상 작동 중');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        const { type, payload, senderId, sessionId, timestamp } = data;
        
        const user = currentUserRef.current;
        
        // 🚨 항상 출력 (실시간 동기화 문제 디버깅용)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📥 WebSocket 메시지 수신 (즉시 처리)');
        console.log('   메시지 타입:', type);
        console.log('   발신자:', senderId || 'null', '| 세션:', sessionId || 'null');
        console.log('   현재 사용자:', user ? `${user.name} (${user.id}, ${user.dept})` : '로그아웃');
        console.log('   현재 세션:', SESSION_ID);
        console.log('   Socket ID:', socket.id);
        console.log('   연결 상태:', socket.connected ? '✅ 연결됨' : '❌ 연결 안 됨');
        console.log('   수신 시간:', new Date().toISOString());
        if (type === 'NEW_ORDER') {
          console.log('   주문 정보:', {
            id: payload?.id,
            roomNo: payload?.roomNo,
            itemName: payload?.itemName,
            quantity: payload?.quantity
          });
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
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
              createdAt: o.createdAt ? new Date(o.createdAt) : new Date(o.requestedAt), // created_at 우선, 없으면 requestedAt 사용
              acceptedAt: o.acceptedAt ? new Date(o.acceptedAt) : undefined,
              inProgressAt: o.inProgressAt ? new Date(o.inProgressAt) : undefined,
              completedAt: o.completedAt ? new Date(o.completedAt) : undefined,
              memos: (o.memos && Array.isArray(o.memos)) ? o.memos.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })) : []
            })).sort((a, b) => {
              const aTime = (a.createdAt ? new Date(a.createdAt).getTime() : a.requestedAt.getTime());
              const bTime = (b.createdAt ? new Date(b.createdAt).getTime() : b.requestedAt.getTime());
              return bTime - aTime; // DESC (최신순)
            }) : [];
            
            // 메시지 타입에 따라 orders 또는 users 업데이트
            let updatedOrders = currentOrders;
            
            switch (type) {
              case 'NEW_ORDER': {
                const newOrder = {
                  ...payload,
                  requestedAt: payload.requestedAt ? new Date(payload.requestedAt) : new Date(),
                  createdAt: payload.createdAt ? new Date(payload.createdAt) : (payload.requestedAt ? new Date(payload.requestedAt) : new Date()), // created_at 우선, 없으면 requestedAt 사용
                  acceptedAt: payload.acceptedAt ? new Date(payload.acceptedAt) : undefined,
                  inProgressAt: payload.inProgressAt ? new Date(payload.inProgressAt) : undefined,
                  completedAt: payload.completedAt ? new Date(payload.completedAt) : undefined,
                  memos: payload.memos && Array.isArray(payload.memos) 
                    ? payload.memos.map((m: any) => ({ ...m, timestamp: m.timestamp ? new Date(m.timestamp) : new Date() })) 
                    : []
                };
                const exists = updatedOrders.find(o => o.id === newOrder.id);
                if (!exists) {
                  // created_at 기준으로 정렬 (Supabase와 동일)
                  updatedOrders = [newOrder, ...updatedOrders].sort((a, b) => {
                    const aTime = (a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.requestedAt).getTime());
                    const bTime = (b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.requestedAt).getTime());
                    return bTime - aTime; // DESC (최신순)
                  });
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
              case 'USER_ADD': {
                // 로그아웃 상태에서도 사용자 추가 처리
                try {
                  const saved = localStorage.getItem('hotelflow_users_v1');
                  const users = saved ? JSON.parse(saved) : [];
                  const exists = users.find((u: User) => u.id === payload.id);
                  if (!exists) {
                    const { password, ...userWithoutPassword } = payload;
                    const updated = [...users, userWithoutPassword];
                    localStorage.setItem('hotelflow_users_v1', JSON.stringify(updated));
                    // 비밀번호 별도 저장
                    if (payload.password) {
                      const passwords = JSON.parse(localStorage.getItem('hotelflow_user_passwords_v1') || '{}');
                      passwords[payload.id] = payload.password;
                      localStorage.setItem('hotelflow_user_passwords_v1', JSON.stringify(passwords));
                    }
                    console.log('✅ 로그아웃 상태 - 사용자 추가 완료:', payload.name);
                  }
                } catch (e) {
                  console.error('❌ 로그아웃 상태 사용자 추가 실패:', e);
                }
                break;
              }
              case 'USER_UPDATE': {
                // 로그아웃 상태에서도 사용자 수정 처리
                try {
                  const saved = localStorage.getItem('hotelflow_users_v1');
                  const users = saved ? JSON.parse(saved) : [];
                  const updated = users.map((u: User) => 
                    u.id === payload.id ? { ...u, ...payload, password: undefined } : u
                  );
                  localStorage.setItem('hotelflow_users_v1', JSON.stringify(updated));
                  // 비밀번호 업데이트
                  if (payload.password) {
                    const passwords = JSON.parse(localStorage.getItem('hotelflow_user_passwords_v1') || '{}');
                    passwords[payload.id] = payload.password;
                    localStorage.setItem('hotelflow_user_passwords_v1', JSON.stringify(passwords));
                  }
                  console.log('✅ 로그아웃 상태 - 사용자 수정 완료:', payload.name);
                } catch (e) {
                  console.error('❌ 로그아웃 상태 사용자 수정 실패:', e);
                }
                break;
              }
              case 'USER_DELETE': {
                // 로그아웃 상태에서도 사용자 삭제 처리
                try {
                  const saved = localStorage.getItem('hotelflow_users_v1');
                  const users = saved ? JSON.parse(saved) : [];
                  const updated = users.filter((u: User) => u.id !== payload.userId);
                  localStorage.setItem('hotelflow_users_v1', JSON.stringify(updated));
                  // 비밀번호도 삭제
                  const passwords = JSON.parse(localStorage.getItem('hotelflow_user_passwords_v1') || '{}');
                  delete passwords[payload.userId];
                  localStorage.setItem('hotelflow_user_passwords_v1', JSON.stringify(passwords));
                  console.log('✅ 로그아웃 상태 - 사용자 삭제 완료:', payload.userId);
                } catch (e) {
                  console.error('❌ 로그아웃 상태 사용자 삭제 실패:', e);
                }
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
        // 중요: 로그인 상태에서만 UI 업데이트 및 알림 표시
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔐 로그인 상태 - UI 업데이트 및 알림 표시 시작 (즉시 실행)');
        console.log('   메시지 타입:', type);
        console.log('   현재 사용자:', user?.name, `(${user?.id}, ${user?.dept})`);
        console.log('   발신자:', senderId || 'null');
        console.log('   세션 ID (수신):', sessionId || 'null');
        console.log('   세션 ID (현재):', SESSION_ID);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        switch (type) {
          case 'NEW_ORDER': {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🆕 NEW_ORDER 처리 시작 (로그인 상태)');
            console.log('   주문 ID:', payload?.id);
            console.log('   방번호:', payload?.roomNo);
            console.log('   아이템:', payload?.itemName);
            console.log('   수량:', payload?.quantity);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
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
              // 🚨 최우선 목표: 실시간 동기화 및 토스트 알림 보장
              // 알림 표시 조건: 자신의 기기에서 생성한 주문만 알림 스킵
              // - sessionId가 없으면 → 항상 알림 표시 (다른 기기로 간주)
              // - sessionId가 다르면 → 항상 알림 표시 (다른 기기)
              // - senderId가 다르면 → 항상 알림 표시 (다른 사용자)
              // - sessionId가 같고 senderId가 같으면 → 알림 스킵 (자신의 기기)
              // 중요: 모든 의심스러운 경우에는 알림 표시 (안전한 선택)
              
              // 🚨 최우선 목표: 실시간 동기화 및 토스트 알림 보장
              // 알림 표시 원칙: 모든 의심스러운 경우에는 알림 표시 (안전한 선택)
              // 자신의 메시지 판단: senderId와 sessionId가 모두 완벽히 일치할 때만 스킵
              
              let isSelfMessage = false;
              
              // 자신의 메시지 판단 조건 (모두 만족해야 함):
              // 1. user가 존재해야 함
              // 2. senderId가 존재하고 user.id와 같아야 함
              // 3. sessionId가 존재하고 비어있지 않아야 함
              // 4. SESSION_ID가 존재하고 비어있지 않아야 함
              // 5. sessionId와 SESSION_ID가 같아야 함
              // 
              // 하나라도 조건이 맞지 않으면 → 다른 기기/사용자로 간주 → 항상 알림 표시
              
              const hasUser = !!user;
              const hasSenderId = !!senderId && senderId.trim() !== '';
              const senderMatches = hasUser && hasSenderId && senderId === user.id;
              const hasSessionId = !!sessionId && sessionId !== '' && sessionId !== 'null' && sessionId !== 'undefined';
              const hasCurrentSessionId = !!SESSION_ID && SESSION_ID !== '' && SESSION_ID !== 'null' && SESSION_ID !== 'undefined';
              const sessionMatches = hasSessionId && hasCurrentSessionId && sessionId === SESSION_ID;
              
              // 모든 조건이 완벽히 일치할 때만 자신의 메시지로 판단
              // 하나라도 다르거나 없으면 → 다른 기기/사용자 → 항상 알림 표시
              isSelfMessage = hasUser && senderMatches && sessionMatches;
              
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
              console.log('🔍 isSelfMessage 판단 과정:');
              console.log('   - user 존재:', hasUser, `(${user?.id || 'null'})`);
              console.log('   - senderId 존재:', hasSenderId, `(${senderId || 'null'})`);
              console.log('   - senderId 일치:', senderMatches);
              console.log('   - sessionId 존재:', hasSessionId, `(${sessionId || 'null'})`);
              console.log('   - SESSION_ID 존재:', hasCurrentSessionId, `(${SESSION_ID || 'null'})`);
              console.log('   - sessionId 일치:', sessionMatches);
              console.log('   - 최종 isSelfMessage:', isSelfMessage);
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
              
              if (isSelfMessage) {
                console.log('✅ 자신의 메시지 확인: sessionId와 senderId가 모두 일치');
                console.log('   - 알림 스킵 (자신의 기기에서 생성한 주문)');
              } else {
                // 하나라도 다르거나 없으면 → 다른 기기/사용자 → 항상 알림 표시
                console.log('✅ 다른 기기/사용자의 메시지 - 알림 표시');
                if (user && senderId && senderId === user.id) {
                  console.log('   - senderId는 같지만 sessionId가 다르므로 다른 기기로 간주');
                } else if (user && senderId && senderId !== user.id) {
                  console.log('   - 다른 사용자의 메시지');
                } else {
                  console.log('   - 사용자 정보 또는 발신자 정보가 없음');
                }
              }
              
              // 🚨 항상 출력 (알림 문제 디버깅용)
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
              console.log('🆕 NEW_ORDER 처리 시작');
              console.log('   주문 ID:', newOrder.id);
              console.log('   방번호:', newOrder.roomNo);
              console.log('   아이템:', newOrder.itemName);
              console.log('   수량:', newOrder.quantity);
              console.log('   현재 사용자:', user?.id, `(${user?.name})`);
              console.log('   발신자:', senderId);
              console.log('   세션 ID (수신):', sessionId || 'null/undefined');
              console.log('   세션 ID (현재):', SESSION_ID);
              console.log('   같은 기기:', isSelfMessage);
              console.log('   알림 표시 여부:', !isSelfMessage ? '✅ YES' : '❌ NO (자신의 메시지)');
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
              
              // 🚨 최우선 목표: 실시간 동기화 보장
              // UI 업데이트 (모든 로그인된 사용자 - 자신의 메시지도 포함)
              // 모든 기기에서 즉시 UI 업데이트
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
              console.log('🔄 UI 업데이트 시작 (즉시 실행 - 최우선 목표)');
              console.log('   주문 ID:', newOrder.id);
              console.log('   방번호:', newOrder.roomNo);
              console.log('   아이템:', newOrder.itemName);
              console.log('   수량:', newOrder.quantity);
              // orders.length는 클로저 문제가 있을 수 있으므로 prev.length 사용
              // (실제로는 setOrders 내부에서 prev를 사용하므로 문제 없음)
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
              
              // 🚨 React 상태 업데이트 (즉시 실행)
              setOrders(prev => {
                const exists = prev.find(o => o.id === newOrder.id);
                if (exists) {
                  console.log('⚠️ 기존 주문 업데이트:', exists.id, exists.roomNo, exists.itemName);
                  // created_at 기준으로 정렬 (Supabase와 동일)
                  const updated = prev.map(o => o.id === newOrder.id ? newOrder : o)
                    .sort((a, b) => {
                      const aTime = (a.createdAt ? new Date(a.createdAt).getTime() : (a.requestedAt instanceof Date ? a.requestedAt.getTime() : new Date(a.requestedAt).getTime()));
                      const bTime = (b.createdAt ? new Date(b.createdAt).getTime() : (b.requestedAt instanceof Date ? b.requestedAt.getTime() : new Date(b.requestedAt).getTime()));
                      return bTime - aTime; // DESC (최신순)
                    });
                  try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                    console.log('✅ localStorage 업데이트 완료 (기존 주문)');
                  } catch (e) {
                    console.error('❌ localStorage 저장 실패:', e);
                  }
                  console.log('✅ UI 업데이트 완료 (기존 주문 업데이트)');
                  console.log('   - 업데이트 후 주문 수:', updated.length);
                  return updated;
                }
                
                console.log('✅ 새 주문 추가:', newOrder.id, newOrder.roomNo, newOrder.itemName);
                // created_at 기준으로 정렬 (Supabase와 동일)
                const newOrders = [newOrder, ...prev].sort((a, b) => {
                  const aTime = (a.createdAt ? new Date(a.createdAt).getTime() : (a.requestedAt instanceof Date ? a.requestedAt.getTime() : new Date(a.requestedAt).getTime()));
                  const bTime = (b.createdAt ? new Date(b.createdAt).getTime() : (b.requestedAt instanceof Date ? b.requestedAt.getTime() : new Date(b.requestedAt).getTime()));
                  return bTime - aTime; // DESC (최신순)
                });
                
                try {
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrders));
                  console.log('✅ localStorage 저장 완료 (새 주문)');
                } catch (e) {
                  console.error('❌ localStorage 저장 실패:', e);
                }
                
                console.log('✅ UI 업데이트 완료 (새 주문 추가)');
                console.log('   - 업데이트 전 주문 수:', prev.length);
                console.log('   - 업데이트 후 주문 수:', newOrders.length);
                return newOrders;
              });
              
              // 🚨 React 상태 업데이트 완료 확인
              console.log('✅ setOrders 호출 완료 - React 상태 업데이트 예정');
              console.log('   - React는 비동기적으로 상태를 업데이트합니다');
              console.log('   - UI는 다음 렌더링 사이클에서 자동으로 업데이트됩니다');
              
              // 🚨 모든 주문을 알림 히스토리에 추가 (모든 기기, 자신 포함)
              const orderIdPart = newOrder.id ? `(#${newOrder.id})` : '';
              const orderNotificationMessage = `${newOrder.roomNo}호${orderIdPart} 신규 요청 : ${newOrder.itemName} (수량: ${newOrder.quantity})`;
              
              // 알림 히스토리에 모든 주문 추가 (중복 방지)
              setNotificationHistory(prev => {
                const duplicate = prev.find(t => t.orderId === newOrder.id);
                if (duplicate) {
                  return prev; // 이미 있으면 추가하지 않음
                }
                
                const newNotification: Toast = {
                  id: `order_${newOrder.id}_${Date.now()}`,
                  message: orderNotificationMessage,
                  type: 'info',
                  dept: Department.FRONT_DESK,
                  timestamp: new Date(),
                  orderId: newOrder.id,
                  roomNo: newOrder.roomNo,
                  soundEffect: 'NEW_ORDER'
                };
                
                const updated = [newNotification, ...prev].slice(0, 1000); // 최대 1000개 유지
                
                // localStorage에 저장
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
              
              // 🚨 최우선 목표: 토스트 알림 보장
              // 알림 표시: 자신이 보낸 메시지가 아닐 때만 알림 표시
              // 실시간 동기화 보장: 모든 기기에서 알림 표시 (자신의 기기 제외)
              // 중요: sessionId가 없거나 다른 경우 항상 알림 표시 (다른 기기/사용자로 간주)
              if (!isSelfMessage) {
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('🔔 토스트 알림 표시 시작 (최우선 목표)');
                console.log('   주문:', newOrder.roomNo, newOrder.itemName);
                console.log('   현재 사용자:', user?.name, `(${user?.id})`);
                console.log('   발신자:', senderId);
                console.log('   세션 ID (수신):', sessionId || 'null/undefined');
                console.log('   세션 ID (현재):', SESSION_ID);
                console.log('   같은 기기:', isSelfMessage);
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                
                // 🚨 토스트 알림 강제 표시 (최우선 목표)
                // 스크린샷 형식과 일치: "1033호(#20260110_21) 신규 요청 : 런드리 봉투 (수량: 1)"
                try {
                  // 주문 ID 추출 (예: 20260110_21 → #20260110_21)
                  // 주문 ID 형식: YYYYMMDD_SEQ (예: 20260110_21)
                  const orderIdPart = newOrder.id ? `(#${newOrder.id})` : '';
                  // 항상 수량 표시 (수량 1이어도 표시)
                  const toastMessage = `${newOrder.roomNo}호${orderIdPart} 신규 요청 : ${newOrder.itemName} (수량: ${newOrder.quantity})`;
                  
                  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                  console.log('🔔 토스트 알림 표시 시작 (최우선 목표)');
                  console.log('   토스트 메시지:', toastMessage);
                  console.log('   주문 ID:', newOrder.id);
                  console.log('   방번호:', newOrder.roomNo);
                  console.log('   아이템:', newOrder.itemName);
                  console.log('   수량:', newOrder.quantity);
                  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                  
                  // 🚨 토스트 알림 즉시 표시 (동기적으로 실행)
                  triggerToast(
                    toastMessage, 
                    'info', 
                    Department.FRONT_DESK, 
                    'NEW_ORDER',
                    newOrder.id,
                    newOrder.roomNo
                  );
                  
                  console.log('✅ triggerToast 호출 완료 (즉시 실행)');
                  console.log('✅ 토스트 알림 표시 완료 (최우선 목표 달성)');
                  console.log('   - 토스트 메시지:', toastMessage);
                  console.log('   - 주문 ID:', newOrder.id);
                  console.log('   - 방번호:', newOrder.roomNo);
                  console.log('   - React state (toasts)에 추가됨');
                  console.log('   - ToastNotification 컴포넌트가 자동으로 렌더링됨');
                } catch (toastError) {
                  console.error('❌ triggerToast 호출 실패:', toastError);
                  console.error('   - 에러 상세:', toastError);
                  console.error('   - 에러 스택:', (toastError as Error).stack);
                  // 에러 발생 시에도 재시도
                  try {
                    // 주문 ID 추출 (예: 20260110_21 → #20260110_21)
                    const orderIdPart = newOrder.id ? `(#${newOrder.id})` : '';
                    // 항상 수량 표시 (수량 1이어도 표시)
                    const retryMessage = `${newOrder.roomNo}호${orderIdPart} 신규 요청 : ${newOrder.itemName} (수량: ${newOrder.quantity})`;
                    triggerToast(
                      retryMessage, 
                      'info', 
                      Department.FRONT_DESK, 
                      'NEW_ORDER',
                      newOrder.id,
                      newOrder.roomNo
                    );
                    console.log('✅ 재시도 성공:', retryMessage);
                  } catch (retryError) {
                    console.error('❌ 재시도 실패:', retryError);
                  }
                }
              } else {
                console.log('⏭️ 알림 스킵 (자신의 메시지):', {
                  roomNo: newOrder.roomNo,
                  currentUser: user?.id,
                  senderId: senderId,
                  sessionId_received: sessionId,
                  sessionId_current: SESSION_ID,
                  reason: '같은 기기에서 생성한 주문이므로 알림 표시하지 않음'
                });
              }
              
              console.log('✅ NEW_ORDER 처리 완료 (실시간 동기화 및 토스트 알림 최우선 목표 달성)');
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
                      // created_at 기준으로 정렬 (Supabase와 동일)
                      const newOrders = [updatedOrder, ...prev].sort((a, b) => {
                        const aTime = (a.createdAt ? new Date(a.createdAt).getTime() : a.requestedAt.getTime());
                        const bTime = (b.createdAt ? new Date(b.createdAt).getTime() : b.requestedAt.getTime());
                        return bTime - aTime; // DESC (최신순)
                      });
                      localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrders));
                      console.log('✅ localStorage에서 주문 복원 후 상태 업데이트 완료 (created_at 기준 정렬)');
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
              
              // 🚨 최신순 정렬 후 localStorage 저장 (PC와 모바일 동기화 보장)
              // created_at 기준으로 정렬 (Supabase와 동일)
              const sortedUpdated = updated.sort((a, b) => {
                const aTime = (a.createdAt ? new Date(a.createdAt).getTime() : a.requestedAt.getTime());
                const bTime = (b.createdAt ? new Date(b.createdAt).getTime() : b.requestedAt.getTime());
                return bTime - aTime; // DESC (최신순)
              });
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(sortedUpdated));
                console.log('💾 상태 업데이트 후 localStorage 저장 완료 (created_at 기준 정렬)');
              } catch (e) {
                console.warn('⚠️ localStorage 저장 실패:', e);
              }
              
              return sortedUpdated;
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
              
              // 🚨 최신순 정렬 후 localStorage 업데이트 (모든 기기에서 최신 데이터 유지)
              // created_at 기준으로 정렬 (Supabase와 동일)
              const sortedUpdated = updated.sort((a, b) => {
                const aTime = (a.createdAt ? new Date(a.createdAt).getTime() : a.requestedAt.getTime());
                const bTime = (b.createdAt ? new Date(b.createdAt).getTime() : b.requestedAt.getTime());
                return bTime - aTime; // DESC (최신순)
              });
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(sortedUpdated));
                console.log('   💾 localStorage 업데이트 완료 (NEW_MEMO, created_at 기준 정렬)');
              } catch (e) {
                console.error('   ❌ localStorage 업데이트 실패:', e);
              }
              
              return sortedUpdated;
            });
            
            // 🚨 알림 표시: 모든 메모에 대해 알림 표시
            const roomDisplay = foundRoomNo ? `${foundRoomNo}호` : `#${payload.orderId}`;
            debugLog('🔔 메모 알림:', roomDisplay, '|', payload.memo.text);
            
            // 메모 알림에 orderId와 roomNo 포함 (클릭 시 해당 주문으로 이동)
            const memoToastMessage = `${roomDisplay} 새 메모: ${payload.memo.text}`;
            triggerToast(
              memoToastMessage, 
              'memo', 
              payload.memo.senderDept, 
              'MEMO',
              payload.orderId,  // orderId 추가
              foundRoomNo,       // roomNo 추가
              payload.memo.text  // memoText 추가
            );
            break;
          }

          case 'USER_ADD': {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📥 [USER_ADD] 사용자 추가 메시지 수신');
            console.log('   발신자:', senderId);
            console.log('   사용자 이름:', payload.name);
            console.log('   사용자 ID:', payload.id);
            console.log('   Username:', payload.username);
            console.log('   로그인 상태:', currentUserRef.current ? `${currentUserRef.current.name} (로그인)` : '로그아웃');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
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
              
              console.log('✅ 새 사용자 추가 중:', payload.name, {
                isSelfMessage: isSelfMessage ? '자신이 보낸 메시지' : '다른 사용자',
                loginStatus: user ? '로그인 상태' : '로그아웃 상태',
                prevCount: prev.length,
                newCount: prev.length + 1
              });
              
              // 비밀번호 별도 저장
              if (payload.password) {
                try {
                  const saved = localStorage.getItem('hotelflow_user_passwords_v1');
                  const passwords = saved ? JSON.parse(saved) : {};
                  passwords[payload.id] = payload.password;
                  localStorage.setItem('hotelflow_user_passwords_v1', JSON.stringify(passwords));
                  console.log('✅ 비밀번호 동기화 완료:', payload.username);
                } catch (e) {
                  console.warn('⚠️ 비밀번호 저장 실패:', e);
                }
              }
              
              // 🔒 보안: users에서는 비밀번호 필드 제거
              const { password, ...userWithoutPassword } = payload;
              const updated = [...prev, userWithoutPassword];
              
              // localStorage에 저장 (앱 재시작 시에도 유지) - 비밀번호 제외
              try {
                localStorage.setItem('hotelflow_users_v1', JSON.stringify(updated));
                console.log('✅ localStorage에 users 저장 완료:', updated.length, '명');
              } catch (e) {
                console.error('❌ localStorage에 users 저장 실패:', e);
              }
              
              return updated;
            });
            
            // 모든 기기에서 알림 표시 (로그인/로그아웃 상태 모두 포함)
            triggerToast(`새 직원 등록됨: ${payload.name}`, 'success', Department.ADMIN, 'SUCCESS');
            console.log('🔔 사용자 추가 알림 표시 완료:', payload.name);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
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
              
              // 비밀번호 별도 저장 (변경된 경우)
              if (payload.password) {
                try {
                  const saved = localStorage.getItem('hotelflow_user_passwords_v1');
                  const passwords = saved ? JSON.parse(saved) : {};
                  passwords[payload.id] = payload.password;
                  localStorage.setItem('hotelflow_user_passwords_v1', JSON.stringify(passwords));
                  console.log('✅ 비밀번호 동기화 완료:', payload.username);
                } catch (e) {
                  console.warn('⚠️ 비밀번호 저장 실패:', e);
                }
              }
              
              // 🔒 보안: users에서는 비밀번호 필드 제거
              const { password, ...userWithoutPassword } = payload;
              const updated = prev.map(u => u.id === payload.id ? userWithoutPassword : u);
              // localStorage에 저장 (앱 재시작 시에도 유지) - 비밀번호 제외
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
              
              // 비밀번호도 삭제
              try {
                const saved = localStorage.getItem('hotelflow_user_passwords_v1');
                if (saved) {
                  const passwords = JSON.parse(saved);
                  delete passwords[payload.userId];
                  localStorage.setItem('hotelflow_user_passwords_v1', JSON.stringify(passwords));
                  console.log('✅ 비밀번호 삭제 완료:', payload.userId);
                }
              } catch (e) {
                console.warn('⚠️ 비밀번호 삭제 실패:', e);
              }
              
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
      };
      
      // 🚨 이벤트 리스너 등록 (한 번만)
      // 최우선 목표: 실시간 동기화 및 토스트 알림 보장
      // 중요: socket.on()은 항상 리스너를 추가하므로, removeAllListeners() 후에 호출해야 함
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔌 [중요] 이벤트 리스너 등록 시작');
      console.log('   - 채널:', SYNC_CHANNEL);
      console.log('   - Socket ID:', socket.id);
      console.log('   - 연결 상태:', socket.connected ? '✅ 연결됨' : '❌ 연결 안 됨');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      try {
        // 🚨 리스너 등록 전 확인
        const beforeCount = socket.listeners(SYNC_CHANNEL).length;
        console.log('   - 등록 전 리스너 수:', beforeCount);
        
        // 리스너 등록 (래퍼 함수 사용)
        socket.on(SYNC_CHANNEL, messageHandlerWrapper);
        // 실제 messageHandler를 messageHandlerRef에 저장
        messageHandlerRef.current = messageHandler;
        console.log('✅ socket.on() 호출 완료 (messageHandlerWrapper 등록 및 messageHandlerRef 저장)');
        
        // 🚨 리스너 등록 즉시 확인 (디버깅용)
        const afterCount = socket.listeners(SYNC_CHANNEL).length;
        console.log('   - 등록 후 리스너 수:', afterCount);
        
        if (afterCount === beforeCount + 1) {
          console.log('✅ 리스너가 정상적으로 추가되었습니다');
        } else {
          console.warn('⚠️ 리스너 추가 확인 실패:', { before: beforeCount, after: afterCount });
        }
      } catch (error) {
        console.error('❌ socket.on() 호출 실패:', error);
        console.error('   - 에러 상세:', error);
        console.error('   - 에러 스택:', (error as Error).stack);
      }
      
      // 🚨 최종 리스너 등록 확인
      const finalListenerCount = socket.listeners(SYNC_CHANNEL).length;
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ WebSocket 이벤트 리스너 등록 완료');
      console.log('   - 채널:', SYNC_CHANNEL);
      console.log('   - 핸들러:', 'messageHandler');
      console.log('   - Socket ID:', socket.id);
      console.log('   - 연결 상태:', socket.connected ? '✅ 연결됨' : '❌ 연결 안 됨');
      console.log('   - 등록된 리스너 수:', finalListenerCount);
      console.log('   - 리스너 등록 시간:', new Date().toISOString());
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      if (finalListenerCount > 1) {
        console.warn('⚠️ 리스너가 중복 등록되었을 수 있습니다!');
        console.warn('   - 리스너 수:', finalListenerCount);
        console.warn('   - 이는 문제가 될 수 있지만, 메시지는 정상적으로 수신될 것입니다.');
      } else if (finalListenerCount === 1) {
        console.log('✅ 리스너가 정상적으로 1개만 등록되었습니다');
        console.log('   - 실시간 동기화가 정상적으로 작동할 것입니다.');
      } else {
        console.error('❌ 리스너가 등록되지 않았습니다!');
        console.error('   - 이는 심각한 문제입니다. 실시간 동기화가 작동하지 않을 수 있습니다.');
        console.error('   - socket.on()을 다시 시도합니다...');
        try {
          // 래퍼 함수를 사용하여 리스너 등록
          socket.on(SYNC_CHANNEL, messageHandlerWrapper);
          const retryCount = socket.listeners(SYNC_CHANNEL).length;
          console.log('   - 재시도 후 리스너 수:', retryCount);
          if (retryCount > 0) {
            console.log('✅ 재시도 성공 - 리스너가 등록되었습니다');
          } else {
            console.error('❌ 재시도 실패 - 리스너가 여전히 등록되지 않았습니다');
          }
        } catch (retryError) {
          console.error('   - 재시도 실패:', retryError);
        }
      }
      
      // 🚨 테스트: 리스너가 실제로 작동하는지 확인
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔍 리스너 작동 테스트:');
      console.log('   - 서버에서 메시지를 보내면 위의 messageHandler가 호출되어야 합니다.');
      console.log('   - 메시지 수신 시 "📥 [✅✅✅ 메시지 수신 확인]" 로그가 나타나야 합니다.');
      console.log('   - 이 로그가 나타나지 않으면 리스너가 작동하지 않는 것입니다.');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    } catch (error) {
      console.warn('⚠️ WebSocket 초기화 실패:', error);
      setIsConnected(false);
    }

    return () => {
      mounted = false;
      // 컴포넌트 언마운트 시에만 연결 해제 (로그아웃 시에는 해제하지 않음)
      if (socketRef.current) {
        console.log('🧹 WebSocket 연결 정리 (컴포넌트 언마운트)');
        console.log('   - 이벤트 리스너 제거:', SYNC_CHANNEL);
        // 모든 리스너 제거 (안전)
        socketRef.current.removeAllListeners(SYNC_CHANNEL);
        socketRef.current.off(SYNC_CHANNEL);
        socketRef.current.removeAllListeners(); // 모든 리스너 제거
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
        console.log('✅ WebSocket 연결 정리 완료');
      }
    };
  }, []); // 🚨 의존성 배열 비움 - 이벤트 리스너는 한 번만 등록 (중복 방지)

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
            // 주문 목록 동기화는 WebSocket 실시간 메시지로 자동 처리되므로 별도 요청 불필요
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
        // 주문 목록 동기화는 WebSocket 실시간 메시지로 자동 처리되므로 별도 요청 불필요
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
                // 최신순으로 정렬하여 반환 (created_at 기준)
                return [newOrder, ...prev].sort((a, b) => {
                  const aTime = (a.createdAt ? new Date(a.createdAt).getTime() : a.requestedAt.getTime());
                  const bTime = (b.createdAt ? new Date(b.createdAt).getTime() : b.requestedAt.getTime());
                  return bTime - aTime; // DESC (최신순)
                });
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

  // API Base URL 가져오기
  const getApiBaseUrl = useCallback((): string => {
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
      
      if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.')) {
        return `${protocol}//${host}:3001`;
      }
    }
    
    // 기본값
    return 'http://localhost:3001';
  }, []);

  // localStorage 주문들을 DB로 자동 동기화
  const syncLocalStorageOrdersToDB = useCallback(async () => {
    try {
      const ordersJson = localStorage.getItem(STORAGE_KEY);
      if (!ordersJson) {
        debugLog('📭 localStorage에 주문이 없음');
        return;
      }

      const orders = JSON.parse(ordersJson);
      if (!Array.isArray(orders) || orders.length === 0) {
        debugLog('📭 localStorage 주문이 0개');
        return;
      }

      // Date 객체를 한국 시간 ISO 문자열로 변환
      const formattedOrders = orders.map((order: any) => ({
        ...order,
        requestedAt: order.requestedAt instanceof Date 
          ? toKoreaISO(order.requestedAt)
          : (typeof order.requestedAt === 'string' ? order.requestedAt : toKoreaISO(new Date(order.requestedAt))),
        acceptedAt: order.acceptedAt ? (order.acceptedAt instanceof Date ? toKoreaISO(order.acceptedAt) : order.acceptedAt) : undefined,
        inProgressAt: order.inProgressAt ? (order.inProgressAt instanceof Date ? toKoreaISO(order.inProgressAt) : order.inProgressAt) : undefined,
        completedAt: order.completedAt ? (order.completedAt instanceof Date ? toKoreaISO(order.completedAt) : order.completedAt) : undefined,
        memos: (order.memos || []).map((memo: any) => ({
          ...memo,
          timestamp: memo.timestamp instanceof Date 
            ? memo.timestamp.toISOString() 
            : (typeof memo.timestamp === 'string' ? memo.timestamp : new Date(memo.timestamp).toISOString())
        }))
      }));

      const apiUrl = `${getApiBaseUrl()}/api/orders/sync`;
      debugLog(`🔄 주문 동기화 시작: ${formattedOrders.length}개 주문 → ${apiUrl}`);

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
      debugLog(`✅ 주문 동기화 완료: ${result.results.created}개 생성, ${result.results.skipped}개 건너뜀, ${result.results.errors.length}개 오류`);

      if (result.results.created > 0) {
        triggerToast(
          `${result.results.created}개의 주문이 데이터베이스에 저장되었습니다.`,
          'success',
          currentUserRef.current?.dept,
          'SUCCESS'
        );
      }
    } catch (error: any) {
      debugError('❌ 주문 동기화 실패:', error.message);
      // 실패해도 사용자에게 알리지 않음 (백그라운드 작업)
    }
  }, [getApiBaseUrl, triggerToast]);

  const handleLogin = async (user: User) => {
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
    
    // 🚨 [최신순 정렬 수정] Supabase에서 최신 주문 데이터 가져오기
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔄 [최신순 정렬] Supabase에서 최신 데이터 가져오기 시작...');
    try {
      const apiUrl = getApiBaseUrl();
      const response = await fetch(`${apiUrl}/api/orders`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.orders)) {
          // ✅ 방법 1: Supabase를 절대적 기준으로 사용 (단순하고 확실함)
          // 서버에서 이미 최신순으로 정렬된 데이터를 그대로 사용
          // localStorage 병합하지 않음 (Supabase가 Single Source of Truth)
          const ordersFromSupabase = data.orders.map((o: any) => ({
            ...o,
            requestedAt: new Date(o.requestedAt),
            createdAt: o.createdAt ? new Date(o.createdAt) : new Date(o.requestedAt), // created_at 우선, 없으면 requestedAt 사용
            acceptedAt: o.acceptedAt ? new Date(o.acceptedAt) : undefined,
            inProgressAt: o.inProgressAt ? new Date(o.inProgressAt) : undefined,
            completedAt: o.completedAt ? new Date(o.completedAt) : undefined,
            memos: (o.memos && Array.isArray(o.memos)) ? o.memos.map((m: any) => ({ 
              ...m, 
              timestamp: new Date(m.timestamp) 
            })) : []
          }));
          
          console.log('✅ [Supabase 절대 우선] 데이터 로드 완료:', ordersFromSupabase.length, '개 주문');
          console.log('   📌 서버 정렬 순서를 100% 신뢰 (재정렬 안 함, localStorage 병합 안 함)');
          
          // 상위 5개 오더 로깅
          console.log('📊 상위 5개 오더 (서버 정렬 순서):');
          ordersFromSupabase.slice(0, 5).forEach((order, idx) => {
            const reqTime = order.requestedAt instanceof Date 
              ? order.requestedAt 
              : new Date(order.requestedAt);
            console.log(`   ${idx + 1}. ☁️ Supabase | ID: ${order.id} | 방: ${order.roomNo} | 아이템: ${order.itemName}`);
            console.log(`      시간: ${reqTime.toISOString()} (KST: ${reqTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })})`);
            console.log(`      타임스탬프: ${reqTime.getTime()}`);
          });
          
          console.log('   ⏰ 현재 시간:', new Date().toISOString(), '(KST:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) + ')');
          
          // Supabase 데이터를 그대로 사용 (서버 순서 유지)
          setOrders(ordersFromSupabase);
          
          // localStorage에 캐시 저장 (다음 새로고침 시 사용)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(ordersFromSupabase));
          console.log('✅ localStorage 캐시 업데이트 완료 (Supabase 순서 그대로)');
          
          // 🚨 Supabase 데이터 로드 플래그 설정 (all_orders_response 핸들러가 무시하도록)
          localStorage.setItem('hotelflow_supabase_data_loaded', 'true');
          console.log('✅ Supabase 데이터 로드 플래그 설정 완료 (all_orders_response 무시)');
        }
      } else {
        console.warn('⚠️ Supabase 데이터 로드 실패:', response.status);
      }
    } catch (error) {
      console.error('❌ [최신순 정렬] Supabase 데이터 로드 오류:', error);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // 로그인 시 사용자 목록 동기화 요청만 수행
    // 주문 목록은 이미 Supabase에서 최신순으로 로드되었으므로 request_all_orders 불필요
    const socket = socketRef.current;
    if (socket && socket.connected) {
      // 사용자 목록 동기화 요청
      setTimeout(() => {
        socket.emit('request_all_users', {
          senderId: user.id,
          timestamp: new Date().toISOString()
        });
        console.log('📤 WebSocket 메시지 전송 - request_all_users (로그인)');
      }, 500);
    }

    // localStorage 주문들을 DB로 자동 동기화 (백그라운드)
    setTimeout(() => {
      syncLocalStorageOrdersToDB();
    }, 2000); // 2초 후 실행 (WebSocket 연결 안정화 대기)
  };

  const handleLogout = () => {
    // 로그아웃 시 Settings 잠금 해제 상태 초기화
    try {
      localStorage.removeItem('hotelflow_debug_logging_unlocked');
      localStorage.removeItem('hotelflow_ws_logging_unlocked');
      // 🚨 Supabase 데이터 로드 플래그 초기화 (다음 로그인 시 다시 설정됨)
      localStorage.removeItem('hotelflow_supabase_data_loaded');
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
      
      // 최신순으로 정렬 (위에서 아래로: 가장 최근 주문이 위에, created_at 기준)
      const newOrders = [order, ...prev].sort((a, b) => {
        const aTime = (a.createdAt ? new Date(a.createdAt).getTime() : a.requestedAt.getTime());
        const bTime = (b.createdAt ? new Date(b.createdAt).getTime() : b.requestedAt.getTime());
        return bTime - aTime; // DESC (최신순)
      });
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
                requestedAt: payload.requestedAt ? toKoreaISO(payload.requestedAt) : undefined,
                acceptedAt: payload.acceptedAt ? toKoreaISO(payload.acceptedAt) : undefined,
                inProgressAt: payload.inProgressAt ? toKoreaISO(payload.inProgressAt) : undefined,
                completedAt: payload.completedAt ? toKoreaISO(payload.completedAt) : undefined,
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

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📤 주문 전송 시작');
        console.log('   주문 ID:', order.id);
        console.log('   방번호:', order.roomNo);
        console.log('   아이템:', order.itemName);
        console.log('   수량:', order.quantity);
        console.log('   발신자:', currentUser.id, `(${currentUser.name})`);
        console.log('   세션 ID:', SESSION_ID);
        console.log('   Socket ID:', socket.id);
        console.log('   연결 상태:', socket.connected ? '✅ 연결됨' : '❌ 연결 안 됨');
        console.log('   WebSocket URL:', wsUrlRef.current || getWebSocketURL());
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        if (socket.connected) {
          debugLog('📤 주문 브로드캐스트:', order.id, '| 방:', order.roomNo, '| 아이템:', order.itemName);
          
          try {
            // 한국 시간을 UTC로 변환하여 전송
            // order.requestedAt은 브라우저의 로컬 시간대(한국)로 생성됨
            // 하지만 JavaScript Date는 내부적으로 UTC로 저장되므로,
            // toISOString()은 이미 UTC로 변환합니다.
            // 
            // Supabase Table Editor에서 한국 시간으로 보이게 하려면:
            // - 한국 시간을 UTC로 변환하여 저장해야 함
            // - 예: 한국 시간 23:34 → UTC 14:34로 저장
            // - Supabase Table Editor에서 조회 시: UTC 14:34 → 한국 시간 23:34로 표시
            // 
            // 하지만 실제로는 toISOString()이 이미 UTC로 변환하므로,
            // 추가 변환이 필요 없습니다.
            // 
            // 문제: 사용자가 원하는 것은 Supabase Table Editor에서 한국 시간으로 보이는 것
            // 해결: 한국 시간을 그대로 UTC로 저장 (시간대 정보 없이)
            //       즉, 한국 시간 23:34를 UTC 23:34로 저장하려면 9시간을 더해야 함
            // 한국 시간(KST) 그대로 ISO 문자열로 변환하여 저장
            const payload = {
              ...order,
              requestedAt: toKoreaISO(order.requestedAt),
              acceptedAt: order.acceptedAt ? toKoreaISO(order.acceptedAt) : undefined,
              inProgressAt: order.inProgressAt ? toKoreaISO(order.inProgressAt) : undefined,
              completedAt: order.completedAt ? toKoreaISO(order.completedAt) : undefined,
              memos: order.memos.map(m => ({
                ...m,
                timestamp: koreaTimeToUTC(m.timestamp)
              }))
            };
            
            const message = {
              type: 'NEW_ORDER',
              payload,
              senderId: currentUser.id,
              sessionId: SESSION_ID,
              timestamp: new Date().toISOString()
            };
            
            console.log('📨 전송할 메시지:', JSON.stringify(message, null, 2));
            
            // 메시지 전송 (실시간 동기화)
            console.log('📤 socket.emit 호출 시작');
            console.log('   채널:', SYNC_CHANNEL);
            console.log('   메시지 타입:', message.type);
            console.log('   주문 ID:', message.payload.id);
            console.log('   Socket ID:', socket.id);
            console.log('   연결 상태:', socket.connected ? '✅ 연결됨' : '❌ 연결 안 됨');
            
            // 🚨 연결 상태 확인 및 강제 재연결
            if (!socket.connected) {
              console.error('❌ WebSocket 연결되지 않음 - 오프라인 큐에 저장');
              saveToOfflineQueue('NEW_ORDER', order, currentUser.id);
              return;
            }
            
            try {
              // 🚨 메시지 전송 (연결 상태 확인 완료)
              // 최우선 목표: 실시간 동기화 보장
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
              console.log('📤 socket.emit 호출 시작 (최우선 목표)');
              console.log('   채널:', SYNC_CHANNEL);
              console.log('   주문 ID:', order.id);
              console.log('   방번호:', order.roomNo);
              console.log('   아이템:', order.itemName);
              console.log('   수량:', order.quantity);
              console.log('   Socket ID:', socket.id);
              console.log('   연결 상태:', socket.connected ? '✅ 연결됨' : '❌ 연결 안 됨');
              console.log('   발신자:', message.senderId);
              console.log('   세션 ID:', message.sessionId);
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
              
              // 🚨 메시지 전송 (최우선 목표: 실시간 동기화 보장)
              socket.emit(SYNC_CHANNEL, message);
              
              console.log('✅ socket.emit 호출 완료:', order.id);
              console.log('   전송 시간:', new Date().toISOString());
              console.log('   Socket ID:', socket.id);
              console.log('   연결 상태:', socket.connected ? '✅ 연결됨' : '❌ 연결 안 됨');
              console.log('   메시지 타입:', message.type);
              console.log('   발신자:', message.senderId);
              console.log('   세션 ID:', message.sessionId);
              console.log('   채널:', SYNC_CHANNEL);
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
              
              // 🚨 전송 후 즉시 확인
              if (!socket.connected) {
                console.error('❌ 메시지 전송 후 연결 끊김 감지!');
                console.error('   - 재연결 필요');
                console.error('   - 오프라인 큐에 저장됨');
                saveToOfflineQueue('NEW_ORDER', order, currentUser.id);
              } else {
                console.log('✅ 메시지 전송 후 연결 상태 확인: 정상');
              }
              
              debugLog('✅ 브로드캐스트 완료:', order.id);
              
              // 전송 확인을 위한 짧은 딜레이 후 연결 상태 확인
              setTimeout(() => {
                if (!socket.connected) {
                  console.error('❌ 메시지 전송 후 WebSocket 연결 끊김 감지');
                  console.error('   - 재연결 시도 필요');
                  console.error('   - 오프라인 큐에 저장됨');
                  // 오프라인 큐에 저장 (전송 실패 가능성)
                  saveToOfflineQueue('NEW_ORDER', order, currentUser.id);
                } else {
                  console.log('✅ 메시지 전송 후 WebSocket 연결 유지 확인');
                }
              }, 100);
            } catch (emitError) {
              console.error('❌ socket.emit 호출 실패:', emitError);
              console.error('   - Socket ID:', socket.id);
              console.error('   - 연결 상태:', socket.connected);
              console.error('   - 에러 상세:', emitError);
              // 오프라인 큐에 저장
              saveToOfflineQueue('NEW_ORDER', order, currentUser.id);
            }
          } catch (error) {
            console.error('❌ 브로드캐스트 전송 실패:', error);
            console.error('   - Socket ID:', socket.id);
            console.error('   - 연결 상태:', socket.connected);
            console.error('   - 에러 상세:', error);
            // 오프라인 큐에 저장
            saveToOfflineQueue('NEW_ORDER', order, currentUser.id);
          }
        } else {
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.error('❌ WebSocket 연결되지 않음!');
          console.error('   주문 ID:', order.id);
          console.error('   방번호:', order.roomNo);
          console.error('   Socket ID:', socket.id);
          console.error('   연결 상태:', socket.connected);
          console.error('   WebSocket URL:', wsUrlRef.current || getWebSocketURL());
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          
          // 오프라인 큐에 저장
          saveToOfflineQueue('NEW_ORDER', order, currentUser.id);
          console.warn('💾 오프라인 큐에 저장됨. 연결 후 자동 전송됩니다.');
          
          // 연결 시도 (강제 재연결)
          console.log('🔄 WebSocket 재연결 시도');
          try {
            socket.connect();
            // 재연결 대기 후 다시 시도
            setTimeout(() => {
              if (socket.connected) {
                console.log('✅ 재연결 성공, 주문 재전송 시도');
                // 재전송 로직은 syncOfflineQueue에서 처리됨
                syncOfflineQueue();
              } else {
                console.error('❌ 재연결 실패, 오프라인 큐에 유지');
              }
            }, 2000);
          } catch (reconnectError) {
            console.error('❌ 재연결 시도 실패:', reconnectError);
          }
        }
      }, 0);
      
      return newOrders;
    });
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

    // 상태 업데이트 (created_at 기준 정렬 유지)
    setOrders(prevOrders => {
      const updated = prevOrders.map(order => {
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
      
      // created_at 기준으로 정렬 (Supabase와 동일, 최신순 유지)
      const sorted = updated.sort((a, b) => {
        const aTime = (a.createdAt ? new Date(a.createdAt).getTime() : a.requestedAt.getTime());
        const bTime = (b.createdAt ? new Date(b.createdAt).getTime() : b.requestedAt.getTime());
        return bTime - aTime; // DESC (최신순)
      });
      
      // localStorage 업데이트
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
        console.log('💾 상태 업데이트 후 localStorage 저장 완료 (created_at 기준 정렬)');
      } catch (e) {
        console.warn('⚠️ localStorage 저장 실패:', e);
      }
      
      return sorted;
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
      
      // created_at 기준으로 정렬 (Supabase와 동일, 최신순 유지)
      const sorted = updated.sort((a, b) => {
        const aTime = (a.createdAt ? new Date(a.createdAt).getTime() : a.requestedAt.getTime());
        const bTime = (b.createdAt ? new Date(b.createdAt).getTime() : b.requestedAt.getTime());
        return bTime - aTime; // DESC (최신순)
      });
      
      // localStorage 업데이트
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
        console.log('💾 메모 추가 후 localStorage 저장 완료 (created_at 기준 정렬)');
      } catch (e) {
        console.warn('⚠️ localStorage 저장 실패:', e);
      }
      
      return sorted;
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

  const handleAddUser = useCallback(async (newUser: User) => {
    // 비밀번호 별도 저장 (로그인을 위해 필요)
    if (newUser.password) {
      try {
        const saved = localStorage.getItem('hotelflow_user_passwords_v1');
        const passwords = saved ? JSON.parse(saved) : {};
        passwords[newUser.id] = newUser.password;
        localStorage.setItem('hotelflow_user_passwords_v1', JSON.stringify(passwords));
        console.log('✅ 비밀번호 저장 완료:', newUser.username);
      } catch (e) {
        console.warn('⚠️ 비밀번호 저장 실패:', e);
      }
    }
    
    // 🔒 보안: users에서는 비밀번호 필드 제거 (전송 시에만 포함)
    const { password, ...userWithoutPassword } = newUser;
    
    setUsers(prev => {
      const updated = [...prev, userWithoutPassword];
      // localStorage에 저장 (앱 재시작 시에도 유지) - 비밀번호 제외
      try {
        localStorage.setItem('hotelflow_users_v1', JSON.stringify(updated));
      } catch (e) {
        console.warn('⚠️ localStorage에 users 저장 실패:', e);
      }
      return updated;
    });
    triggerToast(`새 직원 등록됨: ${newUser.name}`, 'success', Department.ADMIN, 'SUCCESS');
    
    // WebSocket을 통해 다른 모든 사용자에게 동기화 - 비밀번호 제외
    const socket = socketRef.current;
    const user = currentUserRef.current;
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📤 [USER_ADD] 사용자 추가 메시지 전송 시도');
    console.log('   사용자 이름:', newUser.name);
    console.log('   Username:', newUser.username);
    console.log('   사용자 ID:', newUser.id);
    console.log('   WebSocket 존재:', !!socket);
    console.log('   WebSocket 연결 상태:', socket?.connected ? '✅ 연결됨' : '❌ 연결 안 됨');
    console.log('   현재 사용자:', user ? user.name : '없음');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (socket?.connected && user) {
      // 비밀번호도 함께 전송 (다른 기기에서 로그인 가능하도록)
      const message = {
        type: 'USER_ADD',
        payload: {
          ...userWithoutPassword,
          password: newUser.password // 비밀번호 포함 (동기화 필요)
        },
        senderId: user.id,
        sessionId: SESSION_ID,
        timestamp: new Date().toISOString()
      };
      socket.emit(SYNC_CHANNEL, message);
      console.log('✅ USER_ADD 메시지 전송 완료:', newUser.name);
      debugLog('📤 사용자 추가:', newUser.name);
    } else {
      console.warn('⚠️ USER_ADD 메시지 전송 실패:', {
        socketExists: !!socket,
        connected: socket?.connected,
        userExists: !!user,
        reason: !socket ? 'socket 없음' : !socket.connected ? 'WebSocket 연결 안 됨' : '사용자 없음'
      });
    }
  }, [triggerToast]);

  const handleUpdateUser = useCallback((updatedUser: User) => {
    // 비밀번호 별도 저장 (변경된 경우)
    if (updatedUser.password) {
      try {
        const saved = localStorage.getItem('hotelflow_user_passwords_v1');
        const passwords = saved ? JSON.parse(saved) : {};
        passwords[updatedUser.id] = updatedUser.password;
        localStorage.setItem('hotelflow_user_passwords_v1', JSON.stringify(passwords));
        console.log('✅ 비밀번호 업데이트 완료:', updatedUser.username);
      } catch (e) {
        console.warn('⚠️ 비밀번호 업데이트 실패:', e);
      }
    }
    
    // 🔒 보안: users에서는 비밀번호 필드 제거 (전송 시에만 포함)
    const { password, ...userWithoutPassword } = updatedUser;
    
    setUsers(prev => {
      const updated = prev.map(u => u.id === updatedUser.id ? userWithoutPassword : u);
      // localStorage에 저장 (앱 재시작 시에도 유지) - 비밀번호 제외
      try {
        localStorage.setItem('hotelflow_users_v1', JSON.stringify(updated));
      } catch (e) {
        console.warn('⚠️ localStorage에 users 저장 실패:', e);
      }
      return updated;
    });
    triggerToast(`직원 정보 수정됨: ${updatedUser.name}`, 'info', Department.ADMIN, 'UPDATE');
    
    // WebSocket을 통해 다른 모든 사용자에게 동기화 - 비밀번호 제외
    const socket = socketRef.current;
    const user = currentUserRef.current;
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📤 [USER_UPDATE] 사용자 수정 메시지 전송 시도');
    console.log('   사용자 이름:', updatedUser.name);
    console.log('   Username:', updatedUser.username);
    console.log('   사용자 ID:', updatedUser.id);
    console.log('   WebSocket 존재:', !!socket);
    console.log('   WebSocket 연결 상태:', socket?.connected ? '✅ 연결됨' : '❌ 연결 안 됨');
    console.log('   현재 사용자:', user ? user.name : '없음');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (socket?.connected && user) {
      // 비밀번호도 함께 전송 (변경된 경우)
      const message = {
        type: 'USER_UPDATE',
        payload: {
          ...userWithoutPassword,
          password: updatedUser.password // 비밀번호 포함 (변경 시 동기화)
        },
        senderId: user.id,
        sessionId: SESSION_ID,
        timestamp: new Date().toISOString()
      };
      socket.emit(SYNC_CHANNEL, message);
      console.log('✅ USER_UPDATE 메시지 전송 완료:', updatedUser.name);
      debugLog('📤 사용자 수정:', updatedUser.name);
    } else {
      console.warn('⚠️ USER_UPDATE 메시지 전송 실패:', {
        socketExists: !!socket,
        connected: socket?.connected,
        userExists: !!user,
        reason: !socket ? 'socket 없음' : !socket.connected ? 'WebSocket 연결 안 됨' : '사용자 없음'
      });
    }
  }, [triggerToast]);

  const handleDeleteUser = useCallback((userId: string) => {
    // 비밀번호도 삭제
    try {
      const saved = localStorage.getItem('hotelflow_user_passwords_v1');
      if (saved) {
        const passwords = JSON.parse(saved);
        delete passwords[userId];
        localStorage.setItem('hotelflow_user_passwords_v1', JSON.stringify(passwords));
        console.log('✅ 비밀번호 삭제 완료:', userId);
      }
    } catch (e) {
      console.warn('⚠️ 비밀번호 삭제 실패:', e);
    }
    
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
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📤 [USER_DELETE] 사용자 삭제 메시지 전송 시도');
    console.log('   삭제할 사용자 ID:', userId);
    console.log('   WebSocket 존재:', !!socket);
    console.log('   WebSocket 연결 상태:', socket?.connected ? '✅ 연결됨' : '❌ 연결 안 됨');
    console.log('   현재 사용자:', user ? user.name : '없음');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (socket?.connected && user) {
      const message = {
        type: 'USER_DELETE',
        payload: { userId },
        senderId: user.id,
        sessionId: SESSION_ID,
        timestamp: new Date().toISOString()
      };
      socket.emit(SYNC_CHANNEL, message);
      console.log('✅ USER_DELETE 메시지 전송 완료:', userId);
      debugLog('📤 사용자 삭제:', userId);
    } else {
      console.warn('⚠️ USER_DELETE 메시지 전송 실패:', {
        socketExists: !!socket,
        connected: socket?.connected,
        userExists: !!user,
        reason: !socket ? 'socket 없음' : !socket.connected ? 'WebSocket 연결 안 됨' : '사용자 없음'
      });
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

  // 로그아웃 상태에서도 users 상태를 localStorage와 동기화 (모바일 로그인 문제 해결)
  useEffect(() => {
    if (!currentUser) {
      // localStorage에서 최신 users 확인 함수
      const syncUsersFromStorage = () => {
        try {
          const saved = localStorage.getItem('hotelflow_users_v1');
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed) && parsed.length > 0) {
                // localStorage의 users와 현재 상태 비교하여 업데이트
                setUsers(prev => {
                  // 현재 상태의 사용자 목록 (id 기준)
                  const currentUsersMap = new Map<string, User>(prev.map(u => [u.id, u]));
                  // localStorage의 사용자 목록 (id 기준)
                  const savedUsersMap = new Map<string, User>(parsed.map((u: User) => [u.id, u]));
                  
                  // 두 맵을 비교
                  let needsUpdate = false;
                  
                  // 저장된 사용자가 더 많거나
                  if (savedUsersMap.size > currentUsersMap.size) {
                    needsUpdate = true;
                  }
                  
                  // 저장된 사용자가 현재 상태에 없거나
                  for (const [id, savedUser] of Array.from(savedUsersMap.entries())) {
                    const current = currentUsersMap.get(id);
                    if (!current) {
                      needsUpdate = true;
                      break;
                    }
                    // 저장된 사용자 정보가 다르면 업데이트 (username, password, name 등)
                    if (current.username !== savedUser.username || 
                        current.password !== savedUser.password || 
                        current.name !== savedUser.name ||
                        current.dept !== savedUser.dept ||
                        current.role !== savedUser.role) {
                      needsUpdate = true;
                      break;
                    }
                  }
                  
                  if (needsUpdate) {
                    console.log('🔄 로그인 화면: localStorage에서 users 동기화', {
                      localStorageCount: parsed.length,
                      currentStateCount: prev.length,
                      localStorageUsers: parsed.map((u: User) => ({ id: u.id, username: u.username, name: u.name }))
                    });
                    return parsed;
                  }
                  
                  return prev;
                });
              } else {
                console.warn('⚠️ localStorage users가 빈 배열:', saved);
              }
            } catch (e) {
              console.warn('⚠️ localStorage users 파싱 실패:', e, saved);
            }
          } else {
            console.log('ℹ️ localStorage에 users 데이터 없음 (초기 상태)');
          }
        } catch (e) {
          console.warn('⚠️ localStorage users 접근 실패:', e);
        }
      };

      // 즉시 한 번 확인
      syncUsersFromStorage();

      // 1초마다 localStorage 확인 (더 빠른 동기화)
      const interval = setInterval(syncUsersFromStorage, 1000);

      return () => {
        clearInterval(interval);
      };
    }
  }, [currentUser]); // 로그인 상태 변경 시마다 확인

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
          <ToastNotification 
            toasts={toasts} 
            onRemove={removeToast}
            onToastClick={(orderId) => {
              // 알림 클릭 시 해당 주문의 메모 모달 열기 (로그인 전에는 작동하지 않음)
              if (orders.length > 0) {
                const order = orders.find(o => o.id === orderId);
                if (order) {
                  setMemoOrder(order);
                }
              }
            }}
          />
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
                {/* MemoHistory 컴포넌트는 아직 구현되지 않았으므로 주석 처리
                <Route path="/memos" element={
                  <MemoHistory 
                    orders={orders}
                    onOpenMemo={(order) => setMemoOrder(order)}
                  />
                } />
                */}
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
          <ToastNotification 
            toasts={toasts} 
            onRemove={removeToast}
            onToastClick={(orderId) => {
              // 알림 클릭 시 해당 주문의 메모 모달 열기
              const order = orders.find(o => o.id === orderId);
              if (order) {
                setMemoOrder(order);
              }
            }}
          />
        </Suspense>
      </div>
    </Router>
  );
};

export default App;
