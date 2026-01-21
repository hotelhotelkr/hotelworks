# 🔧 Render 서버 오류 해결 가이드

## 문제 분석

Render Dashboard에서 `hotelworks-backend` 서비스가 보이지만, 우리가 설정한 서비스 이름은 `hotelworks-websocket`입니다.

## 해결 방법

### 방법 1: 기존 서비스 이름 변경 (권장)

Render Dashboard에서:
1. `hotelworks-backend` 서비스 선택
2. **Settings** 탭
3. **Name** 필드에서 `hotelworks-websocket`으로 변경
4. **Save Changes** 클릭

### 방법 2: 새 서비스 생성

1. Render Dashboard에서 **New** > **Web Service**
2. GitHub 저장소 연결
3. 다음 설정 사용:

**기본 설정:**
- **Name**: `hotelworks-websocket`
- **Region**: `Singapore` (또는 가장 가까운 지역)
- **Branch**: `main`
- **Root Directory**: (비워두기)

**빌드 설정:**
- **Build Command**: `npm install`
- **Start Command**: `node server.js`

**환경 변수:**
```
NODE_ENV = production
PORT = 10000
SUPABASE_URL = https://pnmkclrwmbmzrocyygwq.supabase.co
SUPABASE_ANON_KEY = sb_publishable_WdzcqWms_a8Cq623qNPWwQ_okBbp28Q
SUPABASE_SERVICE_ROLE_KEY = sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i
SERVER_URL = https://hotelworks-websocket.onrender.com
WS_SERVER_URL = wss://hotelworks-websocket.onrender.com
```

### 방법 3: render.yaml 파일 사용 (가장 쉬움)

1. Render Dashboard에서 **New** > **Blueprint**
2. GitHub 저장소 연결
3. Render가 `render.yaml` 파일을 자동으로 인식
4. **Apply** 클릭

## ⚠️ 중요: PORT 환경 변수

Render는 자동으로 `PORT` 환경 변수를 제공합니다. `server.js`는 이미 이를 사용하도록 설정되어 있습니다:

```javascript
const PORT = process.env.PORT || 3001;
```

따라서 Render Dashboard에서 `PORT` 환경 변수를 수동으로 설정할 필요가 없습니다. Render가 자동으로 할당합니다.

## 🔍 문제 해결 체크리스트

- [ ] 서비스 이름 확인 (`hotelworks-websocket`)
- [ ] 환경 변수 확인 (모든 Supabase 변수 설정)
- [ ] Build Command: `npm install`
- [ ] Start Command: `node server.js`
- [ ] Health Check Path: `/health`
- [ ] 서버 로그 확인 (오류 메시지 확인)

## 📋 환경 변수 확인

Render Dashboard → 서비스 → **Environment** 탭에서 다음 변수들이 설정되어 있는지 확인:

1. `NODE_ENV` = `production`
2. `SUPABASE_URL` = `https://pnmkclrwmbmzrocyygwq.supabase.co`
3. `SUPABASE_ANON_KEY` = `sb_publishable_WdzcqWms_a8Cq623qNPWwQ_okBbp28Q`
4. `SUPABASE_SERVICE_ROLE_KEY` = `sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i`
5. `SERVER_URL` = `https://hotelworks-websocket.onrender.com` (서비스 URL과 일치)
6. `WS_SERVER_URL` = `wss://hotelworks-websocket.onrender.com` (서비스 URL과 일치)

**⚠️ 주의**: `SERVER_URL`과 `WS_SERVER_URL`은 실제 서비스 URL과 일치해야 합니다!

## 🚀 배포 후 확인

1. **서비스 상태**: Render Dashboard에서 서비스가 "Live" 상태인지 확인
2. **Health Check**: `https://hotelworks-websocket.onrender.com/health` 접속
3. **로그 확인**: Render Dashboard → Logs 탭에서 오류 확인

---

**가장 쉬운 방법은 Blueprint을 사용하는 것입니다!** 🎯
