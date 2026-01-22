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

// 모든 주문 가져오기 (로그인 시 Supabase에서 최신 데이터 로드)
app.get('/api/orders', async (req, res) => {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📥 [최신순 정렬] /api/orders GET 요청 수신');
    console.log('   요청 시간:', new Date().toISOString());
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Supabase에서 모든 주문 가져오기 (최신순 정렬)
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .order('requested_at', { ascending: false }); // 최신순 정렬
    
    if (ordersError) {
      console.error('❌ [최신순 정렬] Supabase 주문 조회 실패:', ordersError);
      throw ordersError;
    }
    
    console.log('✅ [최신순 정렬] Supabase에서 주문 조회 완료:', orders?.length || 0, '개');
    if (orders && orders.length > 0) {
      console.log('   최신 주문 (맨 위):', {
        id: orders[0].id,
        roomNo: orders[0].room_no,
        itemName: orders[0].item_name,
        requestedAt: orders[0].requested_at
      });
    }
    
    // 각 주문의 메모 가져오기
    const ordersWithMemos = await Promise.all(
      (orders || []).map(async (order) => {
        const { data: memos, error: memosError } = await supabase
          .from('memos')
          .select('*')
          .eq('order_id', order.id)
          .order('timestamp', { ascending: true });
        
        if (memosError) {
          console.warn(`⚠️ 메모 조회 오류 (주문 ${order.id}):`, memosError);
        }
        
        return {
          ...order,
          memos: memos || []
        };
      })
    );
    
    // 클라이언트가 기대하는 형식으로 변환
    const formattedOrders = ordersWithMemos.map(o => ({
      id: o.id,
      roomNo: o.room_no,
      guestName: o.guest_name || '',
      category: o.category,
      itemName: o.item_name,
      quantity: o.quantity,
      priority: o.priority,
      status: o.status,
      requestedAt: o.requested_at,
      acceptedAt: o.accepted_at || undefined,
      inProgressAt: o.in_progress_at || undefined,
      completedAt: o.completed_at || undefined,
      createdBy: o.created_by,
      assignedTo: o.assigned_to || undefined,
      requestChannel: o.request_channel,
      memos: (o.memos || []).map(m => ({
        id: m.id,
        text: m.text,
        senderId: m.sender_id,
        senderName: m.sender_name,
        senderDept: m.sender_dept,
        timestamp: m.timestamp
      }))
    }));
    
    console.log('✅ [최신순 정렬] 응답 전송 완료:', formattedOrders.length, '개 주문');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    res.json({
      success: true,
      orders: formattedOrders,
      count: formattedOrders.length
    });
  } catch (error) {
    console.error('❌ [최신순 정렬] /api/orders 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message || '주문 조회 실패',
      orders: [],
      count: 0
    });
  }
});

// 주문 동기화 엔드포인트 (오프라인 큐 동기화용)
app.post('/api/orders/sync', async (req, res) => {
  try {
    const { orders } = req.body;
    
    if (!Array.isArray(orders) || orders.length === 0) {
      return res.json({
        success: true,
        results: {
          created: 0,
          skipped: 0,
          errors: []
        }
      });
    }
    
    const results = {
      created: 0,
      skipped: 0,
      errors: [] // Array<{ orderId: string; error: string }>
    };
    
    for (const order of orders) {
      try {
        // 주문이 이미 존재하는지 확인
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id')
          .eq('id', order.id)
          .single();
        
        if (existingOrder) {
          results.skipped++;
          continue;
        }
        
        // 새 주문 생성
        const { error: insertError } = await OrderModel.create(order);
        
        if (insertError) {
          throw insertError;
        }
        
        results.created++;
      } catch (error) {
        results.errors.push({
          orderId: order.id || 'unknown',
          error: error.message || String(error)
        });
      }
    }
    
    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('❌ 주문 동기화 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message || '주문 동기화 실패'
    });
  }
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
      // 최우선 목표: 실시간 동기화 보장
      try {
        io.emit('hotelflow_sync', message);
        // 브로드캐스트 후 즉시 확인
        const actualClientCount = io.sockets.sockets.size;
        if (actualClientCount !== clientCount) {
          console.warn(`⚠️ 클라이언트 수 불일치: 예상 ${clientCount}, 실제 ${actualClientCount}`);
        }
      } catch (emitError) {
        console.error('❌ io.emit 실패:', emitError);
        throw emitError; // 에러를 다시 throw하여 상위에서 처리
      }
      
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
          // ✅ 한국 시간 그대로 저장 (Supabase 타임존이 Asia/Seoul로 설정됨)
          // 클라이언트가 이미 한국 시간으로 보내므로 변환 없이 그대로 사용
          const toISO = (time) => {
            if (!time) return null;
            if (time instanceof Date) return time.toISOString();
            if (typeof time === 'string') return time; // 이미 ISO 문자열
            return new Date().toISOString();
          };
          
          const orderData = {
            ...payload,
            requestedAt: payload.requestedAt ? toISO(payload.requestedAt) : toISO(new Date()),
            acceptedAt: payload.acceptedAt ? toISO(payload.acceptedAt) : undefined,
            inProgressAt: payload.inProgressAt ? toISO(payload.inProgressAt) : undefined,
            completedAt: payload.completedAt ? toISO(payload.completedAt) : undefined,
            memos: payload.memos ? payload.memos.map((memo) => ({
              ...memo,
              timestamp: memo.timestamp ? toISO(memo.timestamp) : toISO(new Date())
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
          // ✅ 한국 시간 그대로 저장 (Supabase 타임존이 Asia/Seoul로 설정됨)
          const toISO = (time) => {
            if (!time) return null;
            if (time instanceof Date) return time.toISOString();
            if (typeof time === 'string') return time;
            return new Date().toISOString();
          };
          
          const updateData = {
            status: payload.status,
            acceptedAt: payload.acceptedAt ? toISO(payload.acceptedAt) : undefined,
            inProgressAt: payload.inProgressAt ? toISO(payload.inProgressAt) : undefined,
            completedAt: payload.completedAt ? toISO(payload.completedAt) : undefined,
            assignedTo: payload.assignedTo
          };
          console.log('   💾 DB 업데이트 시도 (비동기):', payload.id);
          await OrderModel.update(payload.id, updateData);
          console.log('   💾 DB 저장 완료 (STATUS_UPDATE):', payload.id);
        } else if (type === 'NEW_MEMO') {
          console.log('   💾 메모 저장 시도 (비동기):', payload.orderId);
        } else if (type === 'USER_ADD') {
          console.log('   💾 사용자 추가 시도 (비동기):', payload.id);
          const { data, error } = await supabase
            .from('users')
            .insert([{
              id: payload.id,
              username: payload.username,
              password: payload.password,
              name: payload.name,
              dept: payload.dept,
              role: payload.role,
              created_at: new Date().toISOString()
            }]);
          
          if (error) {
            console.error('   ❌ 사용자 추가 실패:', error);
          } else {
            console.log('   ✅ 사용자 추가 완료:', payload.id);
          }
        } else if (type === 'USER_UPDATE') {
          console.log('   💾 사용자 수정 시도 (비동기):', payload.id);
          const updateData = {
            username: payload.username,
            name: payload.name,
            dept: payload.dept,
            role: payload.role
          };
          
          // 비밀번호가 있으면 업데이트
          if (payload.password) {
            updateData.password = payload.password;
          }
          
          const { data, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', payload.id);
          
          if (error) {
            console.error('   ❌ 사용자 수정 실패:', error);
          } else {
            console.log('   ✅ 사용자 수정 완료:', payload.id);
          }
        } else if (type === 'USER_DELETE') {
          console.log('   💾 사용자 삭제 시도 (비동기):', payload.userId);
          const { data, error } = await supabase
            .from('users')
            .delete()
            .eq('id', payload.userId);
          
          if (error) {
            console.error('   ❌ 사용자 삭제 실패:', error);
          } else {
            console.log('   ✅ 사용자 삭제 완료:', payload.userId);
          }
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
