import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pnmkclrwmbmzrocyygwq.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔍 Supabase 설정 확인');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

async function verifySetup() {
  try {
    // 1. 연결 테스트
    console.log('1️⃣ Supabase 연결 테스트...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('orders')
      .select('count', { count: 'exact', head: true });
    
    if (connectionError) {
      console.log(`   ❌ 연결 실패: ${connectionError.message}\n`);
      return false;
    }
    console.log('   ✅ 연결 성공!\n');
    
    // 2. 테이블 확인
    console.log('2️⃣ 테이블 존재 확인...');
    const tables = ['orders', 'memos', 'users'];
    let allTablesExist = true;
    
    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('count', { count: 'exact', head: true });
        
        if (error) {
          console.log(`   ❌ ${table}: ${error.message}`);
          allTablesExist = false;
        } else {
          console.log(`   ✅ ${table}: 존재함`);
        }
      } catch (error) {
        console.log(`   ❌ ${table}: ${error.message}`);
        allTablesExist = false;
      }
    }
    
    if (!allTablesExist) {
      console.log('\n⚠️ 일부 테이블이 존재하지 않습니다.\n');
      return false;
    }
    console.log('   ✅ 모든 테이블이 존재합니다!\n');
    
    // 3. 사용자 데이터 확인
    console.log('3️⃣ 초기 사용자 데이터 확인...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('id');
    
    if (usersError) {
      console.log(`   ❌ 조회 실패: ${usersError.message}\n`);
    } else {
      if (users && users.length > 0) {
        console.log(`   ✅ 총 ${users.length}명의 사용자가 등록되어 있습니다:\n`);
        users.forEach(user => {
          console.log(`      - ${user.username} (${user.name}) - ${user.dept}`);
        });
        console.log('');
      } else {
        console.log('   ⚠️ 사용자 데이터가 없습니다.\n');
        console.log('   💡 초기 사용자 데이터를 삽입하세요:\n');
        console.log('      node seed-users.js\n');
      }
    }
    
    // 4. 주문 데이터 확인
    console.log('4️⃣ 주문 데이터 확인...');
    const { count: orderCount, error: orderError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });
    
    if (orderError) {
      console.log(`   ⚠️ 조회 실패: ${orderError.message}\n`);
    } else {
      console.log(`   📊 현재 주문 수: ${orderCount || 0}\n`);
    }
    
    // 5. 최종 상태
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Supabase 설정 확인 완료!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (users && users.length >= 5) {
      console.log('🎉 모든 설정이 완료되었습니다!');
      console.log('\n다음 명령어로 서버를 시작하세요:');
      console.log('   npm run dev:all\n');
    } else {
      console.log('⚠️ 사용자 데이터가 부족합니다.');
      console.log('   초기 데이터 삽입을 진행하세요.\n');
    }
    
    return true;
    
  } catch (error) {
    console.error('\n❌ 확인 실패:', error.message);
    console.error(error);
    return false;
  }
}

verifySetup();
