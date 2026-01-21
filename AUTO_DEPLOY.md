# 🚀 자동 배포 완료 가이드

## ✅ 완료된 작업

1. ✅ **코드 수정 완료**
   - Supabase 전환
   - hotelworks.kr 도메인 지원
   - 프로덕션 설정 추가

2. ✅ **GitHub 푸시 완료**
   - 모든 변경사항 커밋 및 푸시됨
   - Vercel이 자동으로 배포 시작

## 📋 다음 단계 (수동 작업 필요)

### 1. Vercel 환경 변수 설정

**방법 1: Vercel Dashboard (가장 쉬움)**

1. https://vercel.com/dashboard 접속
2. **HotelWorks 프로젝트** 선택
3. **Settings** > **Environment Variables** 클릭
4. 다음 변수 추가 (모든 환경: Production, Preview, Development):

```
SUPABASE_URL
= https://pnmkclrwmbmzrocyygwq.supabase.co

SUPABASE_ANON_KEY
= sb_publishable_WdzcqWms_a8Cq623qNPWwQ_okBbp28Q

SUPABASE_SERVICE_ROLE_KEY
= sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i

VITE_WS_SERVER_URL
= wss://hotelworks.kr
```

5. **Save** 클릭
6. **Deployments** 탭으로 이동
7. 최신 배포의 **...** 메뉴 > **Redeploy** 클릭

**방법 2: Vercel CLI (터미널)**

```bash
# Vercel CLI 설치 (처음 한 번만)
npm install -g vercel

# Vercel 로그인 (처음 한 번만)
vercel login

# 환경 변수 자동 설정
node setup-vercel-env.js
```

### 2. WebSocket 서버 배포 (Render.com)

1. **Render Dashboard** 접속: https://render.com
2. **New** > **Web Service** 클릭
3. **GitHub 저장소 연결** (HotelWorks 프로젝트 선택)
4. 설정 입력:
   - **Name**: `hotelworks-websocket`
   - **Environment**: `Node`
   - **Region**: `Singapore` (또는 가장 가까운 지역)
   - **Branch**: `main`
   - **Root Directory**: (비워두기)
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. **Advanced** 섹션 클릭
6. **Environment Variables** 추가:
   ```
   NODE_ENV = production
   PORT = 10000
   SUPABASE_URL = https://pnmkclrwmbmzrocyygwq.supabase.co
   SUPABASE_ANON_KEY = sb_publishable_WdzcqWms_a8Cq623qNPWwQ_okBbp28Q
   SUPABASE_SERVICE_ROLE_KEY = sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i
   SERVER_URL = https://hotelworks-websocket.onrender.com
   WS_SERVER_URL = wss://hotelworks-websocket.onrender.com
   ```
7. **Create Web Service** 클릭
8. 배포 완료 대기 (약 5분)

### 3. 도메인 연결

#### 프론트엔드 (Vercel)

1. **Vercel Dashboard** > 프로젝트 > **Settings** > **Domains**
2. `hotelworks.kr` 추가
3. DNS 설정 (도메인 관리자에서):
   - Type: `CNAME`
   - Name: `@` (또는 `www`)
   - Value: Vercel에서 제공하는 CNAME 값 (예: `cname.vercel-dns.com`)

#### WebSocket 서버 (Render)

1. **Render Dashboard** > `hotelworks-websocket` 서비스
2. **Settings** > **Custom Domain**
3. `ws.hotelworks.kr` 또는 `api.hotelworks.kr` 추가
4. DNS 설정 (도메인 관리자에서):
   - Type: `CNAME`
   - Name: `ws` (또는 `api`)
   - Value: Render에서 제공하는 CNAME 값

## 🔍 확인 사항

### 배포 확인

1. **Vercel 배포 확인**
   - Vercel Dashboard > Deployments 탭
   - 최신 배포 상태 확인
   - 배포 완료 후 `https://hotelworks.kr` 접속 테스트

2. **Render 배포 확인**
   - Render Dashboard > `hotelworks-websocket` 서비스
   - 배포 로그 확인
   - `https://hotelworks-websocket.onrender.com/health` 접속 테스트

### 기능 테스트

1. **프론트엔드**
   - `https://hotelworks.kr` 접속
   - 브라우저 콘솔에서 WebSocket 연결 확인
   - 로그인 테스트 (FD / FD)

2. **WebSocket 서버**
   - `https://hotelworks-websocket.onrender.com/health` 접속
   - Supabase 연결 상태 확인

3. **전체 기능**
   - 주문 생성
   - 실시간 동기화
   - 메모 기능

## 📊 배포 체크리스트

- [x] 코드 수정 완료
- [x] GitHub 푸시 완료
- [ ] Vercel 환경 변수 설정
- [ ] Vercel 재배포
- [ ] Render.com WebSocket 서버 배포
- [ ] 도메인 DNS 설정
- [ ] SSL 인증서 확인
- [ ] 전체 기능 테스트

## 🆘 문제 해결

### Vercel 배포 실패
- 환경 변수 확인
- 빌드 로그 확인
- Vercel Dashboard > Deployments > 로그 확인

### WebSocket 연결 실패
- Render 서버가 실행 중인지 확인
- 도메인 DNS 설정 확인
- 브라우저 콘솔 오류 확인

### 도메인 연결 실패
- DNS 전파 대기 (최대 24시간, 보통 몇 분)
- DNS 설정 확인
- SSL 인증서 자동 발급 대기

---

**모든 설정이 완료되면 `https://hotelworks.kr`에서 사용할 수 있습니다!** 🎉
