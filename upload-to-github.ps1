# HotelWorks GitHub Upload Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "HotelWorks GitHub Upload Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 현재 디렉토리 확인
$currentPath = Get-Location
Write-Host "📁 Current Directory: $currentPath" -ForegroundColor Yellow
Write-Host ""

# 1. Git 초기화
Write-Host "[1/7] Git 초기화..." -ForegroundColor Green
git init
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERROR: Git 초기화 실패!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✅ Git 초기화 완료" -ForegroundColor Green
Write-Host ""

# 2. Git 사용자 설정
Write-Host "[2/7] Git 사용자 설정..." -ForegroundColor Green
git config user.name "HotelWorks Team"
git config user.email "hotelworks@example.com"
Write-Host "✅ 사용자 설정 완료" -ForegroundColor Green
Write-Host ""

# 3. 파일 추가
Write-Host "[3/7] 파일 추가 중..." -ForegroundColor Green
git add .
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERROR: 파일 추가 실패!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✅ 파일 추가 완료" -ForegroundColor Green
Write-Host ""

# 4. 상태 확인
Write-Host "[4/7] Git 상태 확인..." -ForegroundColor Green
git status --short
Write-Host ""

# 5. 커밋
Write-Host "[5/7] 커밋 생성 중..." -ForegroundColor Green
git commit -m "feat: Complete HotelWorks with real-time sync and database integration

- Real-time order synchronization (WebSocket)
- MySQL database integration  
- Front Desk & Housekeeping collaboration
- Simplified Settings UI for general users
- Advanced settings for developers
- Order management with status tracking
- Memo system for inter-department communication
- Push notifications
- Mobile optimization (Capacitor ready)
- Offline queue support
- Auto WebSocket URL detection"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERROR: 커밋 실패!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✅ 커밋 완료" -ForegroundColor Green
Write-Host ""

# 6. main 브랜치로 변경
Write-Host "[6/7] main 브랜치로 변경..." -ForegroundColor Green
git branch -M main
Write-Host "✅ 브랜치 변경 완료" -ForegroundColor Green
Write-Host ""

# 7. 로그 확인
Write-Host "[7/7] 커밋 로그 확인..." -ForegroundColor Green
git log --oneline -1
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🎉 로컬 Git 설정 완료!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 다음 단계:" -ForegroundColor Yellow
Write-Host "1. GitHub에서 새 저장소 생성" -ForegroundColor White
Write-Host "2. 저장소 URL 복사 (예: https://github.com/사용자명/hotelworks.git)" -ForegroundColor White
Write-Host "3. 아래 명령어 실행:" -ForegroundColor White
Write-Host ""
Write-Host "   git remote add origin [저장소URL]" -ForegroundColor Cyan
Write-Host "   git push -u origin main" -ForegroundColor Cyan
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Read-Host "Press Enter to continue"
