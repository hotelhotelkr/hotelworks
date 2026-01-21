# Vercel 환경 변수 설정 가이드

## 📋 Vercel Dashboard에서 설정할 환경 변수

### 1. Vercel Dashboard 접속
https://vercel.com/dashboard

### 2. 프로젝트 선택
HotelWorks 프로젝트 선택

### 3. Settings > Environment Variables

다음 변수들을 **모든 환경** (Production, Preview, Development)에 추가:

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

### 4. 재배포

환경 변수 추가 후:
1. **Deployments** 탭으로 이동
2. 최신 배포의 **...** 메뉴 클릭
3. **Redeploy** 선택

또는:
- Git에 푸시하면 자동 재배포됩니다.

## ⚠️ 중요 사항

- `VITE_WS_SERVER_URL`은 빌드 타임에 주입되므로, 환경 변수 추가 후 **반드시 재배포**가 필요합니다.
- WebSocket 서버가 별도로 배포되어 있어야 합니다 (Render, Railway, VPS 등).
