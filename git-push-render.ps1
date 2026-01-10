# Render 배포를 위한 Git Push 스크립트

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Render 배포 파일 업로드" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# 현재 디렉토리 확인
$currentDir = Get-Location
Write-Host "[1/4] 현재 디렉토리: $currentDir" -ForegroundColor Green

# Git add
Write-Host ""
Write-Host "[2/4] Git add..." -ForegroundColor Yellow
git add render.yaml RENDER_DEPLOYMENT.md
Write-Host "Done" -ForegroundColor Green

# Git status 확인
Write-Host ""
Write-Host "[3/4] Git status..." -ForegroundColor Yellow
git status
Write-Host ""

# Commit
Write-Host "[4/4] Git commit and push..." -ForegroundColor Yellow
$commitMessage = "Add Render deployment configuration"
git commit -m $commitMessage

if ($LASTEXITCODE -eq 0) {
    Write-Host "Commit 성공!" -ForegroundColor Green
    Write-Host ""
    Write-Host "GitHub에 푸시 중..." -ForegroundColor Yellow
    git push origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "================================" -ForegroundColor Green
        Write-Host "  ✅ 푸시 성공!" -ForegroundColor Green
        Write-Host "================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "다음 단계:" -ForegroundColor Cyan
        Write-Host "1. https://render.com 접속" -ForegroundColor White
        Write-Host "2. New → Web Service 클릭" -ForegroundColor White
        Write-Host "3. GitHub 저장소 연결" -ForegroundColor White
        Write-Host "4. RENDER_DEPLOYMENT.md 가이드 참고" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "❌ 푸시 실패" -ForegroundColor Red
        Write-Host "에러 코드: $LASTEXITCODE" -ForegroundColor Red
    }
} else {
    Write-Host ""
    Write-Host "ℹ️ 커밋할 변경사항이 없거나 이미 커밋됨" -ForegroundColor Yellow
    Write-Host "GitHub에 푸시 시도..." -ForegroundColor Yellow
    git push origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ 푸시 완료!" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
