import { createServer } from 'http';
import { Server } from 'socket.io';
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import OrderModel from './database/models/OrderModel.js';
import apiRoutes from './database/routes.js';
import supabase from './database/db.js';
import initDatabase from './database/init.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;
const app = express();

// JSON 파싱 미들웨어
app.use(express.json());

// CORS 헤더 설정
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// API 라우트 등록
app.use('/api', apiRoutes);

// HTTP 서버 생성
const httpServer = createServer(app);

// Socket.IO 서버 생성
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: false,
    allowedHeaders: ["*"]
  },
  allowEIO3: true,
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// ========== REST API 엔드포인트 ==========

// 헬스체크 (DB 상태 포함)
app.get('/health', async (req, res) => {
  let dbStatus = 'unknown';
  let dbError = null;
  
  try {
    const { error } = await supabase
      .from('orders')
      .select('count', { count: 'exact', head: true });
    
    if (error) throw error;
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = 'disconnected';
    dbError = error.message;
  }
  
  res.json({
    status: dbStatus === 'connected' ? 'ok' : 'warning',
    service: 'HotelWorks WebSocket Server',
    port: PORT,
    timestamp: new Date().toISOString(),
    connectedClients: io.sockets.sockets.size,
    database: {
      status: dbStatus,
      error: dbError,
      config: {
        url: process.env.SUPABASE_URL ? '설정됨' : '미설정',
        key: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY ? '설정됨' : '미설정',
        hasConfig: !!(process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY))
      }
    }
  });
});

// REST API는 /api 라우터에서 처리됨

// 백엔드 전용 - 프론트엔드 빌드 파일 서빙 제거
// 프론트엔드는 Vercel에서 별도로 호스팅됨

// ========== WebSocket 핸들러 ==========

io.on('connection', (socket) => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ 새 클라이언트 연결`);
  console.log(`   Socket ID: ${socket.id}`);
  console.log(`   연결 시간: ${new Date().toLocaleString('ko-KR')}`);
  console.log(`   총 연결 수: ${io.sockets.sockets.size}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  socket.on('hotelflow_sync', async (data) => {
    const { type, payload, senderId, sessionId, timestamp } = data;
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📨 서버 메시지 수신:', type);
    console.log('   발신자:', senderId);
    console.log('   Socket ID:', socket.id);
    console.log('   타임스탬프:', timestamp);
    
    if (type === 'NEW_ORDER') {
      console.log('   주문 ID:', payload?.id);
      console.log('   방번호:', payload?.roomNo);
      console.log('   아이템:', payload?.itemName);
      console.log('   수량:', payload?.quantity);
    } else if (type === 'STATUS_UPDATE') {
      console.log('   주문 ID:', payload?.id);
      console.log('   새 상태:', payload?.status);
      console.log('   방번호:', payload?.roomNo);
    } else if (type === 'NEW_MEMO') {
      console.log('   주문 ID:', payload?.orderId);
      console.log('   메모:', payload?.memo?.text);
    } else if (type === 'USER_ADD') {
      console.log('   사용자 ID:', payload?.id);
      console.log('   이름:', payload?.name);
      console.log('   Username:', payload?.username);
      console.log('   부서:', payload?.dept);
    } else if (type === 'USER_UPDATE') {
      console.log('   사용자 ID:', payload?.id);
      console.log('   이름:', payload?.name);
      console.log('   Username:', payload?.username);
      console.log('   부서:', payload?.dept);
    } else if (type === 'USER_DELETE') {
      console.log('   삭제할 사용자 ID:', payload?.userId);
    }
    
    // 데이터베이스 저장
    try {
      if (type === 'NEW_ORDER') {
        // 날짜 형식 변환
        const orderData = {
          ...payload,
          requestedAt: payload.requestedAt ? (typeof payload.requestedAt === 'string' ? payload.requestedAt : new Date(payload.requestedAt).toISOString()) : new Date().toISOString(),
          acceptedAt: payload.acceptedAt ? (typeof payload.acceptedAt === 'string' ? payload.acceptedAt : new Date(payload.acceptedAt).toISOString()) : undefined,
          inProgressAt: payload.inProgressAt ? (typeof payload.inProgressAt === 'string' ? payload.inProgressAt : new Date(payload.inProgressAt).toISOString()) : undefined,
          completedAt: payload.completedAt ? (typeof payload.completedAt === 'string' ? payload.completedAt : new Date(payload.completedAt).toISOString()) : undefined,
          memos: payload.memos ? payload.memos.map((memo) => ({
            ...memo,
            timestamp: memo.timestamp ? (typeof memo.timestamp === 'string' ? memo.timestamp : new Date(memo.timestamp).toISOString()) : new Date().toISOString()
          })) : []
        };
        
        console.log('   💾 DB 저장 시도:', payload.id);
        console.log('   💾 주문 데이터:', JSON.stringify(orderData, null, 2));
        try {
          const savedOrder = await OrderModel.create(orderData);
          console.log('   💾 DB 저장 완료 (NEW_ORDER):', payload.id);
          console.log('   💾 저장된 주문:', savedOrder ? '성공' : '실패');
          if (savedOrder) {
            console.log('   💾 저장된 주문 상세:', JSON.stringify(savedOrder, null, 2));
          }
        } catch (dbError) {
          console.error('   ❌ OrderModel.create 오류:', dbError.message);
          console.error('   ❌ 오류 스택:', dbError.stack);
          throw dbError; // 상위 catch로 전달
        }
      } else if (type === 'STATUS_UPDATE') {
        const updateData = {
          status: payload.status,
          acceptedAt: payload.acceptedAt ? (typeof payload.acceptedAt === 'string' ? payload.acceptedAt : new Date(payload.acceptedAt).toISOString()) : undefined,
          inProgressAt: payload.inProgressAt ? (typeof payload.inProgressAt === 'string' ? payload.inProgressAt : new Date(payload.inProgressAt).toISOString()) : undefined,
          completedAt: payload.completedAt ? (typeof payload.completedAt === 'string' ? payload.completedAt : new Date(payload.completedAt).toISOString()) : undefined,
          assignedTo: payload.assignedTo
        };
        console.log('   💾 DB 업데이트 시도:', payload.id);
        await OrderModel.update(payload.id, updateData);
        console.log('   💾 DB 저장 완료 (STATUS_UPDATE):', payload.id);
      } else if (type === 'NEW_MEMO') {
        // 메모 저장
        console.log('   💾 메모 저장 시도:', payload.orderId);
        // 메모는 별도로 저장 (OrderModel에서 처리하지 않음)
        // 필요시 여기서 직접 저장
      }
    } catch (error) {
      console.error('   ❌ DB 저장 오류:', error.message);
      console.error('   ❌ 오류 상세:', error);
      // DB 저장 실패해도 브로드캐스트는 계속 진행
    }
    
    const message = {
      type,
      payload,
      senderId,
      sessionId: sessionId || null, // sessionId 포함 (중복 알림 방지용)
      timestamp: timestamp || new Date().toISOString()
    };
    
    // 🚨 모든 연결된 클라이언트에게 브로드캐스트
    const clientCount = io.sockets.sockets.size;
    console.log(`   📡 브로드캐스트 시작 - ${clientCount}개 클라이언트에게 전송`);
    console.log(`   📡 브로드캐스트 메시지:`, JSON.stringify(message, null, 2));
    io.emit('hotelflow_sync', message);
    console.log('   ✅ 브로드캐스트 완료');
    console.log('   수신 시간:', new Date().toLocaleString('ko-KR'));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  });

  socket.on('request_all_orders', async (data) => {
    const { senderId } = data;
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📥 전체 주문 목록 요청 수신');
    console.log('   요청자:', senderId);
    console.log('   Socket ID:', socket.id);
    
    // 🚨 DB에서 모든 오더 조회하여 요청한 클라이언트에게 직접 응답
    try {
      const dbOrders = await OrderModel.findAll();
      console.log('   💾 DB에서 조회한 주문 수:', dbOrders.length);
      
      // DB 오더를 클라이언트 형식으로 변환
      const ordersForClient = dbOrders.map(order => ({
        ...order,
        requestedAt: order.requestedAt.toISOString(),
        acceptedAt: order.acceptedAt?.toISOString(),
        inProgressAt: order.inProgressAt?.toISOString(),
        completedAt: order.completedAt?.toISOString(),
        memos: order.memos.map(m => ({
          ...m,
          timestamp: m.timestamp.toISOString()
        }))
      }));
      
      // 요청한 클라이언트에게 직접 응답
      socket.emit('all_orders_response', {
        orders: ordersForClient,
        senderId: 'server',
        timestamp: new Date().toISOString()
      });
      console.log('   ✅ 서버에서 직접 응답 전송:', ordersForClient.length, '개 주문');
    } catch (error) {
      console.error('   ❌ DB 조회 오류:', error.message);
      // DB 조회 실패 시에도 다른 클라이언트들에게 브로드캐스트
    }
    
    // 다른 클라이언트들에게도 브로드캐스트 (그들도 응답할 수 있도록)
    socket.broadcast.emit('request_all_orders', {
      senderId,
      timestamp: new Date().toISOString()
    });
    console.log('   📡 다른 클라이언트들에게 브로드캐스트');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  });

  socket.on('all_orders_response', (data) => {
    const { orders, senderId } = data;
    io.emit('all_orders_response', {
      orders,
      senderId,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('request_all_users', (data) => {
    const { senderId } = data;
    socket.broadcast.emit('request_all_users', {
      senderId,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('all_users_response', (data) => {
    const { users, senderId } = data;
    io.emit('all_users_response', {
      users,
      senderId,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('disconnect', (reason) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`❌ 클라이언트 연결 해제`);
    console.log(`   Socket ID: ${socket.id}`);
    console.log(`   이유: ${reason}`);
    console.log(`   해제 시간: ${new Date().toLocaleString('ko-KR')}`);
    console.log(`   남은 연결 수: ${io.sockets.sockets.size - 1}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  });
});

// 포트 충돌 처리
httpServer.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ 포트 ${PORT}가 이미 사용 중입니다.`);
    console.log(`💡 해결 방법:`);
    console.log(`   1. 기존 서버를 종료하거나`);
    console.log(`   2. 다른 포트를 사용하세요 (예: PORT=3002 node server.js)`);
    process.exit(1);
  } else {
    throw error;
  }
});

httpServer.listen(PORT, '0.0.0.0', async () => {
  const serverUrl = process.env.SERVER_URL || `http://localhost:${PORT}`;
  const wsUrl = process.env.WS_SERVER_URL || serverUrl.replace('http://', 'ws://').replace('https://', 'wss://');
  
  console.log(`🚀 WebSocket 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`📱 PC와 모바일에서 실시간 동기화가 가능합니다.`);
  console.log(`🔗 서버 상태 확인: http://localhost:${PORT}/health`);
  
  // 데이터베이스 초기화 (테이블 생성 및 기본 사용자 삽입)
  try {
    await initDatabase();
    console.log('✅ 데이터베이스 초기화 완료');
  } catch (error) {
    console.error('⚠️ 데이터베이스 초기화 실패 (서버는 계속 실행):', error.message);
  }
  if (process.env.SERVER_URL) {
    console.log(`🔗 외부 접속: ${serverUrl}/health`);
    console.log(`📡 WebSocket 연결: ${wsUrl}`);
  } else {
    console.log(`💡 환경 변수 SERVER_URL을 설정하면 외부 접속 URL이 표시됩니다.`);
  }
  console.log(`💾 데이터베이스 연동 활성화`);
});
