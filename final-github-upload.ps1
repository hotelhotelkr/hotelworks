# HotelWorks - Complete GitHub Upload
# User: hotelhotelkr

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "HotelWorks - GitHub Upload" -ForegroundColor Cyan
Write-Host "   User: hotelhotelkr" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Git 초기화
Write-Host "[1/9] Git 초기화..." -ForegroundColor Green
if (Test-Path .git) {
    Write-Host "⚠️  이미 초기화됨" -ForegroundColor Yellow
} else {
    git init
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 완료" -ForegroundColor Green
    } else {
        Write-Host "❌ 실패!" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}
Write-Host ""

# 2. Git 사용자 설정
Write-Host "[2/9] Git 사용자 설정..." -ForegroundColor Green
git config user.name "HotelWorks"
git config user.email "hotelhotel.kr@gmail.com"
Write-Host "✅ 완료" -ForegroundColor Green
Write-Host ""

# 3. 파일 추가
Write-Host "[3/9] 파일 추가 중..." -ForegroundColor Green
git add .
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 완료" -ForegroundColor Green
} else {
    Write-Host "❌ 실패!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# 4. 커밋
Write-Host "[4/9] 커밋 생성..." -ForegroundColor Green
git commit -m "feat: Complete HotelWorks - Real-time Order Management System

✨ Features:
- Real-time order synchronization via WebSocket
- MySQL database integration
- Front Desk & Housekeeping collaboration
- Simplified Settings UI for general users
- Order management with status tracking
- Memo system & push notifications
- Mobile optimization (Capacitor ready)
- Offline queue support

🛠 Tech Stack:
- React + TypeScript + Vite
- Node.js + Express + Socket.IO
- MySQL + phpMyAdmin
- Tailwind CSS

🎯 Optimizations:
- Auto-detect WebSocket URL
- Conditional console logging
- Enhanced error handling" > $null 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 완료" -ForegroundColor Green
} else {
    Write-Host "❌ 실패!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# 5. main 브랜치로 변경
Write-Host "[5/9] main 브랜치 설정..." -ForegroundColor Green
git branch -M main
Write-Host "✅ 완료" -ForegroundColor Green
Write-Host ""

# 6. 원격 저장소 확인
Write-Host "[6/9] 원격 저장소 확인..." -ForegroundColor Green
$remotes = git remote
if ($remotes -contains "origin") {
    Write-Host "⚠️  origin이 이미 존재합니다. 제거 후 재설정..." -ForegroundColor Yellow
    git remote remove origin
}
Write-Host "✅ 완료" -ForegroundColor Green
Write-Host ""

# 7. 원격 저장소 연결
Write-Host "[7/9] GitHub 저장소 연결..." -ForegroundColor Green
git remote add origin https://github.com/hotelhotelkr/hotelworks.git
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 완료: https://github.com/hotelhotelkr/hotelworks.git" -ForegroundColor Green
} else {
    Write-Host "❌ 실패!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# 8. 연결 확인
Write-Host "[8/9] 연결 확인..." -ForegroundColor Green
git remote -v
Write-Host ""

# 9. Push 준비
Write-Host "[9/9] Push 준비 완료!" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ 준비 완료!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 확인 사항:" -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ Git 저장소 초기화" -ForegroundColor Green
Write-Host "✅ 모든 파일 커밋" -ForegroundColor Green
Write-Host "✅ main 브랜치 설정" -ForegroundColor Green
Write-Host "✅ GitHub 저장소 연결" -ForegroundColor Green
Write-Host "   -> https://github.com/hotelhotelkr/hotelworks" -ForegroundColor Cyan
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "마지막 단계" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. GitHub에서 저장소 생성:" -ForegroundColor White
Write-Host "   -> https://github.com/new" -ForegroundColor Cyan
Write-Host "   Repository name: hotelworks" -ForegroundColor White
Write-Host "   [X] Initialize 옵션 체크 해제!" -ForegroundColor Red
Write-Host ""

Write-Host "2. 저장소 생성 후 아래 명령어 실행:" -ForegroundColor White
Write-Host ""
Write-Host "   git push -u origin main" -ForegroundColor Yellow
Write-Host ""

Write-Host "[TIP] 인증 요청 시:" -ForegroundColor Cyan
Write-Host "   - GitHub 사용자명: hotelhotelkr" -ForegroundColor White
Write-Host "   - Password: Personal Access Token 사용" -ForegroundColor White
Write-Host "   (Settings - Developer settings - Tokens)" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan

Read-Host "Press Enter to exit"
