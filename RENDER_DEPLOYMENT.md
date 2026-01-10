# 🚀 Render 배포 가이드

## 1단계: Render 계정 생성

1. https://render.com 접속
2. **Get Started for Free** 클릭
3. GitHub 계정으로 가입

---

## 2단계: MySQL 데이터베이스 생성 (선택사항)

Render는 무료 PostgreSQL만 제공하므로, MySQL이 필요하면 외부 서비스를 사용해야 합니다.

### 옵션 A: PlanetScale (MySQL 호환, 무료)
1. https://planetscale.com 가입
2. **New database** 생성
3. **Connect** → **Node.js** 선택
4. 연결 정보 복사 (나중에 사용)

### 옵션 B: Railway (MySQL, 무료 500시간)
1. https://railway.app 가입
2. **New Project** → **Provision MySQL**
3. 연결 정보 복사

### 옵션 C: 데이터베이스 없이 시작 (로컬 저장소만 사용)
- 서버는 데이터베이스 없이도 작동합니다
- 모든 데이터는 브라우저 localStorage에 저장됩니다
- 실시간 동기화는 정상 작동합니다

---

## 3단계: GitHub에 코드 푸시

```powershell
# 현재 디렉토리 확인
pwd

# 변경사항 확인
git status

# 모든 변경사항 추가
git add .

# 커밋
git commit -m "Add Render deployment configuration"

# GitHub에 푸시
git push origin main
```

---

## 4단계: Render에서 Web Service 생성

1. Render Dashboard → **New** → **Web Service** 클릭

2. **Connect a repository** 선택
   - GitHub 저장소 연결 (hotelworks)

3. **Configure**:
   ```
   Name: hotelworks-backend
   Region: Singapore (가장 가까운 지역)
   Branch: main
   Runtime: Node
   Build Command: npm install
   Start Command: npm run start
   ```

4. **Free Plan** 선택 (무료)

5. **Advanced** → **Add Environment Variable** 클릭

---

## 5단계: 환경 변수 설정

Render Dashboard에서 다음 환경 변수들을 추가하세요:

### 필수 변수:
```
NODE_ENV = production
PORT = 10000
```

### 데이터베이스 사용 시 (옵션):
```
DB_HOST = your-database-host
DB_PORT = 3306
DB_USER = your-database-user
DB_PASSWORD = your-database-password
DB_NAME = hotelworks
```

### 데이터베이스 없이 시작:
- 위 DB_* 변수들을 추가하지 마세요
- 서버가 자동으로 로컬 저장소 모드로 작동합니다

---

## 6단계: 배포 시작

1. **Create Web Service** 클릭
2. 자동 빌드 & 배포 시작 (약 3-5분 소요)
3. 배포 로그 확인:
   ```
   ==> Building...
   ==> Installing dependencies...
   ==> Starting server...
   ✅ 서버 시작 완료: http://localhost:10000
   ```

4. 배포 완료 후 URL 확인:
   ```
   https://hotelworks-backend.onrender.com
   ```

---

## 7단계: 백엔드 연결 테스트

브라우저에서 다음 URL 접속:
```
https://hotelworks-backend.onrender.com/health
```

다음과 같은 응답이 나오면 성공:
```json
{
  "status": "ok",
  "service": "HotelWorks WebSocket Server",
  "port": 10000,
  "timestamp": "2026-01-10T...",
  "connectedClients": 0
}
```

---

## 8단계: Vercel에 백엔드 URL 연결

1. Vercel Dashboard 접속: https://vercel.com/dashboard
2. **hotelworks** 프로젝트 선택
3. **Settings** → **Environment Variables**
4. 새 변수 추가:
   ```
   Name: VITE_WS_SERVER_URL
   Value: https://hotelworks-backend.onrender.com
   ```
5. **Production**, **Preview**, **Development** 모두 체크
6. **Save** 클릭

---

## 9단계: Vercel 재배포

1. Vercel Dashboard → **Deployments** 탭
2. 최신 배포 옆 **... (점 3개)** → **Redeploy**
3. **Redeploy** 확인
4. 재배포 완료 (약 1-2분)

---

## 10단계: 실시간 동기화 테스트

### 테스트 A: 브라우저 Console 확인

1. https://hotelworks.vercel.app 접속
2. **F12** → **Console** 탭
3. 로그인 (ID: 1, PW: 1)
4. Console에서 확인:
   ```
   🔌 WebSocket URL: https://hotelworks-backend.onrender.com
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📡 WebSocket 연결 시도중...
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✅ WebSocket 연결 성공
   ```

### 테스트 B: 2개 기기로 실시간 동기화 테스트

**기기 1 (PC):**
1. https://hotelworks.vercel.app 접속
2. ID: 1, PW: 1 로그인 (Front Desk)
3. Dashboard → 501호에 생수 주문

**기기 2 (모바일/다른 PC):**
1. https://hotelworks.vercel.app 접속
2. ID: 2, PW: 2 로그인 (Housekeeping)
3. ✅ **토스트 알림** 표시: "501호 신규 요청: 생수"
4. Orders 목록에 자동 추가

---

## ✅ 배포 완료!

이제 다음 URL들이 모두 작동합니다:

- **프론트엔드**: https://hotelworks.vercel.app
- **백엔드**: https://hotelworks-backend.onrender.com
- **헬스체크**: https://hotelworks-backend.onrender.com/health

---

## 🚨 문제 해결

### 문제 1: Render 서비스가 시작 안 됨

**로그 확인**:
- Render Dashboard → **Logs** 탭
- 에러 메시지 확인

**자주 발생하는 에러**:
```
Error: Cannot find module 'mysql2'
```
**해결**: `package.json`에 `mysql2`가 있는지 확인

### 문제 2: WebSocket 연결 실패

**원인**: CORS 설정 문제

**해결**: `server.js`에서 CORS 확인:
```javascript
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
```

### 문제 3: 무료 플랜 제한

Render 무료 플랜:
- ✅ 750시간/월 무료
- ⚠️ 15분 비활동 시 자동 슬립
- 🔄 첫 요청 시 자동 깨어남 (30초 소요)

**해결**: 
- 실제 호텔 운영 시 **유료 플랜** 권장 ($7/월)
- 또는 자체 서버 사용

### 문제 4: 데이터베이스 연결 실패

**확인사항**:
1. DB_HOST, DB_USER, DB_PASSWORD 정확한지 확인
2. 데이터베이스 방화벽 설정 (Render IP 허용)
3. 데이터베이스 서비스 실행 중인지 확인

**임시 해결**: 데이터베이스 없이 사용
- 환경 변수에서 DB_* 변수 제거
- localStorage만 사용

---

## 📊 모니터링

### Render Dashboard
- CPU/메모리 사용량 확인
- 로그 실시간 모니터링
- 배포 히스토리

### WebSocket 연결 수 확인
```
https://hotelworks-backend.onrender.com/health
```
응답의 `connectedClients` 값 확인

---

## 🔄 업데이트 방법

코드 변경 후:
```powershell
git add .
git commit -m "Update code"
git push origin main
```

Render가 **자동으로 재배포**합니다 (약 3-5분)

---

**작성 시간**: 2026-01-10
**상태**: 배포 준비 완료
