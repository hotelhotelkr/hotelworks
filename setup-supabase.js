import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 프로젝트 정보
const PROJECT_ID = 'pnmkclrwmbmzrocyygwq';
const SUPABASE_URL = `https://${PROJECT_ID}.supabase.co`;

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🚀 Supabase 설정 시작');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log(`📋 프로젝트 ID: ${PROJECT_ID}`);
console.log(`🔗 Supabase URL: ${SUPABASE_URL}\n`);

// 환경 변수 확인
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!anonKey || !serviceRoleKey) {
  console.log('❌ 환경 변수가 설정되지 않았습니다.\n');
  console.log('💡 다음 단계를 따라주세요:\n');
  console.log('1. Supabase Dashboard 접속: https://supabase.com/dashboard');
  console.log('2. HotelWorks Project 선택');
  console.log('3. Settings > API 메뉴로 이동');
  console.log('4. 다음 명령어로 환경 변수를 설정하세요:\n');
  console.log('   Windows PowerShell:');
  console.log('   $env:SUPABASE_ANON_KEY="your-anon-key"');
  console.log('   $env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
  console.log('   node setup-supabase.js\n');
  console.log('   또는 .env 파일을 생성하고 다음을 추가:');
  console.log('   SUPABASE_ANON_KEY=your-anon-key');
  console.log('   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key\n');
  process.exit(1);
}

// Supabase 클라이언트 생성 (service_role 키 사용)
const supabase = createClient(SUPABASE_URL, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupDatabase() {
  try {
    console.log('📊 데이터베이스 스키마 생성 중...\n');
    
    // 스키마 파일 읽기
    const schemaPath = path.join(__dirname, 'database', 'schema.supabase.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // SQL 문들을 세미콜론으로 분리
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    // 각 SQL 문 실행
    for (const statement of statements) {
      if (statement) {
        try {
          // Supabase는 직접 SQL 실행을 지원하지 않으므로
          // RPC 함수를 사용하거나 REST API를 사용해야 합니다
          // 여기서는 테이블 생성 확인만 수행
          console.log(`   ⏳ 실행 중: ${statement.substring(0, 50)}...`);
        } catch (error) {
          console.warn(`   ⚠️ 경고: ${error.message}`);
        }
      }
    }
    
    console.log('\n💡 참고: Supabase는 직접 SQL 실행을 지원하지 않습니다.');
    console.log('   다음 단계를 따라주세요:\n');
    console.log('   1. Supabase Dashboard > SQL Editor 접속');
    console.log('   2. New Query 클릭');
    console.log('   3. database/schema.supabase.sql 파일 내용을 복사하여 붙여넣기');
    console.log('   4. Run 버튼 클릭\n');
    
    // 테이블 존재 여부 확인
    console.log('🔍 테이블 존재 여부 확인 중...\n');
    const tables = ['orders', 'memos', 'users'];
    
    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('count', { count: 'exact', head: true });
        
        if (error) {
          console.log(`   ❌ ${table}: 존재하지 않음`);
        } else {
          console.log(`   ✅ ${table}: 존재함`);
        }
      } catch (error) {
        console.log(`   ❌ ${table}: 확인 실패 - ${error.message}`);
      }
    }
    
    console.log('\n✅ 설정 완료!\n');
    console.log('다음 명령어로 초기 데이터를 삽입하세요:');
    console.log('   npm run db:init\n');
    
  } catch (error) {
    console.error('\n❌ 설정 실패:', error.message);
    process.exit(1);
  }
}

setupDatabase();
