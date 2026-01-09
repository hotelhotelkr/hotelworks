import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hotelworks',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Connection pool 생성
const pool = mysql.createPool(dbConfig);

// 데이터베이스 연결 테스트
pool.getConnection()
  .then(connection => {
    console.log('✅ 데이터베이스 연결 성공');
    connection.release();
  })
  .catch(error => {
    console.error('❌ 데이터베이스 연결 실패:', error.message);
    console.error('💡 MySQL 서버가 실행 중인지, .env 파일 설정이 올바른지 확인하세요.');
  });

export default pool;


