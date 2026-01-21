# 🚀 Render WebSocket 서버 배포 (지금 바로!)

## ⚡ 빠른 배포 방법 (3분)

### 1단계: Render Dashboard 접속

1. **Render Dashboard** 접속: https://dashboard.render.com
2. **New** 버튼 클릭
3. **Web Service** 선택

### 2단계: GitHub 저장소 연결

1. **Connect GitHub** 클릭
2. **hotelworks** 저장소 선택
3. **Connect** 클릭

### 3단계: 서비스 설정

다음 정보를 입력:

**기본 설정:**
- **Name**: `hotelworks-websocket`
- **Region**: `Singapore` (또는 가장 가까운 지역)
- **Branch**: `main`
- **Root Directory**: (비워두기)

**빌드 설정:**
- **Build Command**: `npm install`
- **Start Command**: `node server.js`

### 4단계: 환경 변수 추가

**Environment Variables** 섹션에서 다음 변수들을 추가:

```
NODE_ENV = production
PORT = 10000
SUPABASE_URL = https://pnmkclrwmbmzrocyygwq.supabase.co
SUPABASE_ANON_KEY = sb_publishable_WdzcqWms_a8Cq623qNPWwQ_okBbp28Q
SUPABASE_SERVICE_ROLE_KEY = sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i
SERVER_URL = https://hotelworks-websocket.onrender.com
WS_SERVER_URL = wss://hotelworks-websocket.onrender.com
```

### 5단계: 서비스 생성

1. **Create Web Service** 클릭
2. 배포 완료 대기 (약 5분)

### 6단계: 서비스 URL 확인

배포 완료 후:
- 서비스 URL: `https://hotelworks-websocket.onrender.com`
- Health Check: `https://hotelworks-websocket.onrender.com/health`

## ✅ 완료 확인

1. **Render Dashboard**에서 서비스 상태 확인
2. **Logs** 탭에서 배포 로그 확인
3. **Health Check** URL 접속하여 연결 확인

---

**배포 완료 후 `https://hotelworks.kr`에서 사용할 수 있습니다!** 🎉
