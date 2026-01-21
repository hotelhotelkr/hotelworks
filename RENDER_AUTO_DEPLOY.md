# 🚀 Render 자동 배포 가이드

## ✅ 준비 완료

- ✅ `render.yaml` 파일 업데이트 완료
- ✅ GitHub 푸시 완료
- ✅ 환경 변수 설정 파일 준비 완료

## ⚡ Render Dashboard에서 배포 (3분)

### 방법 1: Blueprint 사용 (자동, 권장)

1. **Render Dashboard** 접속: https://dashboard.render.com
2. **New** > **Blueprint** 클릭
3. **GitHub 저장소 연결** (hotelworks 프로젝트)
4. Render가 `render.yaml` 파일을 자동으로 인식
5. **Apply** 클릭
6. 배포 완료 대기 (약 5분)

### 방법 2: Web Service 수동 생성

1. **Render Dashboard** 접속: https://dashboard.render.com
2. **New** > **Web Service** 클릭
3. **GitHub 저장소 연결** (hotelworks 프로젝트)
4. 설정:
   - **Name**: `hotelworks-websocket`
   - **Region**: `Singapore` (또는 가장 가까운 지역)
   - **Branch**: `main`
   - **Root Directory**: (비워두기)
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. **Environment Variables** 섹션에서 `render-env-quick.txt` 파일의 변수들 추가
6. **Create Web Service** 클릭

## 📋 환경 변수 (render-env-quick.txt 참고)

```
NODE_ENV = production
PORT = 10000
SUPABASE_URL = https://pnmkclrwmbmzrocyygwq.supabase.co
SUPABASE_ANON_KEY = sb_publishable_WdzcqWms_a8Cq623qNPWwQ_okBbp28Q
SUPABASE_SERVICE_ROLE_KEY = sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i
SERVER_URL = https://hotelworks-websocket.onrender.com
WS_SERVER_URL = wss://hotelworks-websocket.onrender.com
```

## ✅ 배포 확인

배포 완료 후:
- 서비스 URL: `https://hotelworks-websocket.onrender.com`
- Health Check: `https://hotelworks-websocket.onrender.com/health`

---

**Render Dashboard에서 Blueprint을 사용하면 자동으로 배포됩니다!** 🎉
