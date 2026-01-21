# 🚀 Supabase 설정 완료 가이드

프로젝트 ID: `pnmkclrwmbmzrocyygwq`

## ✅ 1단계: API 키 확인 및 환경 변수 설정

### 방법 1: .env 파일 생성 (추천)

프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가:

```env
SUPABASE_URL=https://pnmkclrwmbmzrocyygwq.supabase.co
SUPABASE_ANON_KEY=여기에_anon_key_입력
SUPABASE_SERVICE_ROLE_KEY=여기에_service_role_key_입력

PORT=3001
SERVER_URL=http://localhost:3001
WS_SERVER_URL=ws://localhost:3001
```

**API 키 찾는 방법:**
1. https://supabase.com/dashboard 접속
2. **HotelWorks Project** 선택
3. 왼쪽 메뉴 **Settings** > **API** 클릭
4. **anon public** 키와 **service_role** 키를 복사하여 `.env` 파일에 붙여넣기

### 방법 2: 환경 변수로 직접 설정 (임시)

**Windows PowerShell:**
```powershell
$env:SUPABASE_URL="https://pnmkclrwmbmzrocyygwq.supabase.co"
$env:SUPABASE_ANON_KEY="your-anon-key"
$env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

## ✅ 2단계: 데이터베이스 스키마 생성

Supabase Dashboard에서 직접 실행해야 합니다:

1. **Supabase Dashboard** 접속: https://supabase.com/dashboard
2. **HotelWorks Project** 선택
3. 왼쪽 메뉴에서 **SQL Editor** 클릭
4. **New Query** 버튼 클릭
5. `database/schema.supabase.sql` 파일을 열어서 **전체 내용을 복사**
6. SQL Editor에 **붙여넣기**
7. **Run** 버튼 클릭 (또는 `Ctrl+Enter`)
8. 성공 메시지 확인

**또는 아래 SQL을 직접 복사:**

```sql
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

-- Row Level Security 설정
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for orders" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for memos" ON memos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for users" ON users FOR ALL USING (true) WITH CHECK (true);
```

## ✅ 3단계: 초기 데이터 삽입

`.env` 파일에 API 키를 입력한 후:

```bash
npm run db:init
```

이 명령은 다음 사용자 계정을 생성합니다:
- **FD** / **FD** (프론트 데스크)
- **HK** / **HK** (하우스키핑)
- **3** / **3** (로미오 - 프론트 데스크)
- **4** / **4** (줄리엣 - 하우스키핑)
- **admin** / **admin** (관리자)

## ✅ 4단계: 서버 시작 및 테스트

```bash
npm run dev:all
```

**연결 확인:**
- 브라우저에서 `http://localhost:3001/health` 접속
- `http://localhost:3001/api/db/status` 접속하여 Supabase 연결 상태 확인

## 🎉 완료!

이제 Supabase를 사용하여 데이터를 저장하고 관리할 수 있습니다!

---

**문제가 발생하면:**
- `.env` 파일이 프로젝트 루트에 있는지 확인
- API 키가 올바르게 입력되었는지 확인
- Supabase Dashboard에서 테이블이 생성되었는지 확인
