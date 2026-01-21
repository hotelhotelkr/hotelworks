import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pnmkclrwmbmzrocyygwq.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('\n👥 초기 사용자 데이터 삽입 중...\n');

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

async function seedUsers() {
  let successCount = 0;
  let errorCount = 0;
  
  for (const user of defaultUsers) {
    try {
      // 먼저 기존 사용자 확인
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      
      if (existing) {
        // 업데이트
        const { error } = await supabase
          .from('users')
          .update({
            username: user.username,
            password: user.password,
            name: user.name,
            dept: user.dept,
            role: user.role
          })
          .eq('id', user.id);
        
        if (error) throw error;
        console.log(`   ✅ ${user.username} (${user.name}) - 업데이트 완료`);
      } else {
        // 삽입
        const { error } = await supabase
          .from('users')
          .insert(user);
        
        if (error) throw error;
        console.log(`   ✅ ${user.username} (${user.name}) - 삽입 완료`);
      }
      
      successCount++;
    } catch (error) {
      console.log(`   ❌ ${user.username} - 실패: ${error.message}`);
      errorCount++;
    }
  }
  
  console.log(`\n📊 결과: ${successCount}개 성공, ${errorCount}개 실패\n`);
  
  if (successCount > 0) {
    console.log('✅ 사용자 데이터 삽입 완료!\n');
  } else {
    console.log('⚠️ 사용자 데이터 삽입에 실패했습니다.\n');
    process.exit(1);
  }
}

seedUsers();
