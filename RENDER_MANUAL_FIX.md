# 🔧 Render 서비스 수동 수정 가이드 (API 키 없을 때)

## Render Dashboard에서 직접 수정

### 1단계: 서비스 선택

Render Dashboard → `hotelworks-backend` 서비스 선택

### 2단계: 환경 변수 설정

**Environment** 탭 → **Add Environment Variable** 클릭

다음 변수들을 추가/수정:

```
NODE_ENV = production
SUPABASE_URL = https://pnmkclrwmbmzrocyygwq.supabase.co
SUPABASE_ANON_KEY = sb_publishable_WdzcqWms_a8Cq623qNPWwQ_okBbp28Q
SUPABASE_SERVICE_ROLE_KEY = sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i
SERVER_URL = https://hotelworks-backend.onrender.com
WS_SERVER_URL = wss://hotelworks-backend.onrender.com
```

**⚠️ 중요**: 
- `PORT` 환경 변수가 있으면 **삭제**하세요 (Render가 자동 제공)
- `SERVER_URL`과 `WS_SERVER_URL`은 실제 서비스 URL과 일치해야 합니다

### 3단계: 빌드/시작 명령어 확인

**Settings** 탭에서:

- **Build Command**: `npm install`
- **Start Command**: `node server.js`
- **Health Check Path**: `/health`

### 4단계: 재배포

**Manual Deploy** 버튼 클릭

### 5단계: 확인

배포 완료 후:
- `https://hotelworks-backend.onrender.com/health` 접속
- 정상 응답 확인

---

**수정 완료 후 서버가 정상 작동합니다!** ✅
