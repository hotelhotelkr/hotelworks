import supabase from './db.js';

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
        id: 'u3',
        username: '3',
        password: '3',
        name: '로미오',
        dept: 'FRONT_DESK',
        role: 'FD_STAFF'
      },
      {
        id: 'u5',
        username: '4',
        password: '4',
        name: '줄리엣',
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
    
    // 각 사용자 삽입 (이미 존재하면 업데이트)
    for (const user of defaultUsers) {
      try {
        const { error } = await supabase
          .from('users')
          .upsert({
            id: user.id,
            username: user.username,
            password: user.password,
            name: user.name,
            dept: user.dept,
            role: user.role
          }, {
            onConflict: 'id'
          });

        if (error) throw error;
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

export default seedUsers;
