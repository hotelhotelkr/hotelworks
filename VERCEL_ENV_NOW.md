# ⚡ Vercel 환경 변수 지금 바로 설정하기

## 🚀 가장 빠른 방법 (2분)

### 방법 1: Vercel Dashboard (가장 빠름, 추천)

1. **브라우저에서 열기**: https://vercel.com/dashboard
2. **HotelWorks 프로젝트** 클릭
3. **Settings** > **Environment Variables** 클릭
4. 다음 4개 변수를 **빠르게 추가**:

**변수 1:**
- Key: `SUPABASE_URL`
- Value: `https://pnmkclrwmbmzrocyygwq.supabase.co`
- Environment: ✅ Production ✅ Preview ✅ Development
- **Add** 클릭

**변수 2:**
- Key: `SUPABASE_ANON_KEY`
- Value: `sb_publishable_WdzcqWms_a8Cq623qNPWwQ_okBbp28Q`
- Environment: ✅ Production ✅ Preview ✅ Development
- **Add** 클릭

**변수 3:**
- Key: `SUPABASE_SERVICE_ROLE_KEY`
- Value: `sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i`
- Environment: ✅ Production ✅ Preview ✅ Development
- **Add** 클릭

**변수 4:**
- Key: `VITE_WS_SERVER_URL`
- Value: `wss://hotelworks.kr`
- Environment: ✅ Production ✅ Preview ✅ Development
- **Add** 클릭

5. **Save** 클릭
6. **Deployments** 탭 > 최신 배포 > **...** > **Redeploy**

**완료!** ✅

---

### 방법 2: 자동화 스크립트 (토큰 필요)

토큰이 있다면:

```powershell
$env:VERCEL_TOKEN="your-token-here"
node auto-set-vercel-env.js
```

**토큰 생성**: https://vercel.com/account/tokens

---

**추천: 방법 1 (Dashboard)** - 더 빠르고 확실합니다! ⚡
