import { createServer } from 'http';
import { Server } from 'socket.io';
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import OrderModel from './database/models/OrderModel.js';

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

// 헬스체크
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'HotelWorks WebSocket Server',
    port: PORT,
    timestamp: new Date().toISOString(),
    connectedClients: io.sockets.sockets.size
  });
});

// 모든 주문 조회
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await OrderModel.findAll();
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('주문 조회 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 특정 주문 조회
app.get('/api/orders/:id', async (req, res) => {
  try {
    const order = await OrderModel.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, error: '주문을 찾을 수 없습니다.' });
    }
    res.json({ success: true, data: order });
  } catch (error) {
    console.error('주문 조회 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 주문 생성
app.post('/api/orders', async (req, res) => {
  try {
    const orderData = req.body;
    const order = await OrderModel.create(orderData);
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    console.error('주문 생성 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 주문 업데이트
app.put('/api/orders/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    const updateData = req.body;
    const order = await OrderModel.update(orderId, updateData);
    if (!order) {
      return res.status(404).json({ success: false, error: '주문을 찾을 수 없습니다.' });
    }
    res.json({ success: true, data: order });
  } catch (error) {
    console.error('주문 업데이트 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 주문 삭제
app.delete('/api/orders/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    await OrderModel.delete(orderId);
    res.json({ success: true, message: '주문이 삭제되었습니다.' });
  } catch (error) {
    console.error('주문 삭제 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 프로덕션 모드: 빌드된 정적 파일 서빙 (API 라우트 이후에 배치)
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, 'dist');
  
  // 정적 파일 서빙
  app.use(express.static(distPath));
  
  // 모든 라우트를 index.html로 리다이렉트 (SPA 라우팅 지원)
  // API 라우트가 아닌 경우에만
  app.get('*', (req, res, next) => {
    // API 경로는 제외
    if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/') || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ========== WebSocket 핸들러 ==========

io.on('connection', (socket) => {
  console.log(`✅ 클라이언트 연결: ${socket.id}`);

  socket.on('hotelflow_sync', async (data) => {
    const { type, payload, senderId, timestamp } = data;
    
    try {
      if (type === 'NEW_ORDER') {
        await OrderModel.create(payload);
      } else if (type === 'STATUS_UPDATE') {
        const updateData = {
          status: payload.status,
          acceptedAt: payload.acceptedAt ? new Date(payload.acceptedAt) : undefined,
          inProgressAt: payload.inProgressAt ? new Date(payload.inProgressAt) : undefined,
          completedAt: payload.completedAt ? new Date(payload.completedAt) : undefined,
          assignedTo: payload.assignedTo
        };
        await OrderModel.update(payload.id, updateData);
      }
    } catch (error) {
      console.error('❌ 데이터베이스 저장 오류:', error.message);
    }
    
    const message = {
      type,
      payload,
      senderId,
      timestamp: timestamp || new Date().toISOString()
    };
    
    io.emit('hotelflow_sync', message);
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

  socket.on('disconnect', () => {
    console.log(`❌ 클라이언트 연결 해제: ${socket.id}`);
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
