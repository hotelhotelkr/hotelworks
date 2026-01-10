import pool from './db.js';

/**
 * 초기 사용자 데이터 시딩
 */
async function seedUsers() {
  try {
    console.log('👥 사용자 데이터 시딩 시작...');

    const users = [
      {
        id: 'user-fd-001',
        username: '1',
        password: '1', // 🔒 실제 프로덕션에서는 bcrypt로 해싱 필요
        name: '김프론트',
        dept: 'FRONT_DESK',
        role: 'FD_STAFF'
      },
      {
        id: 'user-hk-001',
        username: '2',
        password: '2',
        name: '이하우스',
        dept: 'HOUSEKEEPING',
        role: 'HK_STAFF'
      },
      {
        id: 'user-admin-001',
        username: 'admin',
        password: 'admin',
        name: '관리자',
        dept: 'ADMIN',
        role: 'ADMIN'
      }
    ];

    for (const user of users) {
      // 기존 사용자 확인
      const [existing] = await pool.execute(
        'SELECT id FROM users WHERE username = ?',
        [user.username]
      );

      if (existing.length > 0) {
        console.log(`   ⏭️  사용자 이미 존재: ${user.username}`);
        continue;
      }

      // 새 사용자 추가
      await pool.execute(
        `INSERT INTO users (id, username, password, name, dept, role)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [user.id, user.username, user.password, user.name, user.dept, user.role]
      );

      console.log(`   ✅ 사용자 생성: ${user.username} (${user.name})`);
    }

    console.log('✅ 사용자 데이터 시딩 완료\n');
  } catch (error) {
    console.error('❌ 사용자 데이터 시딩 실패:', error.message);
    throw error;
  }
}

/**
 * 샘플 주문 데이터 시딩 (선택 사항)
 */
async function seedSampleOrders() {
  try {
    console.log('📦 샘플 주문 데이터 시딩 시작...');

    const sampleOrders = [
      {
        id: `order-${Date.now()}-1`,
        room_no: '501',
        guest_name: '홍길동',
        category: '객실용품',
        item_name: '수건',
        quantity: 2,
        priority: 'NORMAL',
        status: 'REQUESTED',
        requested_at: new Date().toISOString(),
        created_by: 'user-fd-001',
        request_channel: 'FRONT_DESK',
        request_note: '샘플 주문입니다'
      }
    ];

    for (const order of sampleOrders) {
      await pool.execute(
        `INSERT INTO orders (
          id, room_no, guest_name, category, item_name, quantity,
          priority, status, requested_at, created_by, request_channel, request_note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          order.id,
          order.room_no,
          order.guest_name,
          order.category,
          order.item_name,
          order.quantity,
          order.priority,
          order.status,
          order.requested_at,
          order.created_by,
          order.request_channel,
          order.request_note
        ]
      );

      console.log(`   ✅ 샘플 주문 생성: ${order.item_name} (${order.room_no})`);
    }

    console.log('✅ 샘플 주문 데이터 시딩 완료\n');
  } catch (error) {
    console.error('❌ 샘플 주문 데이터 시딩 실패:', error.message);
    throw error;
  }
}

/**
 * 전체 시딩 실행
 */
async function runSeed() {
  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌱 데이터베이스 시딩 시작');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await seedUsers();
    
    // 샘플 주문은 선택 사항 (주석 해제하여 사용)
    // await seedSampleOrders();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 모든 시딩 작업 완료');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    console.error('❌ 시딩 실패:', error);
    throw error;
  }
}

// 직접 실행 시
if (import.meta.url === `file://${process.argv[1]}`) {
  runSeed()
    .then(() => {
      console.log('✅ 시딩 스크립트 실행 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 시딩 스크립트 실행 실패:', error);
      process.exit(1);
    });
}

export { seedUsers, seedSampleOrders, runSeed };
