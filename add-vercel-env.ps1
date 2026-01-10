# Vercel 환경 변수 추가 스크립트

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Vercel 환경 변수 추가" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# 환경 변수 설정
$envName = "VITE_WS_SERVER_URL"
$envValue = "https://hotelworks-backend.onrender.com"

Write-Host "[1/2] 환경 변수 추가 중..." -ForegroundColor Yellow
Write-Host "  Key: $envName" -ForegroundColor Gray
Write-Host "  Value: $envValue" -ForegroundColor Gray
Write-Host ""

# Vercel CLI로 환경 변수 추가
# Production, Preview, Development 환경 모두에 적용
vercel env add $envName production

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 환경 변수 추가 성공!" -ForegroundColor Green
} else {
    Write-Host "❌ 환경 변수 추가 실패" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[2/2] 새 배포 트리거..." -ForegroundColor Yellow
vercel --prod

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 배포 성공!" -ForegroundColor Green
} else {
    Write-Host "❌ 배포 실패" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  완료!" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "백엔드 URL이 프론트엔드에 연결되었습니다." -ForegroundColor Green
Write-Host "사이트: https://hotelworks.vercel.app/" -ForegroundColor Cyan
Write-Host ""
