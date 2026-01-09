import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDatabase() {
  try {
    console.log('📊 데이터베이스 초기화 시작...');
    
    // 스키마 파일 읽기
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // SQL 문들을 세미콜론으로 분리하여 실행
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement) {
        await pool.execute(statement);
      }
    }
    
    console.log('✅ 데이터베이스 초기화 완료');
  } catch (error) {
    console.error('❌ 데이터베이스 초기화 실패:', error.message);
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


