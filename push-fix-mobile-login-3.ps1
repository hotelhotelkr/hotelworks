# 모바일 로그인 문제 추가 수정 - localStorage 동기화 개선

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  모바일 로그인 문제 추가 수정" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

git add App.tsx components/Login.tsx
git commit -m "Fix: 모바일 로그인 문제 - localStorage 동기화 로직 개선

- localStorage 동기화 주기 1초로 단축 (더 빠른 반응)
- 사용자 정보 비교 로직 개선 (username, password, name, dept, role 모두 비교)
- Login 컴포넌트 마운트 시 availableUsers 로그 출력
- localStorage users 상세 로그 추가"

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
        Write-Host ""
        Write-Host "📋 모바일 테스트 방법:" -ForegroundColor Cyan
        Write-Host "  1. PC에서 Admin으로 로그인 후 로미오, 줄리엣 추가" -ForegroundColor Yellow
        Write-Host "  2. 모바일에서 https://hotelworks.vercel.app/ 접속" -ForegroundColor Yellow
        Write-Host "  3. 개발자 도구 콘솔 열기 (1초마다 localStorage 동기화 로그 확인)" -ForegroundColor Yellow
        Write-Host "  4. 로미오, 줄리엣으로 로그인 시도" -ForegroundColor Yellow
        Write-Host ""
    } else {
        Write-Host "❌ 푸시 실패" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ 커밋 실패" -ForegroundColor Red
    exit 1
}
