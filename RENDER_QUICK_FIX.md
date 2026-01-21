# 🚀 Render 서버 빠른 수정 가이드

## 문제

Render Dashboard에서 `hotelworks-backend` 서비스가 보이지만 오류가 발생합니다.

## 해결 방법 (3단계)

### 1단계: 서비스 이름 확인

Render Dashboard에서:
1. `hotelworks-backend` 서비스 선택
2. **Settings** 탭
3. **Name** 필드를 `hotelworks-websocket`으로 변경 (선택사항)
   - 또는 기존 이름 그대로 사용 가능

### 2단계: 환경 변수 설정

**Environment** 탭에서 다음 변수들을 확인/설정:

```
NODE_ENV = production
SUPABASE_URL = https://pnmkclrwmbmzrocyygwq.supabase.co
SUPABASE_ANON_KEY = sb_publishable_WdzcqWms_a8Cq623qNPWwQ_okBbp28Q
SUPABASE_SERVICE_ROLE_KEY = sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i
```

**⚠️ 중요**: `SERVER_URL`과 `WS_SERVER_URL`은 **실제 서비스 URL**과 일치해야 합니다!

서비스 URL이 `https://hotelworks-backend.onrender.com`이면:
```
SERVER_URL = https://hotelworks-backend.onrender.com
WS_SERVER_URL = wss://hotelworks-backend.onrender.com
```

서비스 URL이 `https://hotelworks-websocket.onrender.com`이면:
```
SERVER_URL = https://hotelworks-websocket.onrender.com
WS_SERVER_URL = wss://hotelworks-websocket.onrender.com
```

### 3단계: 빌드 및 시작 명령어 확인

**Settings** 탭에서:
- **Build Command**: `npm install`
- **Start Command**: `node server.js`
- **Health Check Path**: `/health`

### 4단계: 재배포

1. **Manual Deploy** 버튼 클릭
2. 또는 **Settings** 탭에서 **Save Changes** 후 자동 재배포

## 🔍 문제 진단

### 서버 로그 확인

Render Dashboard → 서비스 → **Logs** 탭에서 오류 메시지 확인:

**일반적인 오류:**
1. **포트 오류**: `PORT` 환경 변수 제거 (Render가 자동 제공)
2. **환경 변수 누락**: Supabase 변수 확인
3. **빌드 실패**: `npm install` 오류 확인
4. **시작 실패**: `node server.js` 오류 확인

### Health Check 테스트

서비스 URL + `/health` 접속:
- `https://hotelworks-backend.onrender.com/health`
- 또는 `https://hotelworks-websocket.onrender.com/health`

정상 응답 예시:
```json
{
  "status": "ok",
  "service": "HotelWorks WebSocket Server",
  "port": 10000,
  "database": {
    "status": "connected"
  }
}
```

## ✅ 체크리스트

- [ ] 서비스 이름 확인
- [ ] 환경 변수 설정 (Supabase 3개)
- [ ] SERVER_URL과 WS_SERVER_URL이 실제 서비스 URL과 일치
- [ ] Build Command: `npm install`
- [ ] Start Command: `node server.js`
- [ ] Health Check Path: `/health`
- [ ] 서버 재배포
- [ ] Health Check 테스트 성공

---

**가장 중요한 것은 SERVER_URL과 WS_SERVER_URL이 실제 서비스 URL과 일치하는 것입니다!** 🎯
