# Vercel 환경 변수 자동 설정 스크립트

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🚀 Vercel 환경 변수 설정" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

# Vercel 로그인 확인
Write-Host "1️⃣ Vercel 로그인 확인..." -ForegroundColor Yellow
try {
    $whoami = vercel whoami 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ 로그인됨: $whoami`n" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️ 로그인이 필요합니다." -ForegroundColor Yellow
        Write-Host "   Vercel 로그인을 진행합니다...`n" -ForegroundColor Yellow
        vercel login
    }
} catch {
    Write-Host "   ⚠️ Vercel CLI 오류: $_" -ForegroundColor Red
    Write-Host "   수동으로 로그인하세요: vercel login`n" -ForegroundColor Yellow
    exit 1
}

# 환경 변수 설정
Write-Host "2️⃣ 환경 변수 설정 중...`n" -ForegroundColor Yellow

$envVars = @{
    "SUPABASE_URL" = "https://pnmkclrwmbmzrocyygwq.supabase.co"
    "SUPABASE_ANON_KEY" = "sb_publishable_WdzcqWms_a8Cq623qNPWwQ_okBbp28Q"
    "SUPABASE_SERVICE_ROLE_KEY" = "sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i"
    "VITE_WS_SERVER_URL" = "wss://hotelworks.kr"
}

$environments = @("production", "preview", "development")

foreach ($key in $envVars.Keys) {
    $value = $envVars[$key]
    Write-Host "   설정 중: $key" -ForegroundColor White
    
    foreach ($env in $environments) {
        try {
            # Vercel CLI는 대화형 입력을 요구하므로, echo를 사용하여 값을 전달
            $value | vercel env add $key $env --force 2>&1 | Out-Null
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "      ✅ $env" -ForegroundColor Green
            } else {
                Write-Host "      ⚠️ $env (이미 존재할 수 있음)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "      ⚠️ $env: $_" -ForegroundColor Yellow
        }
    }
    Write-Host ""
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ 환경 변수 설정 완료!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

Write-Host "💡 다음 단계:" -ForegroundColor Yellow
Write-Host "   1. Vercel Dashboard에서 환경 변수 확인" -ForegroundColor White
Write-Host "   2. 프로젝트 재배포`n" -ForegroundColor White
