# 🌐 hotelworks.kr 프로덕션 설정 가이드

## ✅ 완료된 설정

### 1. 프론트엔드 자동 감지
- `hotelworks.kr` 도메인 접속 시 자동으로 `wss://hotelworks.kr`로 WebSocket 연결
- 로컬 환경에서는 자동으로 `ws://localhost:3001` 사용

### 2. CORS 설정
- 서버에서 모든 도메인 허용 (`*`)
- WebSocket CORS 설정 완료

## 📋 필요한 설정

### 1. Vercel 환경 변수 설정

Vercel Dashboard에서 다음 환경 변수를 설정하세요:

1. **Vercel Dashboard** 접속: https://vercel.com/dashboard
2. **HotelWorks 프로젝트** 선택
3. **Settings** > **Environment Variables** 클릭
4. 다음 변수 추가:

```
SUPABASE_URL = https://pnmkclrwmbmzrocyygwq.supabase.co
SUPABASE_ANON_KEY = sb_publishable_WdzcqWms_a8Cq623qNPWwQ_okBbp28Q
SUPABASE_SERVICE_ROLE_KEY = sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i

VITE_WS_SERVER_URL = wss://hotelworks.kr
```

**중요**: 
- `VITE_WS_SERVER_URL`은 빌드 타임에 주입되므로, 환경 변수 추가 후 **재배포**가 필요합니다.
- Production, Preview, Development 환경 모두에 추가하세요.

### 2. WebSocket 서버 배포

현재 WebSocket 서버(`server.js`)는 별도 서버에서 실행되어야 합니다.

**옵션 1: Render.com 사용 (권장)**

1. **Render Dashboard** 접속: https://render.com
2. **New** > **Web Service** 선택
3. GitHub 저장소 연결
4. 설정:
   - **Name**: `hotelworks-websocket`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Environment Variables**:
     ```
     PORT=10000
     SUPABASE_URL=https://pnmkclrwmbmzrocyygwq.supabase.co
     SUPABASE_ANON_KEY=sb_publishable_WdzcqWms_a8Cq623qNPWwQ_okBbp28Q
     SUPABASE_SERVICE_ROLE_KEY=sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i
     SERVER_URL=https://hotelworks-websocket.onrender.com
     WS_SERVER_URL=wss://hotelworks-websocket.onrender.com
     ```
5. **Create Web Service**
6. Render에서 제공하는 URL을 `hotelworks.kr`의 서브도메인으로 연결

**옵션 2: Railway 사용**

1. **Railway Dashboard** 접속: https://railway.app
2. **New Project** > **Deploy from GitHub**
3. 저장소 선택
4. 환경 변수 설정 (위와 동일)
5. 도메인 연결

**옵션 3: VPS 서버 사용**

1. 서버에 Node.js 설치
2. 프로젝트 클론
3. PM2로 서버 실행:
   ```bash
   npm install -g pm2
   pm2 start server.js --name hotelworks
   pm2 save
   pm2 startup
   ```
4. Nginx 리버스 프록시 설정

### 3. 도메인 설정

#### 프론트엔드 (Vercel)

1. **Vercel Dashboard** > 프로젝트 > **Settings** > **Domains**
2. `hotelworks.kr` 추가
3. DNS 설정:
   - Type: `CNAME`
   - Name: `@` 또는 `www`
   - Value: `cname.vercel-dns.com`

#### WebSocket 서버

WebSocket 서버도 `hotelworks.kr`의 서브도메인으로 연결:

**옵션 A: 서브도메인 사용**
- `ws.hotelworks.kr` 또는 `api.hotelworks.kr`
- DNS 설정:
  - Type: `CNAME`
  - Name: `ws` (또는 `api`)
  - Value: WebSocket 서버 URL

**옵션 B: 같은 도메인 사용 (Nginx 리버스 프록시)**
- Nginx 설정으로 `/socket.io` 경로를 WebSocket 서버로 프록시

### 4. Nginx 리버스 프록시 설정 (같은 도메인 사용 시)

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name hotelworks.kr www.hotelworks.kr;

    # WebSocket 프록시
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API 프록시
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 프론트엔드는 Vercel에서 처리
    location / {
        return 301 https://hotelworks.kr$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name hotelworks.kr www.hotelworks.kr;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # WebSocket 프록시
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API 프록시
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 프론트엔드는 Vercel에서 처리
    location / {
        proxy_pass https://hotelworks-kr.vercel.app;
        proxy_set_header Host hotelworks.kr;
    }
}
```

## 🔍 확인 사항

### 1. 프론트엔드 확인
- `https://hotelworks.kr` 접속
- 브라우저 콘솔에서 WebSocket URL 확인
- `wss://hotelworks.kr` 또는 설정한 URL로 연결되는지 확인

### 2. WebSocket 연결 확인
- 브라우저 개발자 도구 > Network > WS 탭
- WebSocket 연결 상태 확인
- 실시간 동기화 테스트

### 3. API 연결 확인
- `https://hotelworks.kr/api/db/status` 접속
- Supabase 연결 상태 확인

## 🚀 배포 체크리스트

- [ ] Vercel 환경 변수 설정
- [ ] Vercel 재배포
- [ ] WebSocket 서버 배포 (Render/Railway/VPS)
- [ ] 도메인 DNS 설정
- [ ] SSL 인증서 설정 (Let's Encrypt)
- [ ] 프론트엔드 접속 테스트
- [ ] WebSocket 연결 테스트
- [ ] 로그인 테스트
- [ ] 주문 생성/관리 테스트
- [ ] 실시간 동기화 테스트

## 📞 문제 해결

### WebSocket 연결 실패
- 도메인 DNS 설정 확인
- SSL 인증서 확인 (wss:// 사용 시 필수)
- 방화벽 설정 확인
- 서버 로그 확인

### CORS 오류
- 서버의 CORS 설정 확인 (`server.js`)
- Vercel의 CORS 헤더 확인

---

**설정 완료 후 `https://hotelworks.kr`에서 모든 기능이 정상 작동합니다!** 🎉
