# HotelWorks - Complete GitHub Setup

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🏨 HotelWorks GitHub Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Git 초기화
Write-Host "[1/8] Git 초기화..." -ForegroundColor Green
if (Test-Path .git) {
    Write-Host "⚠️  Git already initialized, skipping..." -ForegroundColor Yellow
} else {
    git init
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Git 초기화 완료" -ForegroundColor Green
    } else {
        Write-Host "❌ Git 초기화 실패!" -ForegroundColor Red
        exit 1
    }
}
Write-Host ""

# 2. Git 사용자 설정
Write-Host "[2/8] Git 사용자 설정..." -ForegroundColor Green
git config user.name "HotelWorks"
git config user.email "hotelhotel.kr@gmail.com"
Write-Host "✅ 사용자: HotelWorks" -ForegroundColor Green
Write-Host "✅ 이메일: hotelhotel.kr@gmail.com" -ForegroundColor Green
Write-Host ""

# 3. 파일 추가
Write-Host "[3/8] 파일 추가 중..." -ForegroundColor Green
git add .
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 모든 파일 추가 완료" -ForegroundColor Green
} else {
    Write-Host "❌ 파일 추가 실패!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 4. 상태 확인
Write-Host "[4/8] 추가된 파일 확인..." -ForegroundColor Green
$status = git status --short | Measure-Object -Line
Write-Host "📦 총 $($status.Lines)개 파일 추가됨" -ForegroundColor Cyan
Write-Host ""

# 5. 커밋
Write-Host "[5/8] 커밋 생성 중..." -ForegroundColor Green
git commit -m "feat: Complete HotelWorks - Real-time Order Management System

✨ Features:
- Real-time order synchronization via WebSocket
- MySQL database integration
- Front Desk & Housekeeping collaboration
- Simplified Settings UI for general users
- Advanced settings for developers
- Order management with status tracking
- Memo system for inter-department communication
- Push notifications & toast alerts
- Mobile optimization (Capacitor ready)
- Offline queue support
- Auto WebSocket URL detection

🛠 Tech Stack:
- React + TypeScript + Vite
- Node.js + Express + Socket.IO
- MySQL + phpMyAdmin
- Tailwind CSS
- Capacitor (Mobile)

🎯 Optimizations:
- Removed duplicate notifications
- Simplified Settings UI
- Auto-detect WebSocket URL
- Conditional console logging
- Enhanced error handling"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 커밋 완료" -ForegroundColor Green
} else {
    Write-Host "❌ 커밋 실패!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 6. main 브랜치로 변경
Write-Host "[6/8] main 브랜치로 변경..." -ForegroundColor Green
git branch -M main
Write-Host "✅ 브랜치: main" -ForegroundColor Green
Write-Host ""

# 7. 커밋 로그 확인
Write-Host "[7/8] 커밋 확인..." -ForegroundColor Green
git log --oneline -1
Write-Host ""

# 8. README 업데이트 확인
Write-Host "[8/8] 프로젝트 파일 확인..." -ForegroundColor Green
if (Test-Path README.md) {
    Write-Host "✅ README.md 존재" -ForegroundColor Green
}
if (Test-Path package.json) {
    Write-Host "✅ package.json 존재" -ForegroundColor Green
}
if (Test-Path .gitignore) {
    Write-Host "✅ .gitignore 존재" -ForegroundColor Green
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🎉 Git 설정 완료!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📝 다음 단계:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1️⃣ GitHub 접속:" -ForegroundColor White
Write-Host "   https://github.com/new" -ForegroundColor Cyan
Write-Host ""
Write-Host "2️⃣ 저장소 생성:" -ForegroundColor White
Write-Host "   Repository name: hotelworks" -ForegroundColor Cyan
Write-Host "   Description: 🏨 Real-time Hotel Order Management System" -ForegroundColor Cyan
Write-Host "   Public 또는 Private 선택" -ForegroundColor Cyan
Write-Host "   ❌ Initialize 체크 해제!" -ForegroundColor Red
Write-Host ""
Write-Host "3️⃣ 생성 후 아래 명령어 실행:" -ForegroundColor White
Write-Host ""
Write-Host "   git remote add origin https://github.com/[사용자명]/hotelworks.git" -ForegroundColor Yellow
Write-Host "   git push -u origin main" -ForegroundColor Yellow
Write-Host ""
Write-Host "💡 TIP: GitHub 사용자명 확인 방법:" -ForegroundColor Cyan
Write-Host "   GitHub 접속 → 우측 상단 프로필 클릭 → Signed in as [사용자명]" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

Read-Host "Press Enter to exit"
