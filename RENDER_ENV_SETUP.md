# Render 환경 변수 설정 가이드

## 🔧 Render Dashboard에서 환경 변수 설정하기

### 1단계: Render Dashboard 접속

1. https://dashboard.render.com 접속
2. 로그인

### 2단계: 서비스 선택

1. **hotelworks-backend** 서비스 클릭
2. 왼쪽 메뉴에서 **Environment** 탭 클릭

### 3단계: 환경 변수 추가

**Add Environment Variable** 버튼을 클릭하고 다음 변수들을 하나씩 추가하세요:

#### ✅ 필수 환경 변수

| 키 (Key) | 값 (Value) | 설명 |
|---------|-----------|------|
| `DB_HOST` | `your-mysql-host.com` | MySQL 호스트 주소 |
| `DB_PORT` | `3306` | MySQL 포트 (기본값: 3306) |
| `DB_USER` | `your-username` | 데이터베이스 사용자명 |
| `DB_PASSWORD` | `your-password` | 데이터베이스 비밀번호 |
| `DB_NAME` | `hotelworks` | 데이터베이스 이름 |

### 4단계: 값 입력 예시

#### 예시 1: AWS RDS를 사용하는 경우
```
DB_HOST = your-instance.xxxxx.us-east-1.rds.amazonaws.com
DB_PORT = 3306
DB_USER = admin
DB_PASSWORD = your_secure_password
DB_NAME = hotelworks
```

#### 예시 2: DigitalOcean을 사용하는 경우
```
DB_HOST = db-mysql-xxx-xxx.db.ondigitalocean.com
DB_PORT = 3306
DB_USER = doadmin
DB_PASSWORD = your_secure_password
DB_NAME = hotelworks
```

#### 예시 3: PlanetScale을 사용하는 경우
```
DB_HOST = xxx.us-east-2.psdb.cloud
DB_PORT = 3306
DB_USER = your_username
DB_PASSWORD = your_secure_password
DB_NAME = hotelworks
```

#### 예시 4: 일반 MySQL 호스팅 서비스를 사용하는 경우
```
DB_HOST = your-mysql-host.com
DB_PORT = 3306
DB_USER = your_username
DB_PASSWORD = your_secure_password
DB_NAME = hotelworks
```

### 5단계: 저장 및 재배포

1. 모든 환경 변수 추가 완료
2. **Save Changes** 버튼 클릭
3. Render가 자동으로 서버를 재시작합니다

### 6단계: 연결 확인

재배포가 완료되면 (약 2-3분 후):

1. https://hotelworks-backend.onrender.com/health 접속
2. DB 연결 상태 확인:
   ```json
   {
     "database": {
       "status": "connected"  // ✅ 이것이 나타나면 성공!
     }
   }
   ```

또는 더 자세한 정보:
- https://hotelworks-backend.onrender.com/api/db/status

---

## ❓ 자주 묻는 질문

### Q: DB_HOST 값을 어떻게 찾나요?

**A:** MySQL 호스팅 서비스의 대시보드에서 확인하세요:
- **phpMyAdmin**: 상단에 호스트 주소가 표시됩니다
- **AWS RDS**: RDS Console → Endpoint 주소
- **DigitalOcean**: Database → Connection Details → Host
- **PlanetScale**: Dashboard → Connect → Host

### Q: 포트 번호는 항상 3306인가요?

**A:** 대부분의 경우 3306이 기본값입니다. 하지만 일부 호스팅 서비스는 다른 포트를 사용할 수 있습니다:
- **AWS RDS**: 보통 3306
- **DigitalOcean**: 보통 25060 (SSL), 3306 (비SSL)
- **PlanetScale**: 보통 3306

호스팅 서비스의 문서를 확인하세요.

### Q: 환경 변수를 설정한 후에도 연결이 안 되나요?

**A:** 다음을 확인하세요:

1. **방화벽 설정**: MySQL 호스트가 Render의 IP를 허용하는지 확인
2. **사용자 권한**: DB_USER가 해당 데이터베이스에 접근 권한이 있는지 확인
3. **비밀번호**: DB_PASSWORD에 특수문자가 있는 경우 따옴표 없이 입력
4. **서버 로그**: Render Dashboard → hotelworks-backend → Logs 탭에서 오류 확인

---

## 🔍 문제 해결

### 문제: "데이터베이스 연결 실패"

**해결 방법:**

1. **환경 변수 확인**
   ```bash
   # Render Dashboard → Environment에서 확인
   # 모든 변수가 올바르게 설정되었는지 확인
   ```

2. **서버 로그 확인**
   ```
   Render Dashboard → hotelworks-backend → Logs
   # "❌ 데이터베이스 연결 실패" 메시지와 함께 상세 오류 확인
   ```

3. **연결 테스트**
   - https://hotelworks-backend.onrender.com/api/db/status 접속
   - 오류 메시지 확인

### 문제: "Table 'hotelworks.orders' doesn't exist"

**해결 방법:**

데이터베이스 테이블이 생성되지 않았습니다. 다음 중 하나를 실행하세요:

1. **로컬에서 실행** (로컬 MySQL이 같은 DB에 연결된 경우):
   ```bash
   npm run db:init
   ```

2. **phpMyAdmin에서 직접 실행**:
   - `database/schema.sql` 파일을 phpMyAdmin에서 열기
   - 모든 SQL 문 실행

3. **SQL 클라이언트 사용**:
   - MySQL Workbench, DBeaver 등으로 연결
   - `database/schema.sql` 파일 실행

---

## 📝 체크리스트

환경 변수 설정 완료 후 확인:

- [ ] DB_HOST 설정됨
- [ ] DB_PORT 설정됨 (기본값: 3306)
- [ ] DB_USER 설정됨
- [ ] DB_PASSWORD 설정됨
- [ ] DB_NAME 설정됨 (hotelworks)
- [ ] Render 서버 재시작 완료
- [ ] `/health` 엔드포인트에서 `"status": "connected"` 확인
- [ ] `/api/db/status`에서 테이블 존재 확인

---

## 🆘 도움이 필요하신가요?

문제가 계속되면 다음 정보를 제공해주세요:

1. 사용 중인 MySQL 호스팅 서비스 (예: AWS RDS, DigitalOcean, etc.)
2. `/api/db/status` API 응답 내용
3. Render 서버 로그의 오류 메시지
