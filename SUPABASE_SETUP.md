# 🚀 Supabase 전환 완료 및 설정 가이드

## ✅ 전환 완료 사항

다음 파일들이 Supabase로 전환되었습니다:

- ✅ `database/db.js` - Supabase 클라이언트로 변경
- ✅ `database/models/OrderModel.js` - Supabase 쿼리로 변경
- ✅ `database/routes.js` - Supabase API로 변경
- ✅ `database/routes-users.js` - Supabase API로 변경
- ✅ `database/seed.js` - Supabase로 변경
- ✅ `database/init.js` - Supabase로 변경
- ✅ `server.js` - 헬스체크를 Supabase로 변경
- ✅ `@supabase/supabase-js` 패키지 설치 완료

## 📋 다음 단계: Supabase 프로젝트 설정

### 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에 가입/로그인
2. "New Project" 클릭
3. 프로젝트 정보 입력:
   - **Name**: hotelworks (또는 원하는 이름)
   - **Database Password**: 강력한 비밀번호 설정 (저장해두세요!)
   - **Region**: 가장 가까운 지역 선택
4. 프로젝트 생성 완료 대기 (약 2분)

### 2. 환경 변수 설정

`.env` 파일을 생성하거나 수정하여 다음을 추가:

```env
# Supabase 설정
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# 서버 설정
PORT=3001
SERVER_URL=http://localhost:3001
WS_SERVER_URL=ws://localhost:3001
```

**Supabase 키 찾는 방법:**
1. Supabase Dashboard 접속
2. Settings > API 메뉴
3. 다음 정보 확인:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** 키 → `SUPABASE_ANON_KEY`
   - **service_role** 키 → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ 비밀에 유지!)

### 3. 데이터베이스 스키마 생성

1. Supabase Dashboard 접속
2. 왼쪽 메뉴에서 **SQL Editor** 클릭
3. **New Query** 클릭
4. `database/schema.supabase.sql` 파일 내용을 복사하여 붙여넣기
5. **Run** 버튼 클릭 (또는 Ctrl+Enter)
6. 성공 메시지 확인

**또는 터미널에서:**

```bash
# Supabase CLI 사용 (선택사항)
supabase db push
```

### 4. 초기 데이터 삽입

```bash
npm run db:init
```

또는

```bash
node database/init.js
```

이 명령은:
- 테이블 존재 여부 확인
- 초기 사용자 데이터 삽입 (FD, HK, admin 등)

### 5. 서버 시작 및 테스트

```bash
npm run dev:all
```

**연결 확인:**

브라우저에서 다음 URL 접속:
- `http://localhost:3001/health` - 서버 및 DB 상태 확인
- `http://localhost:3001/api/db/status` - Supabase 연결 상태 확인

## 🔍 문제 해결

### ❌ "Supabase 환경 변수가 설정되지 않았습니다"

**해결:**
- `.env` 파일이 프로젝트 루트에 있는지 확인
- `SUPABASE_URL`과 `SUPABASE_ANON_KEY` (또는 `SUPABASE_SERVICE_ROLE_KEY`)가 설정되었는지 확인

### ❌ "relation does not exist" 오류

**해결:**
- `database/schema.supabase.sql` 파일을 Supabase SQL Editor에서 실행했는지 확인
- Table Editor에서 `orders`, `memos`, `users` 테이블이 생성되었는지 확인

### ❌ "new row violates row-level security policy" 오류

**해결:**
- `schema.supabase.sql`의 RLS 정책이 제대로 설정되었는지 확인
- 서버 사이드에서는 `SUPABASE_SERVICE_ROLE_KEY` 사용 권장 (RLS 우회)

### ❌ 연결 타임아웃

**해결:**
- Supabase 프로젝트가 활성화되어 있는지 확인
- 인터넷 연결 확인
- 방화벽 설정 확인

## 📊 기본 사용자 계정

초기화 후 다음 계정으로 로그인 가능:

| Username | Password | 역할 |
|----------|----------|------|
| FD | FD | 프론트 데스크 |
| HK | HK | 하우스키핑 |
| 3 | 3 | 프론트 데스크 (로미오) |
| 4 | 4 | 하우스키핑 (줄리엣) |
| admin | admin | 관리자 |

## 🗑️ 기존 MySQL 코드 정리 (선택사항)

전환이 완료되고 정상 작동을 확인한 후:

```bash
# MySQL 패키지 제거 (선택사항)
npm uninstall mysql2

# Supabase 전환용 백업 파일 삭제 (선택사항)
rm database/schema.supabase.sql
rm database/supabase.js
rm database/routes.supabase.js
rm database/routes-users.supabase.js
rm database/models/OrderModel.supabase.js
rm database/seed.supabase.js
rm database/init.supabase.js
```

## 📚 참고 자료

- [Supabase 공식 문서](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [PostgreSQL 문서](https://www.postgresql.org/docs/)

## ✨ 다음 단계

1. ✅ Supabase 프로젝트 생성
2. ✅ 환경 변수 설정
3. ✅ 스키마 생성
4. ✅ 초기 데이터 삽입
5. ✅ 서버 시작 및 테스트
6. 🎉 완료!

---

**전환 완료!** 이제 Supabase를 사용하여 데이터를 저장하고 관리할 수 있습니다.
