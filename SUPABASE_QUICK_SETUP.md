# 🚀 Supabase 빠른 설정 가이드

## ✅ 1단계: API 키 확인 (필수)

Supabase Dashboard에서 API 키를 확인하세요:

1. **Supabase Dashboard 접속**: https://supabase.com/dashboard
2. **HotelWorks Project** 선택
3. 왼쪽 메뉴에서 **Settings** > **API** 클릭
4. 다음 정보를 복사:

   - **Project URL**: `https://pnmkclrwmbmzrocyygwq.supabase.co` (이미 설정됨)
   - **anon public** 키 → `.env` 파일의 `SUPABASE_ANON_KEY`에 입력
   - **service_role** 키 → `.env` 파일의 `SUPABASE_SERVICE_ROLE_KEY`에 입력

5. `.env` 파일을 열어서 키를 입력하세요.

## ✅ 2단계: 데이터베이스 스키마 생성

### 방법 1: Supabase Dashboard 사용 (추천)

1. Supabase Dashboard 접속
2. 왼쪽 메뉴에서 **SQL Editor** 클릭
3. **New Query** 버튼 클릭
4. 아래 SQL 코드를 복사하여 붙여넣기:

```sql
-- HotelWorks 데이터베이스 스키마

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
CREATE POLICY "Enable all access for orders" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for memos" ON memos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for users" ON users FOR ALL USING (true) WITH CHECK (true);
```

5. **Run** 버튼 클릭 (또는 Ctrl+Enter)
6. 성공 메시지 확인

### 방법 2: 파일 사용

`database/schema.supabase.sql` 파일 내용을 복사하여 SQL Editor에 붙여넣기

## ✅ 3단계: 초기 데이터 삽입

`.env` 파일에 API 키를 입력한 후:

```bash
npm run db:init
```

이 명령은 초기 사용자 데이터를 삽입합니다:
- FD / FD (프론트 데스크)
- HK / HK (하우스키핑)
- 3 / 3 (로미오)
- 4 / 4 (줄리엣)
- admin / admin (관리자)

## ✅ 4단계: 서버 시작 및 테스트

```bash
npm run dev:all
```

**연결 확인:**
- 브라우저에서 `http://localhost:3001/health` 접속
- `http://localhost:3001/api/db/status` 접속하여 Supabase 연결 상태 확인

## 🔍 문제 해결

### API 키를 입력했는데도 연결 실패
- `.env` 파일이 프로젝트 루트에 있는지 확인
- 키 앞뒤에 공백이 없는지 확인
- Supabase 프로젝트가 활성화되어 있는지 확인

### 테이블이 없다는 오류
- SQL Editor에서 스키마를 실행했는지 확인
- Table Editor에서 테이블이 생성되었는지 확인

---

**준비 완료!** API 키만 입력하면 바로 사용할 수 있습니다! 🎉
