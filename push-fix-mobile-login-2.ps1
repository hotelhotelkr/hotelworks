# 모바일 로그인 문제 추가 수정 푸시

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  모바일 로그인 문제 추가 수정" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

git add App.tsx components/Login.tsx
git commit -m "Fix: 모바일 로그인 문제 추가 수정 - localStorage 주기적 동기화

- 로그인 화면에서 localStorage의 users를 주기적으로 확인 (2초마다)
- WebSocket 연결 문제가 있어도 localStorage에서 최신 users 로드
- Login 컴포넌트에 디버깅 로그 추가
- 로그인 시도 시 availableUsers 확인 로그 출력"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 커밋 성공!" -ForegroundColor Green
    Write-Host ""
    Write-Host "[2/2] GitHub에 푸시 중..." -ForegroundColor Yellow
    git push origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 푸시 성공!" -ForegroundColor Green
        Write-Host ""
        Write-Host "================================" -ForegroundColor Cyan
        Write-Host "  완료!" -ForegroundColor Cyan
        Write-Host "================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Vercel에서 자동으로 재배포됩니다." -ForegroundColor Green
        Write-Host "배포 완료 후 모바일에서 테스트해보세요:" -ForegroundColor Cyan
        Write-Host "  1. 모바일 브라우저에서 https://hotelworks.vercel.app/ 접속" -ForegroundColor Yellow
        Write-Host "  2. 개발자 도구 콘솔 열기 (모바일 브라우저 앱 사용 가능)" -ForegroundColor Yellow
        Write-Host "  3. 로그인 시도 시 콘솔에서 availableUsers 확인" -ForegroundColor Yellow
        Write-Host ""
    } else {
        Write-Host "❌ 푸시 실패" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ 커밋 실패" -ForegroundColor Red
    exit 1
}
