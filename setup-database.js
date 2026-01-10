import initDatabase from './database/init.js';
import { seedUsers } from './database/seed.js';

async function setup() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 HotelWorks 데이터베이스 설정 시작');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 1. 테이블 생성
    await initDatabase();
    
    // 2. 초기 사용자 데이터 시딩
    await seedUsers();
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 데이터베이스 설정 완료!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📋 생성된 사용자 계정:');
    console.log('   1. Front Desk  → ID: 1, PW: 1');
    console.log('   2. Housekeeping → ID: 2, PW: 2');
    console.log('   3. Admin → ID: admin, PW: admin\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 설정 실패:', error.message);
    process.exit(1);
  }
}

setup();
