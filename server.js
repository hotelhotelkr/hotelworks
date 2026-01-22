import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import supabase from './database/db.js';
import OrderModel from './database/models/OrderModel.js';

const app = express();
const httpServer = createServer(app);

// CORS 설정
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: false
}));

app.use(express.json());

// ========== Socket.IO 서버 생성 ==========

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
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      error: dbError
    }
  });
});

// ========== Socket.IO 이벤트 핸들러 ==========

io.on('connection', (socket) => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ 클라이언트 연결`);
  console.log(`   Socket ID: ${socket.id}`);
  console.log(`   연결 시간: ${new Date().toLocaleString('ko-KR')}`);
  console.log(`   총 연결 수: ${io.sockets.sockets.size}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  socket.on('hotelflow_sync', async (data) => {
    const { type, payload, senderId, sessionId, timestamp } = data;
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📨 서버 메시지 수신 (즉시 처리)');
    console.log('   메시지 타입:', type);
    console.log('   발신자:', senderId);
    console.log('   세션 ID:', sessionId || 'null');
    console.log('   Socket ID:', socket.id);
    console.log('   타임스탬프:', timestamp);
    console.log('   수신 시간:', new Date().toISOString());
    
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
    
    // 🚨 최우선 목표: 실시간 동기화 보장
    // 브로드캐스트를 먼저 실행하고, DB 저장은 비동기로 처리
    // 이렇게 하면 DB 저장이 느려도 실시간 동기화가 즉시 이루어짐
    
    // 🚨 브로드캐스트 메시지 생성 (즉시 전송)
    // 최우선 목표: 실시간 동기화 보장
    const message = {
      type,
      payload,
      senderId: senderId || null,
      sessionId: sessionId || null, // sessionId 포함 (중복 알림 방지용)
      timestamp: timestamp || new Date().toISOString()
    };
    
    // 🚨 sessionId가 없으면 로그 출력 (디버깅용)
    if (!sessionId) {
      console.warn('⚠️ sessionId가 없음 - 모든 기기에서 알림 표시됨');
    }
    
    // 🚨 모든 연결된 클라이언트에게 즉시 브로드캐스트 (실시간 동기화 보장)
    const clientCount = io.sockets.sockets.size;
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📡 브로드캐스트 시작 (즉시 실행) - ${clientCount}개 클라이언트에게 전송`);
    console.log(`   메시지 타입: ${type}`);
    console.log(`   발신자: ${senderId || 'null'}`);
    console.log(`   세션 ID: ${sessionId || 'null'}`);
    console.log(`   연결된 클라이언트 수: ${clientCount}`);
    if (type === 'NEW_ORDER') {
      console.log(`   주문 정보: ${payload?.roomNo}호 ${payload?.itemName} (수량: ${payload?.quantity})`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
      // 🚨 io.emit은 모든 연결된 클라이언트(발신자 포함)에게 전송
      // 중요: DB 저장 전에 먼저 브로드캐스트 (실시간 동기화 보장)
      console.log('   📡 브로드캐스트 실행 전 최종 확인:');
      console.log('   - 연결된 클라이언트 수:', clientCount);
      console.log('   - 메시지 타입:', type);
      console.log('   - 발신자:', senderId);
      console.log('   - 세션 ID:', sessionId);
      console.log('   - 브로드캐스트 시간:', new Date().toISOString());
      
      // 🚨 즉시 브로드캐스트 (DB 저장 전)
      // io.emit은 모든 연결된 클라이언트에게 동기적으로 전송
      io.emit('hotelflow_sync', message);
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ 브로드캐스트 완료 (즉시 실행)');
      console.log('   전송 시간:', new Date().toISOString());
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('   전송된 클라이언트 수:', clientCount);
      console.log('   수신 시간:', new Date().toLocaleString('ko-KR'));
      console.log('   브로드캐스트 메시지 타입:', type);
      console.log('   브로드캐스트 발신자:', senderId);
      
      // 연결된 모든 클라이언트 정보 로그
      if (clientCount > 0) {
        const socketIds = Array.from(io.sockets.sockets.keys());
        console.log('   연결된 Socket IDs:', socketIds.slice(0, 10)); // 최대 10개만 표시
        
        // 각 클라이언트에게 메시지가 전송되었는지 확인
        socketIds.forEach((socketId, index) => {
          const clientSocket = io.sockets.sockets.get(socketId);
          if (clientSocket && clientSocket.connected) {
            console.log(`   ✅ 클라이언트 ${index + 1}/${socketIds.length} 전송 확인: ${socketId}`);
          } else {
            console.warn(`   ⚠️ 클라이언트 ${index + 1}/${socketIds.length} 연결 안 됨: ${socketId}`);
          }
        });
      } else {
        console.warn('   ⚠️ 연결된 클라이언트가 없습니다!');
      }
    } catch (broadcastError) {
      console.error('   ❌ 브로드캐스트 실패:', broadcastError);
      console.error('   - 에러 상세:', broadcastError.message);
      console.error('   - 에러 스택:', broadcastError.stack);
    }
    
    // 🚨 DB 저장은 비동기로 처리 (브로드캐스트 후 백그라운드에서 실행)
    // 실시간 동기화를 보장하기 위해 DB 저장을 기다리지 않음
    (async () => {
      try {
        if (type === 'NEW_ORDER') {
          // 날짜 형식 변환: 한국 시간을 UTC로 변환하여 저장
          const koreaTimeToUTC = (koreaTime) => {
            if (!koreaTime) return null;
            if (koreaTime instanceof Date) {
              const utcTime = new Date(koreaTime.getTime() - (9 * 60 * 60 * 1000));
              return utcTime.toISOString();
            }
            if (typeof koreaTime === 'string') {
              if (koreaTime.endsWith('Z') || koreaTime.includes('+00') || koreaTime.includes('+00:00')) {
                return koreaTime;
              }
              const date = new Date(koreaTime);
              const utcTime = new Date(date.getTime() - (9 * 60 * 60 * 1000));
              return utcTime.toISOString();
            }
            return new Date().toISOString();
          };
          
          const orderData = {
            ...payload,
            requestedAt: payload.requestedAt ? koreaTimeToUTC(payload.requestedAt instanceof Date ? payload.requestedAt : new Date(payload.requestedAt)) : koreaTimeToUTC(new Date()),
            acceptedAt: payload.acceptedAt ? koreaTimeToUTC(payload.acceptedAt instanceof Date ? payload.acceptedAt : new Date(payload.acceptedAt)) : undefined,
            inProgressAt: payload.inProgressAt ? koreaTimeToUTC(payload.inProgressAt instanceof Date ? payload.inProgressAt : new Date(payload.inProgressAt)) : undefined,
            completedAt: payload.completedAt ? koreaTimeToUTC(payload.completedAt instanceof Date ? payload.completedAt : new Date(payload.completedAt)) : undefined,
            memos: payload.memos ? payload.memos.map((memo) => ({
              ...memo,
              timestamp: memo.timestamp ? koreaTimeToUTC(memo.timestamp instanceof Date ? memo.timestamp : new Date(memo.timestamp)) : koreaTimeToUTC(new Date())
            })) : []
          };
          
          console.log('   💾 DB 저장 시도 (비동기):', payload.id);
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
          }
        } else if (type === 'STATUS_UPDATE') {
          const updateData = {
            status: payload.status,
            acceptedAt: payload.acceptedAt ? (typeof payload.acceptedAt === 'string' ? payload.acceptedAt : new Date(payload.acceptedAt).toISOString()) : undefined,
            inProgressAt: payload.inProgressAt ? (typeof payload.inProgressAt === 'string' ? payload.inProgressAt : new Date(payload.inProgressAt).toISOString()) : undefined,
            completedAt: payload.completedAt ? (typeof payload.completedAt === 'string' ? payload.completedAt : new Date(payload.completedAt).toISOString()) : undefined,
            assignedTo: payload.assignedTo
          };
          console.log('   💾 DB 업데이트 시도 (비동기):', payload.id);
          await OrderModel.update(payload.id, updateData);
          console.log('   💾 DB 저장 완료 (STATUS_UPDATE):', payload.id);
        } else if (type === 'NEW_MEMO') {
          console.log('   💾 메모 저장 시도 (비동기):', payload.orderId);
        }
      } catch (error) {
        console.error('   ❌ DB 저장 오류 (비동기):', error.message);
        console.error('   ❌ 오류 상세:', error);
        // DB 저장 실패는 로그만 남기고 계속 진행
      }
    })();
    
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
    console.log(`   총 연결 수: ${io.sockets.sockets.size}`);
    console.log(`   해제 시간: ${new Date().toLocaleString('ko-KR')}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  });
});

// ========== 서버 시작 ==========

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🚀 HotelWorks WebSocket 서버 시작`);
  console.log(`   포트: ${PORT}`);
  console.log(`   환경: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   시작 시간: ${new Date().toLocaleString('ko-KR')}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});
