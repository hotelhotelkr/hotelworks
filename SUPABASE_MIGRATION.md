# 🚀 Supabase 마이그레이션 가이드

이 문서는 HotelWorks 프로젝트를 MySQL에서 Supabase로 전환하는 방법을 안내합니다.

## 📋 전환 전 준비사항

### 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에 가입/로그인
2. 새 프로젝트 생성
3. 프로젝트 설정에서 다음 정보 확인:
   - Project URL
   - API Keys (anon key 또는 service_role key)

### 2. 환경 변수 설정

`.env` 파일에 다음을 추가:

```env
# Supabase 설정
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
# 또는 서버 사이드 작업용
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**참고**: 
- `SUPABASE_ANON_KEY`: 클라이언트 사이드에서 사용 (RLS 정책 적용)
- `SUPABASE_SERVICE_ROLE_KEY`: 서버 사이드에서 사용 (RLS 정책 우회)

## 🔧 전환 단계

### 1단계: 패키지 설치

```bash
npm install @supabase/supabase-js
```

### 2단계: 데이터베이스 스키마 생성

1. Supabase Dashboard 접속
2. SQL Editor 열기
3. `database/schema.supabase.sql` 파일 내용 복사하여 실행
4. 테이블 생성 확인 (Table Editor에서 확인)

### 3단계: 파일 교체

기존 MySQL 파일을 Supabase 버전으로 교체:

#### 서버 파일 교체

```bash
# 기존 파일 백업 (선택사항)
mv database/db.js database/db.js.mysql.backup
mv database/routes.js database/routes.js.mysql.backup
mv database/routes-users.js database/routes-users.js.mysql.backup
mv database/models/OrderModel.js database/models/OrderModel.js.mysql.backup
mv database/seed.js database/seed.js.mysql.backup
mv database/init.js database/init.js.mysql.backup

# Supabase 버전으로 교체
cp database/supabase.js database/db.js
cp database/routes.supabase.js database/routes.js
cp database/routes-users.supabase.js database/routes-users.js
cp database/models/OrderModel.supabase.js database/models/OrderModel.js
cp database/seed.supabase.js database/seed.js
cp database/init.supabase.js database/init.js
```

또는 직접 파일 내용을 복사하여 교체하세요.

#### server.js 수정

`server.js` 파일에서 import 경로 확인:

```javascript
// 기존
import OrderModel from './database/models/OrderModel.js';
import apiRoutes from './database/routes.js';
import pool from './database/db.js';
import initDatabase from './database/init.js';

// Supabase로 변경 후에도 동일 (파일만 교체됨)
```

### 4단계: 데이터베이스 초기화

```bash
npm run db:init
```

또는

```bash
node database/init.js
```

### 5단계: 서버 재시작

```bash
npm run dev:all
```

## ✅ 전환 확인

### 1. 데이터베이스 연결 확인

```bash
curl http://localhost:3001/api/db/status
```

또는 브라우저에서 `http://localhost:3001/api/db/status` 접속

### 2. 테이블 확인

```bash
curl http://localhost:3001/api/db/tables
```

### 3. 로그인 테스트

기본 사용자로 로그인 테스트:
- ID: `FD`, PW: `FD`
- ID: `HK`, PW: `HK`
- ID: `admin`, PW: `admin`

## 🗑️ 기존 MySQL 코드 삭제 (선택사항)

전환이 완료되고 정상 작동을 확인한 후, 기존 MySQL 관련 파일을 삭제할 수 있습니다:

```bash
# MySQL 관련 파일 삭제
rm database/db.js.mysql.backup
rm database/routes.js.mysql.backup
rm database/routes-users.js.mysql.backup
rm database/models/OrderModel.js.mysql.backup
rm database/seed.js.mysql.backup
rm database/init.js.mysql.backup

# MySQL 패키지 제거 (선택사항)
npm uninstall mysql2

# Supabase 전환용 파일 삭제 (선택사항)
rm database/schema.supabase.sql
rm database/supabase.js
rm database/routes.supabase.js
rm database/routes-users.supabase.js
rm database/models/OrderModel.supabase.js
rm database/seed.supabase.js
rm database/init.supabase.js
```

## 🔄 실시간 동기화

현재 Socket.IO를 사용 중이지만, Supabase Realtime을 사용할 수도 있습니다:

### Supabase Realtime 사용 (선택사항)

1. Supabase Dashboard에서 Realtime 활성화
2. 테이블별 Realtime 구독 설정
3. 프론트엔드에서 Supabase Realtime 클라이언트 사용

**참고**: 현재 Socket.IO가 잘 작동 중이면 그대로 유지해도 됩니다.

## 📊 주요 차이점

### MySQL vs Supabase

| 항목 | MySQL | Supabase |
|------|-------|----------|
| 데이터베이스 | MySQL | PostgreSQL |
| 연결 방식 | Connection Pool | HTTP REST API |
| 쿼리 | SQL 직접 실행 | Supabase Client API |
| 실시간 | Socket.IO | Realtime (선택) |
| 인증 | 직접 구현 | 내장 인증 시스템 |
| 호스팅 | 자체 호스팅 필요 | 클라우드 제공 |

## 🐛 문제 해결

### 연결 실패

- `.env` 파일의 `SUPABASE_URL`과 `SUPABASE_ANON_KEY` 확인
- Supabase 프로젝트가 활성화되어 있는지 확인

### 테이블 없음 오류

- `database/schema.supabase.sql` 파일을 Supabase SQL Editor에서 실행했는지 확인
- Table Editor에서 테이블 존재 확인

### RLS 정책 오류

- `schema.supabase.sql`의 RLS 정책이 제대로 설정되었는지 확인
- 서버 사이드에서는 `SUPABASE_SERVICE_ROLE_KEY` 사용 권장

## 📚 참고 자료

- [Supabase 공식 문서](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [PostgreSQL 문서](https://www.postgresql.org/docs/)

## 💡 팁

1. **개발 환경**: `SUPABASE_ANON_KEY` 사용
2. **프로덕션**: `SUPABASE_SERVICE_ROLE_KEY` 사용 (서버 사이드)
3. **RLS 정책**: 프로덕션에서는 더 엄격한 정책 설정 권장
4. **백업**: 정기적으로 Supabase Dashboard에서 데이터 백업

---

전환 완료 후 이 문서를 업데이트하거나 삭제할 수 있습니다.
