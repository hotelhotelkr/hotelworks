# HotelWorks 완전 자동 배포 스크립트
# PowerShell에서 실행: .\deploy-all.ps1

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🚀 HotelWorks 자동 배포 시작" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

# 1. GitHub 푸시 확인
Write-Host "1️⃣ GitHub 푸시 확인..." -ForegroundColor Yellow
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "   ⚠️ 커밋되지 않은 변경사항이 있습니다." -ForegroundColor Yellow
    $commit = Read-Host "   커밋하시겠습니까? (y/n)"
    if ($commit -eq "y") {
        git add .
        git commit -m "chore: 배포 준비"
        git push
        Write-Host "   ✅ GitHub 푸시 완료`n" -ForegroundColor Green
    }
} else {
    Write-Host "   ✅ 모든 변경사항이 푸시되었습니다.`n" -ForegroundColor Green
}

# 2. Vercel 환경 변수 설정 안내
Write-Host "2️⃣ Vercel 환경 변수 설정" -ForegroundColor Yellow
Write-Host "   다음 URL에서 환경 변수를 설정하세요:" -ForegroundColor White
Write-Host "   https://vercel.com/dashboard`n" -ForegroundColor Cyan
Write-Host "   설정할 환경 변수:" -ForegroundColor White
Write-Host "   - SUPABASE_URL = https://pnmkclrwmbmzrocyygwq.supabase.co" -ForegroundColor Gray
Write-Host "   - SUPABASE_ANON_KEY = sb_publishable_WdzcqWms_a8Cq623qNPWwQ_okBbp28Q" -ForegroundColor Gray
Write-Host "   - SUPABASE_SERVICE_ROLE_KEY = sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i" -ForegroundColor Gray
Write-Host "   - VITE_WS_SERVER_URL = wss://hotelworks.kr`n" -ForegroundColor Gray

$vercelDone = Read-Host "   Vercel 환경 변수 설정을 완료하셨나요? (y/n)"
if ($vercelDone -ne "y") {
    Write-Host "   ⚠️ Vercel 환경 변수 설정 후 다시 실행하세요.`n" -ForegroundColor Yellow
    exit
}

# 3. Render 배포 안내
Write-Host "3️⃣ Render WebSocket 서버 배포" -ForegroundColor Yellow
Write-Host "   다음 URL에서 WebSocket 서버를 배포하세요:" -ForegroundColor White
Write-Host "   https://render.com`n" -ForegroundColor Cyan
Write-Host "   배포 설정:" -ForegroundColor White
Write-Host "   - Name: hotelworks-websocket" -ForegroundColor Gray
Write-Host "   - Build Command: npm install" -ForegroundColor Gray
Write-Host "   - Start Command: node server.js`n" -ForegroundColor Gray

$renderDone = Read-Host "   Render 배포를 완료하셨나요? (y/n)"
if ($renderDone -ne "y") {
    Write-Host "   ⚠️ Render 배포 후 다시 실행하세요.`n" -ForegroundColor Yellow
    exit
}

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ 배포 준비 완료!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan
Write-Host "다음 단계:" -ForegroundColor Yellow
Write-Host "1. Vercel Dashboard에서 프로젝트 재배포" -ForegroundColor White
Write-Host "2. https://hotelworks.kr 접속 테스트`n" -ForegroundColor White
