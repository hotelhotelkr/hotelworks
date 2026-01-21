-- HotelWorks Supabase 데이터베이스 스키마
-- 이 파일을 Supabase Dashboard > SQL Editor에서 실행하세요

-- 주문 테이블
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(50) PRIMARY KEY,
  room_no VARCHAR(20) NOT NULL,
  guest_name VARCHAR(100),
  category VARCHAR(100) NOT NULL,
  item_name VARCHAR(200) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL', 'URGENT')),
  status VARCHAR(20) NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  requested_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  in_progress_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by VARCHAR(50) NOT NULL,
  assigned_to VARCHAR(50),
  request_channel VARCHAR(50) NOT NULL,
  request_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_orders_room_no ON orders(room_no);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_to ON orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_orders_requested_at ON orders(requested_at);

-- 메모 테이블
CREATE TABLE IF NOT EXISTS memos (
  id VARCHAR(50) PRIMARY KEY,
  order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  sender_id VARCHAR(50) NOT NULL,
  sender_name VARCHAR(100) NOT NULL,
  sender_dept VARCHAR(20) NOT NULL CHECK (sender_dept IN ('FRONT_DESK', 'HOUSEKEEPING', 'ADMIN')),
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_memos_order_id ON memos(order_id);
CREATE INDEX IF NOT EXISTS idx_memos_sender_id ON memos(sender_id);

-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  dept VARCHAR(20) NOT NULL CHECK (dept IN ('FRONT_DESK', 'HOUSEKEEPING', 'ADMIN')),
  role VARCHAR(20) NOT NULL CHECK (role IN ('FD_STAFF', 'HK_STAFF', 'ADMIN')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_dept ON users(dept);

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at 트리거 생성
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) 정책 설정
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기/쓰기 가능하도록 정책 생성 (개발용)
DROP POLICY IF EXISTS "Enable all access for orders" ON orders;
CREATE POLICY "Enable all access for orders" ON orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for memos" ON memos;
CREATE POLICY "Enable all access for memos" ON memos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for users" ON users;
CREATE POLICY "Enable all access for users" ON users FOR ALL USING (true) WITH CHECK (true);

-- 초기 사용자 데이터 삽입
INSERT INTO users (id, username, password, name, dept, role) VALUES
('u1', 'FD', 'FD', '프론트수', 'FRONT_DESK', 'FD_STAFF'),
('u2', 'HK', 'HK', '하우스키핑수', 'HOUSEKEEPING', 'HK_STAFF'),
('u3', '3', '3', '로미오', 'FRONT_DESK', 'FD_STAFF'),
('u5', '4', '4', '줄리엣', 'HOUSEKEEPING', 'HK_STAFF'),
('u4', 'admin', 'admin', 'Admin User', 'ADMIN', 'ADMIN')
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  password = EXCLUDED.password,
  name = EXCLUDED.name,
  dept = EXCLUDED.dept,
  role = EXCLUDED.role;
