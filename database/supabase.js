import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Supabase 클라이언트 설정
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
  console.error('💡 .env 파일에 다음을 추가하세요:');
  console.error('   SUPABASE_URL=your-project-url');
  console.error('   SUPABASE_ANON_KEY=your-anon-key');
  console.error('   또는');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (서버 사이드용)');
}

// Supabase 클라이언트 생성
// 서비스 롤 키가 있으면 우선 사용 (서버 사이드 작업용)
const supabase = createClient(
  supabaseUrl || '',
  supabaseKey || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// 연결 테스트
if (supabaseUrl && supabaseKey) {
  supabase
    .from('orders')
    .select('count', { count: 'exact', head: true })
    .then(() => {
      console.log('✅ Supabase 연결 성공');
    })
    .catch((error) => {
      console.error('❌ Supabase 연결 실패:', error.message);
      console.error('💡 Supabase 프로젝트가 생성되었는지, 테이블이 생성되었는지 확인하세요.');
    });
}

export default supabase;
