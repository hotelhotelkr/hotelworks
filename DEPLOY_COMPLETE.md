# 🚀 완전 자동 배포 가이드

## ✅ 1단계: GitHub 푸시 (자동)

변경사항이 GitHub에 푸시되면 Vercel이 자동으로 배포합니다.

## ✅ 2단계: Vercel 환경 변수 설정

### 방법 1: Vercel CLI 사용 (자동)

```bash
# Vercel CLI 설치 (처음 한 번만)
npm install -g vercel

# Vercel 로그인 (처음 한 번만)
vercel login

# 환경 변수 자동 설정
node setup-vercel-env.js
```

### 방법 2: Vercel Dashboard 사용 (수동)

1. **Vercel Dashboard** 접속: https://vercel.com/dashboard
2. **HotelWorks 프로젝트** 선택
3. **Settings** > **Environment Variables**
4. 다음 변수 추가 (모든 환경: Production, Preview, Development):

```
SUPABASE_URL = https://pnmkclrwmbmzrocyygwq.supabase.co
SUPABASE_ANON_KEY = sb_publishable_WdzcqWms_a8Cq623qNPWwQ_okBbp28Q
SUPABASE_SERVICE_ROLE_KEY = sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i
VITE_WS_SERVER_URL = wss://hotelworks.kr
```

5. **Save** 클릭
6. **Deployments** 탭에서 **Redeploy** 클릭

## ✅ 3단계: WebSocket 서버 배포 (Render.com)

### 방법 1: Render Dashboard 사용 (권장)

1. **Render Dashboard** 접속: https://render.com
2. **New** > **Web Service** 클릭
3. **GitHub 저장소 연결** (HotelWorks 프로젝트)
4. 설정:
   - **Name**: `hotelworks-websocket`
   - **Environment**: `Node`
   - **Region**: `Singapore` (또는 가장 가까운 지역)
   - **Branch**: `main`
   - **Root Directory**: (비워두기)
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. **Advanced** 섹션에서 환경 변수 추가:
   ```
   NODE_ENV=production
   PORT=10000
   SUPABASE_URL=https://pnmkclrwmbmzrocyygwq.supabase.co
   SUPABASE_ANON_KEY=sb_publishable_WdzcqWms_a8Cq623qNPWwQ_okBbp28Q
   SUPABASE_SERVICE_ROLE_KEY=sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i
   SERVER_URL=https://hotelworks-websocket.onrender.com
   WS_SERVER_URL=wss://hotelworks-websocket.onrender.com
   ```
6. **Create Web Service** 클릭
7. 배포 완료 대기 (약 5분)

### 방법 2: render.yaml 사용 (자동)

1. **Render Dashboard** 접속
2. **New** > **Blueprint** 클릭
3. GitHub 저장소 선택
4. `render-websocket.yaml` 파일 자동 인식
5. **Apply** 클릭

## ✅ 4단계: 도메인 연결

### 프론트엔드 (Vercel)

1. **Vercel Dashboard** > 프로젝트 > **Settings** > **Domains**
2. `hotelworks.kr` 추가
3. DNS 설정:
   - Type: `CNAME`
   - Name: `@`
   - Value: `cname.vercel-dns.com`
   - 또는 `www` 서브도메인 추가

### WebSocket 서버 (Render)

1. **Render Dashboard** > `hotelworks-websocket` 서비스
2. **Settings** > **Custom Domain**
3. `ws.hotelworks.kr` 또는 `api.hotelworks.kr` 추가
4. DNS 설정:
   - Type: `CNAME`
   - Name: `ws` (또는 `api`)
   - Value: Render에서 제공하는 CNAME 값

## 🔍 확인 사항

### 1. 프론트엔드 확인
- `https://hotelworks.kr` 접속
- 브라우저 콘솔에서 WebSocket 연결 확인
- 로그인 테스트

### 2. WebSocket 서버 확인
- `https://hotelworks-websocket.onrender.com/health` 접속
- 또는 `wss://ws.hotelworks.kr/health` (도메인 연결 후)

### 3. 전체 기능 테스트
- 로그인
- 주문 생성
- 실시간 동기화
- 메모 기능

## 📊 배포 체크리스트

- [x] 코드 수정 완료
- [ ] GitHub 푸시
- [ ] Vercel 환경 변수 설정
- [ ] Vercel 재배포
- [ ] Render.com WebSocket 서버 배포
- [ ] 도메인 DNS 설정
- [ ] SSL 인증서 확인
- [ ] 전체 기능 테스트

---

**모든 설정이 완료되면 `https://hotelworks.kr`에서 사용할 수 있습니다!** 🎉
