// Service Worker for HotelWorks PWA
// 브라우저가 닫혀있어도 백그라운드에서 실행되어 푸시 알림을 받을 수 있습니다
// 휴대폰 화면이 꺼져있어도 카카오톡처럼 알림을 받을 수 있습니다

const CACHE_NAME = 'hotelworks-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/index.css'
];

// 백그라운드 동기화 설정
const SYNC_INTERVAL = 30000; // 30초마다 동기화
const WS_SERVER_URL_KEY = 'hotelflow_ws_url';
let syncTimer = null;
let wsConnection = null;

// Service Worker 설치
self.addEventListener('install', (event) => {
  console.log('[Service Worker] 설치 중...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] 캐시 열기');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[Service Worker] 설치 완료');
        return self.skipWaiting(); // 즉시 활성화
      })
  );
});

// Service Worker 활성화
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] 활성화 중...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] 오래된 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] 활성화 완료');
      // 백그라운드 동기화 시작
      startBackgroundSync();
      return self.clients.claim(); // 모든 클라이언트 제어
    })
  );
});

// 백그라운드 동기화 시작 (화면이 꺼져있어도 작동)
function startBackgroundSync() {
  console.log('[Service Worker] 백그라운드 동기화 시작');
  
  // 주기적으로 서버에서 새 메시지 확인
  syncTimer = setInterval(() => {
    checkForNewMessages();
  }, SYNC_INTERVAL);
  
  // 즉시 한 번 확인
  checkForNewMessages();
}

// 서버에서 새 메시지 확인
async function checkForNewMessages() {
  try {
    // WebSocket 서버 URL 가져오기
    const wsUrl = await getWebSocketServerURL();
    if (!wsUrl) {
      console.log('[Service Worker] WebSocket 서버 URL을 찾을 수 없음');
      return;
    }
    
    // HTTP API를 통해 최신 주문 확인 (WebSocket 대신)
    const apiUrl = wsUrl.replace('ws://', 'http://').replace('wss://', 'https://').replace(':3001', '');
    const healthUrl = `${apiUrl}/health`;
    
    try {
      const response = await fetch(healthUrl, { 
        method: 'GET',
        cache: 'no-cache'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[Service Worker] 서버 연결 확인:', data.connectedClients, 'clients');
        
        // 최신 주문 확인
        const ordersUrl = `${apiUrl}/api/orders`;
        const ordersResponse = await fetch(ordersUrl, {
          method: 'GET',
          cache: 'no-cache',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (ordersResponse.ok) {
          const ordersData = await ordersResponse.json();
          if (ordersData.success && ordersData.data) {
            await checkNewOrders(ordersData.data);
          }
        }
      }
    } catch (error) {
      console.log('[Service Worker] 서버 연결 실패 (정상 - 오프라인일 수 있음):', error.message);
    }
  } catch (error) {
    console.error('[Service Worker] 백그라운드 동기화 오류:', error);
  }
}

// 새 주문 확인 및 알림 표시
async function checkNewOrders(orders) {
  try {
    // localStorage에서 마지막 확인 시간 가져오기
    const lastCheckKey = 'hotelflow_last_sync_check';
    const lastCheckTime = await getFromStorage(lastCheckKey);
    const now = new Date().getTime();
    
    // 최근 1분 이내의 새 주문만 확인
    const oneMinuteAgo = now - 60000;
    const lastCheck = lastCheckTime ? parseInt(lastCheckTime) : oneMinuteAgo;
    
    // 새 주문 필터링
    const newOrders = orders.filter(order => {
      const orderTime = new Date(order.requestedAt).getTime();
      return orderTime > lastCheck;
    });
    
    if (newOrders.length > 0) {
      console.log('[Service Worker] 새 주문 발견:', newOrders.length, '개');
      
      // 각 새 주문에 대해 알림 표시
      for (const order of newOrders) {
        const title = 'HotelWorks';
        const body = `${order.roomNo}호 신규 요청: ${order.itemName}`;
        
        await showNotification(title, body, {
          tag: `order-${order.id}`,
          requireInteraction: false,
          data: {
            url: '/',
            orderId: order.id
          }
        });
      }
    }
    
    // 마지막 확인 시간 업데이트
    await setToStorage(lastCheckKey, now.toString());
  } catch (error) {
    console.error('[Service Worker] 새 주문 확인 오류:', error);
  }
}

// WebSocket 서버 URL 가져오기
async function getWebSocketServerURL() {
  try {
    // 클라이언트에서 저장된 URL 가져오기
    const clients = await self.clients.matchAll();
    if (clients.length > 0) {
      // 클라이언트에 메시지 전송하여 URL 요청
      return new Promise((resolve) => {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data);
        };
        
        clients[0].postMessage({ type: 'GET_WS_URL' }, [messageChannel.port2]);
        
        // 타임아웃
        setTimeout(() => {
          resolve(null);
        }, 1000);
      });
    }
    
    // 기본값 반환
    return 'http://localhost:3001';
  } catch (error) {
    console.error('[Service Worker] WebSocket URL 가져오기 오류:', error);
    return 'http://localhost:3001';
  }
}

// Storage 헬퍼 함수 (IndexedDB 또는 다른 방법 사용)
async function getFromStorage(key) {
  try {
    // Service Worker에서는 localStorage를 직접 사용할 수 없으므로
    // 클라이언트를 통해 가져오기
    const clients = await self.clients.matchAll();
    if (clients.length > 0) {
      return new Promise((resolve) => {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data);
        };
        
        clients[0].postMessage({ type: 'GET_STORAGE', key }, [messageChannel.port2]);
        
        setTimeout(() => resolve(null), 1000);
      });
    }
    return null;
  } catch (error) {
    console.error('[Service Worker] Storage 가져오기 오류:', error);
    return null;
  }
}

async function setToStorage(key, value) {
  try {
    const clients = await self.clients.matchAll();
    if (clients.length > 0) {
      clients[0].postMessage({ type: 'SET_STORAGE', key, value });
    }
  } catch (error) {
    console.error('[Service Worker] Storage 저장 오류:', error);
  }
}

// 알림 표시 함수
async function showNotification(title, body, options = {}) {
  const defaultOptions = {
    body,
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    tag: `hotelworks-${Date.now()}`,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: {
      url: '/'
    }
  };
  
  const notificationOptions = { ...defaultOptions, ...options };
  
  return self.registration.showNotification(title, notificationOptions);
}

// 네트워크 요청 가로채기 (캐시 우선 전략)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 캐시에 있으면 캐시에서 반환, 없으면 네트워크 요청
        return response || fetch(event.request);
      })
  );
});

// 메시지 수신 (메인 스레드에서 Service Worker로 메시지 전달)
self.addEventListener('message', (event) => {
  console.log('[Service Worker] 메시지 수신:', event.data);
  
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    showNotification(title, options);
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 푸시 알림 수신 (Web Push API 사용 시)
self.addEventListener('push', (event) => {
  console.log('[Service Worker] 푸시 알림 수신:', event.data);
  
  let notificationData = {
    title: 'HotelWorks',
    body: '새로운 알림이 있습니다.',
          icon: '/icon-192.svg',
          badge: '/icon-192.svg',
    tag: 'hotelworks-notification',
    requireInteraction: false,
    data: {
      url: '/'
    }
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: data.tag || notificationData.tag,
        requireInteraction: data.requireInteraction || false,
        data: data.data || notificationData.data
      };
    } catch (e) {
      const text = event.data.text();
      notificationData.body = text || notificationData.body;
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data,
      vibrate: [200, 100, 200],
      actions: [
        {
          action: 'open',
          title: '열기'
        },
        {
          action: 'close',
          title: '닫기'
        }
      ]
    })
  );
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] 알림 클릭:', event.notification.tag);
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  // 알림 클릭 시 앱 열기
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 이미 열려있는 창이 있으면 포커스
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        // 열려있는 창이 없으면 새 창 열기
        if (clients.openWindow) {
          const url = event.notification.data?.url || '/';
          return clients.openWindow(url);
        }
      })
  );
});

// 알림 표시 함수
function showNotification(title, options = {}) {
  const defaultOptions = {
    body: '',
          icon: '/icon-192.svg',
          badge: '/icon-192.svg',
    tag: 'hotelworks-notification',
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: {
      url: '/'
    }
  };
  
  const notificationOptions = { ...defaultOptions, ...options };
  
  return self.registration.showNotification(title, notificationOptions);
}

