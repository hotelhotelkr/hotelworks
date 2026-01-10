import express from 'express';
import pool from './db.js';

const router = express.Router();

// ============================================
// 데이터베이스 상태 확인 API
// ============================================

/**
 * 데이터베이스 연결 상태 확인
 * GET /api/db/status
 */
router.get('/db/status', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // 연결 테스트
    await connection.ping();
    connection.release();
    
    // 테이블 존재 여부 확인
    const [tables] = await pool.execute(
      `SELECT TABLE_NAME 
       FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_NAME IN ('orders', 'memos', 'users')`,
      [process.env.DB_NAME || 'hotelworks']
    );
    
    // 주문 개수 확인
    let orderCount = 0;
    try {
      const [result] = await pool.execute('SELECT COUNT(*) as count FROM orders');
      orderCount = result[0]?.count || 0;
    } catch (e) {
      console.warn('⚠️ 주문 개수 조회 실패:', e.message);
    }
    
    res.json({
      status: 'connected',
      message: '데이터베이스 연결 성공',
      config: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || '3306',
        database: process.env.DB_NAME || 'hotelworks',
        user: process.env.DB_USER || 'root'
      },
      tables: {
        found: tables.map(t => t.TABLE_NAME),
        expected: ['orders', 'memos', 'users'],
        allTablesExist: tables.length === 3
      },
      orders: {
        count: orderCount
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ DB 연결 확인 실패:', error.message);
    res.status(500).json({
      status: 'error',
      message: '데이터베이스 연결 실패',
      error: error.message,
      config: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || '3306',
        database: process.env.DB_NAME || 'hotelworks',
        user: process.env.DB_USER || 'root',
        hasPassword: !!process.env.DB_PASSWORD
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
    const [tables] = await pool.execute(
      `SELECT TABLE_NAME, TABLE_ROWS, CREATE_TIME, UPDATE_TIME
       FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_NAME IN ('orders', 'memos', 'users')
       ORDER BY TABLE_NAME`,
      [process.env.DB_NAME || 'hotelworks']
    );
    
    // 각 테이블의 컬럼 정보 가져오기
    const tablesWithColumns = await Promise.all(
      tables.map(async (table) => {
        const [columns] = await pool.execute(
          `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
           FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
           ORDER BY ORDINAL_POSITION`,
          [process.env.DB_NAME || 'hotelworks', table.TABLE_NAME]
        );
        
        // 각 테이블의 데이터 개수
        let rowCount = 0;
        try {
          const [count] = await pool.execute(`SELECT COUNT(*) as count FROM ${table.TABLE_NAME}`);
          rowCount = count[0]?.count || 0;
        } catch (e) {
          console.warn(`⚠️ ${table.TABLE_NAME} 행 개수 조회 실패:`, e.message);
        }
        
        return {
          ...table,
          columns,
          rowCount
        };
      })
    );
    
    res.json({
      success: true,
      tables: tablesWithColumns,
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
    const [orders] = await pool.execute(
      'SELECT * FROM orders ORDER BY requested_at DESC'
    );
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
    const [orders] = await pool.execute(
      'SELECT * FROM orders WHERE id = ?',
      [req.params.id]
    );
    
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(orders[0]);
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
    const {
      id,
      room_no,
      guest_name,
      category,
      item_name,
      quantity,
      priority,
      status,
      requested_at,
      created_by,
      request_channel,
      request_note
    } = req.body;

    await pool.execute(
      `INSERT INTO orders (
        id, room_no, guest_name, category, item_name, quantity,
        priority, status, requested_at, created_by, request_channel, request_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        room_no,
        guest_name || null,
        category,
        item_name,
        quantity || 1,
        priority || 'NORMAL',
        status || 'REQUESTED',
        requested_at,
        created_by,
        request_channel,
        request_note || null
      ]
    );

    console.log('✅ 주문 생성 완료:', id);
    res.status(201).json({ message: 'Order created', id });
  } catch (error) {
    console.error('❌ 주문 생성 실패:', error.message);
    res.status(500).json({ error: 'Failed to create order' });
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
        // 이미 존재하는 주문인지 확인
        const [existing] = await pool.execute(
          'SELECT id FROM orders WHERE id = ?',
          [order.id]
        );

        if (existing.length > 0) {
          results.skipped++;
          console.log('⏭️ 주문 건너뛰기 (이미 존재):', order.id);
          continue;
        }

        // 주문 삽입
        await pool.execute(
          `INSERT INTO orders (
            id, room_no, guest_name, category, item_name, quantity,
            priority, status, requested_at, created_by, request_channel, request_note
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            order.id,
            order.roomNo || order.room_no,
            order.guestName || order.guest_name || null,
            order.category,
            order.itemName || order.item_name,
            order.quantity || 1,
            order.priority || 'NORMAL',
            order.status || 'REQUESTED',
            order.requestedAt ? (order.requestedAt instanceof Date ? order.requestedAt.toISOString() : order.requestedAt) : new Date().toISOString(),
            order.createdBy || order.created_by,
            order.requestChannel || order.request_channel || 'Phone',
            order.requestNote || order.request_note || null
          ]
        );

        // 메모가 있으면 삽입
        if (order.memos && Array.isArray(order.memos) && order.memos.length > 0) {
          for (const memo of order.memos) {
            try {
              await pool.execute(
                `INSERT IGNORE INTO memos (id, order_id, text, sender_id, sender_name, sender_dept, timestamp)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                  memo.id,
                  order.id,
                  memo.text,
                  memo.senderId || memo.sender_id,
                  memo.senderName || memo.sender_name,
                  memo.senderDept || memo.sender_dept,
                  memo.timestamp ? (memo.timestamp instanceof Date ? memo.timestamp.toISOString() : memo.timestamp) : new Date().toISOString()
                ]
              );
            } catch (memoError) {
              console.warn('⚠️ 메모 삽입 실패 (건너뜀):', memo.id, memoError.message);
            }
          }
        }

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
    const {
      status,
      accepted_at,
      in_progress_at,
      completed_at,
      assigned_to
    } = req.body;

    const updates = [];
    const values = [];

    if (status) {
      updates.push('status = ?');
      values.push(status);
    }
    if (accepted_at !== undefined) {
      updates.push('accepted_at = ?');
      values.push(accepted_at);
    }
    if (in_progress_at !== undefined) {
      updates.push('in_progress_at = ?');
      values.push(in_progress_at);
    }
    if (completed_at !== undefined) {
      updates.push('completed_at = ?');
      values.push(completed_at);
    }
    if (assigned_to !== undefined) {
      updates.push('assigned_to = ?');
      values.push(assigned_to);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    const [result] = await pool.execute(
      `UPDATE orders SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    console.log('✅ 주문 상태 업데이트 완료:', id);
    res.json({ message: 'Order updated', id });
  } catch (error) {
    console.error('❌ 주문 업데이트 실패:', error.message);
    res.status(500).json({ error: 'Failed to update order' });
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
    const [memos] = await pool.execute(
      'SELECT * FROM memos WHERE order_id = ? ORDER BY timestamp ASC',
      [req.params.orderId]
    );
    res.json(memos);
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
    const {
      id,
      order_id,
      text,
      sender_id,
      sender_name,
      sender_dept,
      timestamp
    } = req.body;

    await pool.execute(
      `INSERT INTO memos (
        id, order_id, text, sender_id, sender_name, sender_dept, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, order_id, text, sender_id, sender_name, sender_dept, timestamp]
    );

    console.log('✅ 메모 추가 완료:', id);
    res.status(201).json({ message: 'Memo created', id });
  } catch (error) {
    console.error('❌ 메모 추가 실패:', error.message);
    res.status(500).json({ error: 'Failed to create memo' });
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

    const [users] = await pool.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // 🔒 실제 프로덕션에서는 bcrypt로 비밀번호 해싱 필요
    if (user.password !== password) {
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
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * 모든 사용자 조회
 * GET /api/users
 */
router.get('/users', async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, username, name, dept, role, created_at FROM users'
    );
    res.json(users);
  } catch (error) {
    console.error('❌ 사용자 조회 실패:', error.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;
