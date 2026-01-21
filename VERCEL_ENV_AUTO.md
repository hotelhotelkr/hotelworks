# ⚡ Vercel 환경 변수 자동 설정 (지금 바로!)

## 🚀 방법 1: Vercel Dashboard (가장 빠름, 2분)

**지금 바로 하세요:**

1. **브라우저 열기**: https://vercel.com/dashboard
2. **HotelWorks 프로젝트** 클릭
3. **Settings** > **Environment Variables**
4. 아래 4개 변수를 **빠르게 복사하여 추가**:

```
SUPABASE_URL = https://pnmkclrwmbmzrocyygwq.supabase.co
SUPABASE_ANON_KEY = sb_publishable_WdzcqWms_a8Cq623qNPWwQ_okBbp28Q
SUPABASE_SERVICE_ROLE_KEY = sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i
VITE_WS_SERVER_URL = wss://hotelworks.kr
```

**각 변수마다:**
- Key와 Value 입력
- ✅ Production ✅ Preview ✅ Development 모두 체크
- **Add** 클릭

5. **Save** 클릭
6. **Deployments** > 최신 배포 > **...** > **Redeploy**

**완료!** ✅

---

## 🤖 방법 2: 자동화 스크립트 (토큰 필요)

Vercel 토큰이 있다면 자동으로 설정됩니다:

```powershell
# 1. 토큰 생성 (한 번만): https://vercel.com/account/tokens
# 2. 토큰 설정
$env:VERCEL_TOKEN="여기에_토큰_붙여넣기"

# 3. 자동 설정
node auto-set-vercel-env.js
```

---

**추천: 방법 1** - 더 빠르고 확실합니다! ⚡
