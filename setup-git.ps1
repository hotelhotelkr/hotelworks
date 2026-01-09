# Git 저장소 초기화 및 GitHub 설정 스크립트

Write-Host "🚀 Git 저장소 초기화 시작..." -ForegroundColor Cyan

# Git 설치 확인
try {
    $gitVersion = git --version
    Write-Host "✅ Git 설치 확인: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git이 설치되어 있지 않습니다." -ForegroundColor Red
    Write-Host "📥 Git 설치: https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}

# Git 초기화
if (Test-Path .git) {
    Write-Host "⚠️ 이미 Git 저장소가 초기화되어 있습니다." -ForegroundColor Yellow
} else {
    git init
    Write-Host "✅ Git 저장소 초기화 완료" -ForegroundColor Green
}

# 기본 브랜치를 main으로 설정
git branch -M main

# 모든 파일 추가
Write-Host "📦 파일 추가 중..." -ForegroundColor Cyan
git add .

# 초기 커밋
Write-Host "💾 초기 커밋 생성 중..." -ForegroundColor Cyan
$commitMessage = "Initial commit: HotelWorks 프로젝트 최적화 완료"
git commit -m $commitMessage

Write-Host ""
Write-Host "✅ Git 저장소 초기화 완료!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 다음 단계:" -ForegroundColor Cyan
Write-Host "1. GitHub에서 새 저장소 생성 (https://github.com/new)" -ForegroundColor White
Write-Host "2. 다음 명령어 실행:" -ForegroundColor White
Write-Host "   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git" -ForegroundColor Yellow
Write-Host "   git push -u origin main" -ForegroundColor Yellow
Write-Host ""

