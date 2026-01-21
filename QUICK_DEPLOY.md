# ⚡ 빠른 배포 가이드 (5분 완성)

## ✅ 1단계: Vercel 환경 변수 (2분)

1. https://vercel.com/dashboard 접속
2. 프로젝트 선택 > **Settings** > **Environment Variables**
3. 다음 4개 변수 추가 (모든 환경):

```
SUPABASE_URL = https://pnmkclrwmbmzrocyygwq.supabase.co
SUPABASE_ANON_KEY = sb_publishable_WdzcqWms_a8Cq623qNPWwQ_okBbp28Q
SUPABASE_SERVICE_ROLE_KEY = sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i
VITE_WS_SERVER_URL = wss://hotelworks.kr
```

4. **Save** > **Deployments** > **Redeploy**

## ✅ 2단계: Render WebSocket 서버 (3분)

1. https://render.com 접속
2. **New** > **Web Service**
3. GitHub 저장소 연결
4. 설정:
   - Name: `hotelworks-websocket`
   - Build: `npm install`
   - Start: `node server.js`
5. 환경 변수 추가:
   ```
   NODE_ENV=production
   PORT=10000
   SUPABASE_URL=https://pnmkclrwmbmzrocyygwq.supabase.co
   SUPABASE_ANON_KEY=sb_publishable_WdzcqWms_a8Cq623qNPWwQ_okBbp28Q
   SUPABASE_SERVICE_ROLE_KEY=sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i
   SERVER_URL=https://hotelworks-websocket.onrender.com
   WS_SERVER_URL=wss://hotelworks-websocket.onrender.com
   ```
6. **Create Web Service**

## ✅ 3단계: 도메인 연결 (선택사항)

- Vercel: `hotelworks.kr` 추가
- Render: `ws.hotelworks.kr` 추가 (선택)

**완료!** 🎉
