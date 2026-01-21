import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase 설정
const SUPABASE_URL = 'https://pnmkclrwmbmzrocyygwq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_WdzcqWms_a8Cq623qNPWwQ_okBbp28Q';
const SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i';

// Service Role 키로 클라이언트 생성 (RLS 우회)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🚀 Supabase 완전 자동 설정 시작');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log(`📋 프로젝트 URL: ${SUPABASE_URL}`);
console.log(`🔑 API 키: 설정됨\n`);

// SQL 스키마 실행 함수
async function executeSQL(sql) {
  try {
    // Supabase REST API를 사용하여 SQL 실행
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    return await response.json();
  } catch (error) {
    // RPC 함수가 없을 수 있으므로, 직접 SQL 실행은 Supabase Dashboard에서 해야 함
    throw error;
  }
}

// 테이블 생성 (PostgREST API 사용)
async function createTables() {
  console.log('📊 데이터베이스 스키마 생성 중...\n');
  
  try {
    // Supabase는 직접 SQL 실행을 지원하지 않으므로
    // Supabase Dashboard의 SQL Editor를 사용해야 합니다
    // 여기서는 테이블 존재 여부만 확인하고, 없으면 안내합니다
    
    const tables = ['orders', 'memos', 'users'];
    const missingTables = [];
    
    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('count', { count: 'exact', head: true });
        
        if (error) {
          console.log(`   ❌ ${table}: 존재하지 않음`);
          missingTables.push(table);
        } else {
          console.log(`   ✅ ${table}: 이미 존재함`);
        }
      } catch (error) {
        console.log(`   ❌ ${table}: 확인 실패 - ${error.message}`);
        missingTables.push(table);
      }
    }
    
    if (missingTables.length > 0) {
      console.log('\n⚠️ 다음 테이블이 존재하지 않습니다:', missingTables.join(', '));
      console.log('💡 Supabase Dashboard에서 스키마를 생성해야 합니다.\n');
      console.log('다음 단계를 따라주세요:');
      console.log('1. https://supabase.com/dashboard 접속');
      console.log('2. HotelWorks Project 선택');
      console.log('3. SQL Editor > New Query');
      console.log('4. database/schema.supabase.sql 파일 내용 복사하여 실행\n');
      
      // 스키마 파일 읽어서 표시
      try {
        const schemaPath = path.join(__dirname, 'database', 'schema.supabase.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        console.log('📄 스키마 SQL (복사하여 사용):');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log(schema);
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      } catch (error) {
        console.log('⚠️ 스키마 파일을 읽을 수 없습니다.');
      }
      
      return false;
    }
    
    console.log('\n✅ 모든 테이블이 존재합니다!\n');
    return true;
  } catch (error) {
    console.error('❌ 테이블 확인 실패:', error.message);
    return false;
  }
}

// 초기 사용자 데이터 삽입
async function seedUsers() {
  console.log('👥 초기 사용자 데이터 삽입 중...\n');
  
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
  let errorCount = 0;
  
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
      
      console.log(`   ✅ ${user.username} (${user.name}) - 추가/업데이트 완료`);
      successCount++;
    } catch (error) {
      console.log(`   ❌ ${user.username} - 실패: ${error.message}`);
      errorCount++;
    }
  }
  
  console.log(`\n📊 결과: ${successCount}개 성공, ${errorCount}개 실패\n`);
  return successCount > 0;
}

// 연결 테스트
async function testConnection() {
  console.log('🔍 Supabase 연결 테스트 중...\n');
  
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('count', { count: 'exact', head: true });
    
    if (error) throw error;
    
    console.log('   ✅ Supabase 연결 성공!');
    console.log(`   📊 현재 주문 수: ${data || 0}\n`);
    return true;
  } catch (error) {
    console.log(`   ❌ 연결 실패: ${error.message}\n`);
    return false;
  }
}

// 메인 실행 함수
async function main() {
  try {
    // 1. 연결 테스트
    const connected = await testConnection();
    if (!connected) {
      console.log('⚠️ 연결에 실패했습니다. API 키를 확인해주세요.\n');
      process.exit(1);
    }
    
    // 2. 테이블 확인
    const tablesExist = await createTables();
    
    // 3. 초기 데이터 삽입 (테이블이 존재하는 경우)
    if (tablesExist) {
      await seedUsers();
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 설정 완료!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (!tablesExist) {
      console.log('⚠️ 테이블을 먼저 생성해야 합니다.');
      console.log('   Supabase Dashboard > SQL Editor에서 스키마를 실행하세요.\n');
      process.exit(1);
    }
    
    console.log('🎉 모든 설정이 완료되었습니다!');
    console.log('\n다음 명령어로 서버를 시작하세요:');
    console.log('   npm run dev:all\n');
    
  } catch (error) {
    console.error('\n❌ 설정 실패:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
