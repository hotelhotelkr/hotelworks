import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pnmkclrwmbmzrocyygwq.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('\n🔍 Supabase 직접 연결 테스트 (MCP 서버 없이)\n');

async function testConnection() {
  try {
    // 1. 연결 테스트
    console.log('1️⃣ Supabase 연결 테스트...');
    const { data, error } = await supabase
      .from('orders')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.log(`   ❌ 연결 실패: ${error.message}\n`);
      return false;
    }
    console.log('   ✅ 연결 성공!\n');
    
    // 2. 테이블 확인
    console.log('2️⃣ 테이블 확인...');
    const tables = ['orders', 'memos', 'users'];
    
    for (const table of tables) {
      try {
        const { error: tableError } = await supabase
          .from(table)
          .select('count', { count: 'exact', head: true });
        
        if (tableError) {
          console.log(`   ❌ ${table}: ${tableError.message}`);
        } else {
          console.log(`   ✅ ${table}: 정상`);
        }
      } catch (error) {
        console.log(`   ❌ ${table}: ${error.message}`);
      }
    }
    
    // 3. 사용자 데이터 확인
    console.log('\n3️⃣ 사용자 데이터 확인...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');
    
    if (usersError) {
      console.log(`   ❌ 조회 실패: ${usersError.message}\n`);
    } else {
      console.log(`   ✅ 총 ${users?.length || 0}명의 사용자\n`);
      if (users && users.length > 0) {
        users.forEach(u => {
          console.log(`      - ${u.username} (${u.name})`);
        });
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Supabase 직접 연결 정상 작동!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 MCP 서버 오류는 무시해도 됩니다.');
    console.log('   애플리케이션은 Supabase 클라이언트를 직접 사용합니다.\n');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ 테스트 실패:', error.message);
    return false;
  }
}

testConnection();
