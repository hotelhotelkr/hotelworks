import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pnmkclrwmbmzrocyygwq.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('\n🔧 Supabase 스키마 수정 중...\n');

async function fixSchema() {
  try {
    // 1. 테이블 존재 확인
    console.log('1️⃣ 테이블 존재 확인...');
    const tables = ['orders', 'memos', 'users'];
    
    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('count', { count: 'exact', head: true });
        
        if (error) {
          console.log(`   ❌ ${table}: ${error.message}`);
        } else {
          console.log(`   ✅ ${table}: 존재함`);
        }
      } catch (error) {
        console.log(`   ⚠️ ${table}: ${error.message}`);
      }
    }
    
    // 2. 사용자 데이터 삽입 시도 (다른 방법)
    console.log('\n2️⃣ 사용자 데이터 삽입 시도...\n');
    
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
    
    let successCount = 0;
    
    for (const user of defaultUsers) {
      try {
        // 먼저 기존 사용자 확인
        const { data: existing } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .single();
        
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
          console.log(`   ✅ ${user.username} - 업데이트 완료`);
        } else {
          // 삽입
          const { error } = await supabase
            .from('users')
            .insert(user);
          
          if (error) throw error;
          console.log(`   ✅ ${user.username} - 삽입 완료`);
        }
        
        successCount++;
      } catch (error) {
        console.log(`   ❌ ${user.username} - 실패: ${error.message}`);
      }
    }
    
    console.log(`\n📊 결과: ${successCount}/${defaultUsers.length}개 성공\n`);
    
    // 3. 최종 확인
    console.log('3️⃣ 최종 확인...\n');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');
    
    if (usersError) {
      console.log(`   ❌ 사용자 조회 실패: ${usersError.message}`);
    } else {
      console.log(`   ✅ 총 ${users?.length || 0}명의 사용자가 등록되어 있습니다.`);
      if (users && users.length > 0) {
        users.forEach(u => {
          console.log(`      - ${u.username} (${u.name})`);
        });
      }
    }
    
    console.log('\n✅ 완료!\n');
    
  } catch (error) {
    console.error('\n❌ 오류:', error.message);
    console.error(error);
  }
}

fixSchema();
