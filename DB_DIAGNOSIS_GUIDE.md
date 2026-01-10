# 데이터베이스 진단 가이드

## 🔍 문제 확인

phpMyAdmin이 작동하지 않는 경우, 다음을 확인하세요:

### 1. Render 서버 DB 연결 확인

#### 방법 1: 브라우저에서 직접 확인

```
https://hotelworks-backend.onrender.com/health
```

이 주소를 브라우저에서 열면 서버와 DB 상태를 확인할 수 있습니다.

#### 방법 2: DB 상태 API 확인

```
https://hotelworks-backend.onrender.com/api/db/status
```

이 API는 다음 정보를 제공합니다:
- DB 연결 상태
- 환경 변수 설정 여부
- 테이블 존재 여부
- 주문 개수

#### 방법 3: 테이블 구조 확인

```
https://hotelworks-backend.onrender.com/api/db/tables
```

---

## ⚙️ Render 환경 변수 설정

**Render 대시보드**에서 다음 환경 변수를 설정해야 합니다:

1. **Render Dashboard** 접속
   - https://dashboard.render.com
   
2. **hotelworks-backend** 서비스 선택

3. **Environment** 탭 클릭

4. 다음 환경 변수 추가:

```
DB_HOST=your-mysql-host
DB_PORT=3306
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_NAME=hotelworks
```

### 환경 변수 확인 방법

Render 서버 로그에서 다음 메시지를 확인하세요:

**✅ 성공:**
```
✅ 데이터베이스 연결 성공
```

**❌ 실패:**
```
❌ 데이터베이스 연결 실패: ...
💡 MySQL 서버가 실행 중인지, .env 파일 설정이 올바른지 확인하세요.
```

---

## 🔧 로컬에서 DB 테스트

로컬에서 데이터베이스 연결을 테스트하려면:

### 1. `.env` 파일 생성 (백엔드 루트에)

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=hotelworks
```

### 2. 데이터베이스 초기화

```bash
npm run db:init
```

이 명령어는 `database/schema.sql`을 실행하여 필요한 테이블을 생성합니다.

### 3. 서버 실행 및 확인

```bash
npm run dev:server
```

콘솔에 다음 메시지가 나타나야 합니다:
```
✅ 데이터베이스 연결 성공
```

---

## 📊 DB 상태 확인 API 사용법

### 브라우저 콘솔에서 실행

```javascript
// 1. 서버 상태 확인
fetch('https://hotelworks-backend.onrender.com/health')
  .then(r => r.json())
  .then(data => {
    console.log('🔍 서버 상태:', data);
    if (data.database.status === 'disconnected') {
      console.error('❌ DB 연결 실패:', data.database.error);
      console.log('💡 환경 변수 설정 여부:', data.database.config.hasConfig);
    }
  });

// 2. DB 상태 상세 확인
fetch('https://hotelworks-backend.onrender.com/api/db/status')
  .then(r => r.json())
  .then(data => {
    console.log('📊 DB 상태:', data);
    console.log('📋 테이블:', data.tables.found);
    console.log('📦 주문 개수:', data.orders.count);
  });

// 3. 테이블 구조 확인
fetch('https://hotelworks-backend.onrender.com/api/db/tables')
  .then(r => r.json())
  .then(data => {
    console.log('🗂️ 테이블 정보:', data);
  });
```

---

## 🚨 일반적인 문제 해결

### 문제 1: "데이터베이스 연결 실패"

**원인:** 환경 변수가 설정되지 않았거나 잘못됨

**해결:**
1. Render Dashboard에서 환경 변수 확인
2. DB_HOST, DB_USER, DB_PASSWORD가 올바른지 확인
3. MySQL 서버가 실행 중인지 확인

### 문제 2: "Table 'hotelworks.orders' doesn't exist"

**원인:** 테이블이 생성되지 않음

**해결:**
1. `database/schema.sql` 파일 확인
2. 로컬에서 `npm run db:init` 실행
3. 또는 phpMyAdmin에서 `schema.sql` 실행

### 문제 3: 환경 변수가 설정되지 않음

**원인:** Render Dashboard에서 환경 변수를 추가하지 않음

**해결:**
1. Render Dashboard → hotelworks-backend → Environment
2. 위의 환경 변수 추가
3. 서버 재시작

---

## ✅ 체크리스트

- [ ] Render Dashboard에서 DB 환경 변수 설정
- [ ] `/health` 엔드포인트에서 DB 연결 확인
- [ ] `/api/db/status`에서 테이블 존재 확인
- [ ] `/api/db/tables`에서 테이블 구조 확인
- [ ] 서버 로그에서 "✅ 데이터베이스 연결 성공" 메시지 확인
