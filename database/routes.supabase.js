import express from 'express';
import supabase from './supabase.js';
import OrderModel from './models/OrderModel.supabase.js';
import userRoutes from './routes-users.supabase.js';

const router = express.Router();

// 사용자 관련 라우트 등록
router.use('/', userRoutes);

// ============================================
// 데이터베이스 상태 확인 API
// ============================================

/**
 * 데이터베이스 연결 상태 확인
 * GET /api/db/status
 */
router.get('/db/status', async (req, res) => {
  try {
    // 연결 테스트
    const { data, error } = await supabase
      .from('orders')
      .select('count', { count: 'exact', head: true });

    if (error) throw error;

    // 테이블 존재 여부 확인
    const tables = ['orders', 'memos', 'users'];
    const tableChecks = await Promise.all(
      tables.map(async (table) => {
        const { error: tableError } = await supabase
          .from(table)
          .select('count', { count: 'exact', head: true });
        return { table, exists: !tableError };
      })
    );

    // 주문 개수 확인
    const { count: orderCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    res.json({
      status: 'connected',
      message: 'Supabase 연결 성공',
      config: {
        url: process.env.SUPABASE_URL ? '설정됨' : '미설정',
        key: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY ? '설정됨' : '미설정'
      },
      tables: {
        found: tableChecks.filter(t => t.exists).map(t => t.table),
        expected: tables,
        allTablesExist: tableChecks.every(t => t.exists)
      },
      orders: {
        count: orderCount || 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Supabase 연결 확인 실패:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Supabase 연결 실패',
      error: error.message,
      config: {
        url: process.env.SUPABASE_URL ? '설정됨' : '미설정',
        key: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY ? '설정됨' : '미설정'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 데이터베이스 테이블 구조 확인
 * GET /api/db/tables
 */
router.get('/db/tables', async (req, res) => {
  try {
    const tables = ['orders', 'memos', 'users'];
    const tablesWithInfo = await Promise.all(
      tables.map(async (tableName) => {
        const { data, count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (error) throw error;

        return {
          table_name: tableName,
          row_count: count || 0
        };
      })
    );

    res.json({
      success: true,
      tables: tablesWithInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 테이블 정보 조회 실패:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================
// 주문 관련 API
// ============================================

/**
 * 모든 주문 조회
 * GET /api/orders
 */
router.get('/orders', async (req, res) => {
  try {
    const orders = await OrderModel.findAll();
    res.json(orders);
  } catch (error) {
    console.error('❌ 주문 조회 실패:', error.message);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

/**
 * 특정 주문 조회
 * GET /api/orders/:id
 */
router.get('/orders/:id', async (req, res) => {
  try {
    const order = await OrderModel.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('❌ 주문 조회 실패:', error.message);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

/**
 * 주문 생성
 * POST /api/orders
 */
router.post('/orders', async (req, res) => {
  try {
    const order = await OrderModel.create(req.body);
    console.log('✅ 주문 생성 완료:', order.id);
    res.status(201).json(order);
  } catch (error) {
    console.error('❌ 주문 생성 실패:', error.message);
    res.status(500).json({ error: 'Failed to create order', message: error.message });
  }
});

/**
 * 주문 일괄 동기화 (localStorage에서 DB로)
 * POST /api/orders/sync
 */
router.post('/orders/sync', async (req, res) => {
  try {
    const { orders } = req.body;
    
    if (!Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({ error: 'Orders array is required' });
    }

    const results = {
      total: orders.length,
      created: 0,
      skipped: 0,
      errors: []
    };

    for (const order of orders) {
      try {
        const existing = await OrderModel.findById(order.id);
        if (existing) {
          results.skipped++;
          console.log('⏭️ 주문 건너뛰기 (이미 존재):', order.id);
          continue;
        }

        await OrderModel.create(order);
        results.created++;
        console.log('✅ 주문 동기화 완료:', order.id);
      } catch (error) {
        results.errors.push({
          orderId: order.id,
          error: error.message
        });
        console.error('❌ 주문 동기화 실패:', order.id, error.message);
      }
    }

    console.log(`📊 동기화 완료: ${results.created}개 생성, ${results.skipped}개 건너뜀, ${results.errors.length}개 오류`);
    res.json({
      message: 'Sync completed',
      results
    });
  } catch (error) {
    console.error('❌ 주문 동기화 실패:', error.message);
    res.status(500).json({ error: 'Failed to sync orders', message: error.message });
  }
});

/**
 * 주문 상태 업데이트
 * PUT /api/orders/:id
 */
router.put('/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      status: req.body.status,
      acceptedAt: req.body.accepted_at,
      inProgressAt: req.body.in_progress_at,
      completedAt: req.body.completed_at,
      assignedTo: req.body.assigned_to
    };

    const order = await OrderModel.update(id, updateData);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    console.log('✅ 주문 상태 업데이트 완료:', id);
    res.json(order);
  } catch (error) {
    console.error('❌ 주문 업데이트 실패:', error.message);
    res.status(500).json({ error: 'Failed to update order', message: error.message });
  }
});

// ============================================
// 메모 관련 API
// ============================================

/**
 * 특정 주문의 메모 조회
 * GET /api/orders/:orderId/memos
 */
router.get('/orders/:orderId/memos', async (req, res) => {
  try {
    const { data: memos, error } = await supabase
      .from('memos')
      .select('*')
      .eq('order_id', req.params.orderId)
      .order('timestamp', { ascending: true });

    if (error) throw error;
    res.json(memos || []);
  } catch (error) {
    console.error('❌ 메모 조회 실패:', error.message);
    res.status(500).json({ error: 'Failed to fetch memos' });
  }
});

/**
 * 메모 추가
 * POST /api/memos
 */
router.post('/memos', async (req, res) => {
  try {
    const { data: memo, error } = await supabase
      .from('memos')
      .insert({
        id: req.body.id,
        order_id: req.body.order_id,
        text: req.body.text,
        sender_id: req.body.sender_id,
        sender_name: req.body.sender_name,
        sender_dept: req.body.sender_dept,
        timestamp: req.body.timestamp
      })
      .select()
      .single();

    if (error) throw error;

    console.log('✅ 메모 추가 완료:', memo.id);
    res.status(201).json(memo);
  } catch (error) {
    console.error('❌ 메모 추가 실패:', error.message);
    res.status(500).json({ error: 'Failed to create memo', message: error.message });
  }
});

// ============================================
// 사용자 관련 API
// ============================================

/**
 * 로그인
 * POST /api/login
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    console.log('🔍 로그인 시도:', { username, passwordLength: password.length });

    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .limit(1);

    if (error) throw error;

    if (!users || users.length === 0) {
      console.log('❌ 사용자를 찾을 수 없음:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // 🔒 실제 프로덕션에서는 bcrypt로 비밀번호 해싱 필요
    if (user.password !== password) {
      console.log('❌ 비밀번호 불일치:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('✅ 로그인 성공:', user.username);
    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      dept: user.dept,
      role: user.role
    });
  } catch (error) {
    console.error('❌ 로그인 실패:', error.message);
    res.status(500).json({ 
      error: 'Login failed',
      message: error.message 
    });
  }
});

/**
 * 모든 사용자 조회
 * GET /api/users
 */
router.get('/users', async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, name, dept, role, created_at');

    if (error) throw error;
    res.json(users || []);
  } catch (error) {
    console.error('❌ 사용자 조회 실패:', error.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;
