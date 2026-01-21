import supabase from './supabase.js';
import seedUsers from './seed.supabase.js';

async function initDatabase() {
  try {
    console.log('📊 Supabase 데이터베이스 초기화 시작...');
    
    // 스키마 파일은 Supabase Dashboard의 SQL Editor에서 실행해야 합니다
    console.log('💡 참고: database/schema.supabase.sql 파일을 Supabase Dashboard의 SQL Editor에서 실행하세요.');
    
    // 테이블 존재 여부 확인
    const tables = ['orders', 'memos', 'users'];
    const tableChecks = await Promise.all(
      tables.map(async (table) => {
        const { error } = await supabase
          .from(table)
          .select('count', { count: 'exact', head: true });
        return { table, exists: !error };
      })
    );

    const missingTables = tableChecks.filter(t => !t.exists).map(t => t.table);
    
    if (missingTables.length > 0) {
      console.warn('⚠️ 다음 테이블이 존재하지 않습니다:', missingTables.join(', '));
      console.warn('💡 Supabase Dashboard > SQL Editor에서 database/schema.supabase.sql 파일을 실행하세요.');
    } else {
      console.log('✅ 모든 테이블이 존재합니다');
    }
    
    // 초기 사용자 데이터 삽입
    try {
      await seedUsers();
    } catch (seedError) {
      console.warn('⚠️ 초기 사용자 데이터 삽입 실패 (무시하고 계속):', seedError.message);
    }
    
    console.log('✅ Supabase 데이터베이스 초기화 완료');
  } catch (error) {
    console.error('❌ Supabase 데이터베이스 초기화 실패:', error.message);
    console.error('   상세:', error);
    throw error;
  }
}

// 직접 실행 시
if (import.meta.url === `file://${process.argv[1]}`) {
  initDatabase()
    .then(() => {
      console.log('✅ 초기화 스크립트 실행 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 초기화 스크립트 실행 실패:', error);
      process.exit(1);
    });
}

export default initDatabase;
