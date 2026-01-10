import { createServer } from 'http';
import { Server } from 'socket.io';
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import OrderModel from './database/models/OrderModel.js';
import apiRoutes from './database/routes.js';
import pool from './database/db.js';

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
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
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
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'hotelworks',
        user: process.env.DB_USER || 'root',
        hasConfig: !!(process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD)
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
    const { type, payload, senderId, timestamp } = data;
    
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
          memos: payload.memos ? payload.memos.map((memo: any) => ({
            ...memo,
            timestamp: memo.timestamp ? (typeof memo.timestamp === 'string' ? memo.timestamp : new Date(memo.timestamp).toISOString()) : new Date().toISOString()
          })) : []
        };
        
        await OrderModel.create(orderData);
        console.log('   💾 DB 저장 완료 (NEW_ORDER):', payload.id);
      } else if (type === 'STATUS_UPDATE') {
        const updateData = {
          status: payload.status,
          acceptedAt: payload.acceptedAt ? new Date(payload.acceptedAt) : undefined,
          inProgressAt: payload.inProgressAt ? new Date(payload.inProgressAt) : undefined,
          completedAt: payload.completedAt ? new Date(payload.completedAt) : undefined,
          assignedTo: payload.assignedTo
        };
        await OrderModel.update(payload.id, updateData);
        console.log('   💾 DB 저장 완료 (STATUS_UPDATE)');
      }
    } catch (error) {
      console.error('   ❌ DB 저장 오류:', error.message);
    }
    
    const message = {
      type,
      payload,
      senderId,
      timestamp: timestamp || new Date().toISOString()
    };
    
    // 🚨 모든 연결된 클라이언트에게 브로드캐스트
    const clientCount = io.sockets.sockets.size;
    console.log(`   📡 브로드캐스트 시작 - ${clientCount}개 클라이언트에게 전송`);
    io.emit('hotelflow_sync', message);
    console.log('   ✅ 브로드캐스트 완료');
    console.log('   수신 시간:', new Date().toLocaleString('ko-KR'));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  });

  socket.on('request_all_orders', (data) => {
    const { senderId } = data;
    socket.broadcast.emit('request_all_orders', {
      senderId,
      timestamp: new Date().toISOString()
    });
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

httpServer.listen(PORT, '0.0.0.0', () => {
  const serverUrl = process.env.SERVER_URL || `http://localhost:${PORT}`;
  const wsUrl = process.env.WS_SERVER_URL || serverUrl.replace('http://', 'ws://').replace('https://', 'wss://');
  
  console.log(`🚀 WebSocket 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`📱 PC와 모바일에서 실시간 동기화가 가능합니다.`);
  console.log(`🔗 서버 상태 확인: http://localhost:${PORT}/health`);
  if (process.env.SERVER_URL) {
    console.log(`🔗 외부 접속: ${serverUrl}/health`);
    console.log(`📡 WebSocket 연결: ${wsUrl}`);
  } else {
    console.log(`💡 환경 변수 SERVER_URL을 설정하면 외부 접속 URL이 표시됩니다.`);
  }
  console.log(`💾 데이터베이스 연동 활성화`);
});
