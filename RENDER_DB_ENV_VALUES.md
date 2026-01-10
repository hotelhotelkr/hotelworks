# Render Dashboard 환경 변수 설정 값

## 📝 Render Dashboard에서 추가할 환경 변수

Render Dashboard → **hotelworks-backend** → **Environment** 탭에서 다음 환경 변수들을 추가하세요:

### ✅ 필수 환경 변수 5개

#### 1. DB_HOST
```
Key: DB_HOST
Value: [MySQL 호스트 주소]
```
**예시:**
- `mysql.example.com`
- `your-db-instance.xxxxx.us-east-1.rds.amazonaws.com`
- `db-mysql-xxx-xxx.db.ondigitalocean.com`
- `xxx.us-east-2.psdb.cloud`

**찾는 방법:**
- phpMyAdmin: 상단 또는 설정에서 호스트 주소 확인
- 호스팅 서비스 대시보드: Database → Connection Details → Host

---

#### 2. DB_PORT
```
Key: DB_PORT
Value: 3306
```
**값:** 대부분의 경우 `3306` (기본 MySQL 포트)

**찾는 방법:**
- 호스팅 서비스 대시보드에서 포트 번호 확인
- 보통 3306이지만 일부 서비스는 다른 포트 사용 가능

---

#### 3. DB_USER
```
Key: DB_USER
Value: [데이터베이스 사용자명]
```
**예시:**
- `root`
- `admin`
- `hotelworks_user`
- `doadmin`

**찾는 방법:**
- phpMyAdmin: 로그인한 사용자명
- 호스팅 서비스 대시보드: Database → Users 또는 Connection Details

---

#### 4. DB_PASSWORD
```
Key: DB_PASSWORD
Value: [데이터베이스 비밀번호]
```
**⚠️ 중요:** 실제 MySQL 비밀번호를 입력하세요.

**찾는 방법:**
- phpMyAdmin에 로그인할 때 사용한 비밀번호
- 호스팅 서비스 대시보드: Database → Users → Reset Password (비밀번호를 잊은 경우)

---

#### 5. DB_NAME
```
Key: DB_NAME
Value: hotelworks
```
**값:** 데이터베이스 이름 (보통 `hotelworks`)

**찾는 방법:**
- phpMyAdmin: 왼쪽 목록에서 데이터베이스 이름 확인
- 호스팅 서비스 대시보드: Databases 목록에서 확인

---

## 📋 Render Dashboard 설정 단계

### 1단계: Environment 탭 열기
1. Render Dashboard 접속: https://dashboard.render.com
2. **hotelworks-backend** 서비스 클릭
3. 왼쪽 메뉴에서 **Environment** 클릭 (현재 보이는 페이지)

### 2단계: 환경 변수 추가
1. **"Edit"** 버튼 클릭 (Environment Variables 섹션 오른쪽)
2. 또는 **"+ Add Environment Variable"** 버튼 클릭

### 3단계: 각 변수 추가

**각 변수를 하나씩 추가:**

#### 변수 1: DB_HOST
- **Key:** `DB_HOST`
- **Value:** [실제 MySQL 호스트 주소]
- **Add** 클릭

#### 변수 2: DB_PORT
- **Key:** `DB_PORT`
- **Value:** `3306`
- **Add** 클릭

#### 변수 3: DB_USER
- **Key:** `DB_USER`
- **Value:** [실제 데이터베이스 사용자명]
- **Add** 클릭

#### 변수 4: DB_PASSWORD
- **Key:** `DB_PASSWORD`
- **Value:** [실제 데이터베이스 비밀번호]
- **Add** 클릭

#### 변수 5: DB_NAME
- **Key:** `DB_NAME`
- **Value:** `hotelworks`
- **Add** 클릭

### 4단계: 저장
1. 모든 변수 추가 완료 후
2. **"Save Changes"** 또는 **"Done"** 버튼 클릭
3. Render가 자동으로 서버를 재배포합니다 (약 2-3분 소요)

---

## 🔍 MySQL 정보 확인 방법

### 방법 1: phpMyAdmin에서 확인
1. phpMyAdmin 접속
2. 상단 메뉴에서 정보 확인:
   - 호스트 주소 (보통 `localhost` 또는 외부 주소)
   - 사용자명 (로그인한 사용자)
   - 데이터베이스 이름 (왼쪽 목록)

### 방법 2: 호스팅 서비스 대시보드
- **AWS RDS**: RDS Console → Instances → Endpoint
- **DigitalOcean**: Databases → Connection Details
- **PlanetScale**: Dashboard → Connect
- **기타**: 호스팅 서비스 문서 참조

---

## ✅ 설정 완료 후 확인

환경 변수 설정 완료 후 (약 2-3분 후):

1. **서버 상태 확인:**
   ```
   https://hotelworks-backend.onrender.com/health
   ```
   
2. **DB 연결 상태 확인:**
   ```
   https://hotelworks-backend.onrender.com/api/db/status
   ```

**성공 시:**
```json
{
  "status": "connected",
  "tables": {
    "allTablesExist": true
  }
}
```

---

## ⚠️ 주의사항

1. **비밀번호 보안:**
   - DB_PASSWORD는 Render Dashboard에서 값이 숨겨집니다 (보안)
   - 실제 비밀번호를 정확히 입력하세요

2. **특수문자:**
   - 비밀번호에 특수문자가 있어도 그대로 입력
   - 따옴표나 이스케이프 문자 필요 없음

3. **호스트 주소:**
   - `localhost`가 아닌 외부 접근 가능한 주소 사용
   - Render 서버가 외부 DB에 접근해야 하므로

---

## ❓ 질문

**Q: 실제 값을 모르겠어요.**
- A: phpMyAdmin에 접속할 때 사용한 정보를 확인하세요
- 또는 MySQL 호스팅 서비스의 대시보드에서 확인

**Q: DB_NAME이 'hotelworks'가 아닌가요?**
- A: phpMyAdmin 왼쪽 목록에서 실제 데이터베이스 이름을 확인하세요
- 데이터베이스가 아직 없다면 먼저 생성해야 합니다

**Q: 설정 후에도 연결이 안 되나요?**
- A: Render 서버 로그를 확인하세요 (Logs 탭)
- 또는 `/api/db/status` API에서 오류 메시지 확인
