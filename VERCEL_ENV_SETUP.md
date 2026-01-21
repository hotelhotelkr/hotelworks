# 🚀 Vercel 환경 변수 자동 설정 가이드

## 방법 1: Vercel API 사용 (자동화)

### 1단계: Vercel 토큰 생성

1. **Vercel Dashboard** 접속: https://vercel.com/account/tokens
2. **Create Token** 클릭
3. 토큰 이름 입력 (예: `hotelworks-deploy`)
4. **Create** 클릭
5. 토큰 복사 (한 번만 표시됨!)

### 2단계: 환경 변수 설정

**PowerShell에서:**
```powershell
# 토큰 설정
$env:VERCEL_TOKEN="your-token-here"

# 스크립트 실행
node set-vercel-env-api.js
```

**또는 직접 입력:**
```powershell
# 토큰과 함께 실행
$env:VERCEL_TOKEN="your-token"; node set-vercel-env-api.js
```

## 방법 2: Vercel Dashboard 사용 (수동, 가장 확실)

1. **Vercel Dashboard** 접속: https://vercel.com/dashboard
2. **HotelWorks 프로젝트** 선택
3. **Settings** > **Environment Variables** 클릭
4. 다음 변수들을 **모두 추가** (Production, Preview, Development 각각):

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

## 방법 3: Vercel CLI 사용 (대화형)

```bash
# Vercel 로그인
vercel login

# 환경 변수 추가 (각각 실행)
echo "https://pnmkclrwmbmzrocyygwq.supabase.co" | vercel env add SUPABASE_URL production
echo "https://pnmkclrwmbmzrocyygwq.supabase.co" | vercel env add SUPABASE_URL preview
echo "https://pnmkclrwmbmzrocyygwq.supabase.co" | vercel env add SUPABASE_URL development

echo "sb_publishable_WdzcqWms_a8Cq623qNPWwQ_okBbp28Q" | vercel env add SUPABASE_ANON_KEY production
echo "sb_publishable_WdzcqWms_a8Cq623qNPWwQ_okBbp28Q" | vercel env add SUPABASE_ANON_KEY preview
echo "sb_publishable_WdzcqWms_a8Cq623qNPWwQ_okBbp28Q" | vercel env add SUPABASE_ANON_KEY development

echo "sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i" | vercel env add SUPABASE_SERVICE_ROLE_KEY production
echo "sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i" | vercel env add SUPABASE_SERVICE_ROLE_KEY preview
echo "sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i" | vercel env add SUPABASE_SERVICE_ROLE_KEY development

echo "wss://hotelworks.kr" | vercel env add VITE_WS_SERVER_URL production
echo "wss://hotelworks.kr" | vercel env add VITE_WS_SERVER_URL preview
echo "wss://hotelworks.kr" | vercel env add VITE_WS_SERVER_URL development
```

## ✅ 확인

설정 완료 후:
1. Vercel Dashboard에서 환경 변수 확인
2. 프로젝트 재배포
3. 배포 로그에서 환경 변수 적용 확인

---

**가장 빠른 방법: 방법 2 (Vercel Dashboard)** - 약 2분 소요
