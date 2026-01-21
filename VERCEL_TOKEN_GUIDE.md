# 🔑 Vercel 토큰 생성 및 환경 변수 설정

## ⚡ 가장 빠른 방법 (2분)

### 1단계: Vercel 토큰 생성 (30초)

1. **Vercel Dashboard** 접속: https://vercel.com/account/tokens
2. **Create Token** 클릭
3. 토큰 이름 입력: `hotelworks-deploy`
4. **Create** 클릭
5. **토큰 복사** (한 번만 표시됨!)

### 2단계: 환경 변수 자동 설정 (1분)

**PowerShell에서 실행:**

```powershell
# 토큰 설정
$env:VERCEL_TOKEN="여기에_토큰_붙여넣기"

# 자동 설정 스크립트 실행
node auto-set-vercel-env.js
```

스크립트가 자동으로:
- ✅ 프로젝트 찾기
- ✅ 4개 환경 변수 설정 (Production, Preview, Development)
- ✅ 완료 메시지 표시

### 3단계: 재배포 (30초)

1. **Vercel Dashboard** 접속: https://vercel.com/dashboard
2. 프로젝트 선택
3. **Deployments** 탭
4. 최신 배포의 **...** 메뉴 > **Redeploy**

## 📋 설정되는 환경 변수

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_WS_SERVER_URL`

모든 환경 (Production, Preview, Development)에 자동 설정됩니다.

## ✅ 완료 확인

Vercel Dashboard > Settings > Environment Variables에서 확인하세요.

---

**총 소요 시간: 약 2분** ⚡
