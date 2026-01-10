import pool from './db.js';

/**
 * 데이터베이스에 초기 사용자 데이터 삽입
 */
async function seedUsers() {
  try {
    console.log('📊 초기 사용자 데이터 삽입 시작...');
    
    // 기본 사용자 목록
    const defaultUsers = [
      {
        id: 'u1',
        username: 'FD',
        password: 'FD',
        name: '프론트수',
        dept: 'FRONT_DESK',
        role: 'FD_STAFF'
      },
      {
        id: 'u2',
        username: 'HK',
        password: 'HK',
        name: '하우스키핑수',
        dept: 'HOUSEKEEPING',
        role: 'HK_STAFF'
      },
      {
        id: 'u4',
        username: 'admin',
        password: 'admin',
        name: 'Admin User',
        dept: 'ADMIN',
        role: 'ADMIN'
      }
    ];
    
    // 각 사용자 삽입 (이미 존재하면 무시)
    for (const user of defaultUsers) {
      try {
        await pool.execute(
          `INSERT INTO users (id, username, password, name, dept, role)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
           username = VALUES(username),
           password = VALUES(password),
           name = VALUES(name),
           dept = VALUES(dept),
           role = VALUES(role)`,
          [user.id, user.username, user.password, user.name, user.dept, user.role]
        );
        console.log(`✅ 사용자 추가/업데이트: ${user.username} (${user.name})`);
      } catch (error) {
        console.warn(`⚠️ 사용자 추가 실패: ${user.username}`, error.message);
      }
    }
    
    console.log('✅ 초기 사용자 데이터 삽입 완료');
  } catch (error) {
    console.error('❌ 초기 사용자 데이터 삽입 실패:', error.message);
    throw error;
  }
}

// 직접 실행 시
if (import.meta.url === `file://${process.argv[1]}`) {
  seedUsers()
    .then(() => {
      console.log('✅ 시드 스크립트 실행 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 시드 스크립트 실행 실패:', error);
      process.exit(1);
    });
}

export default seedUsers;
