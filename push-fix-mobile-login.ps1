# 모바일 로그인 실시간 동기화 수정 푸시

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  모바일 로그인 동기화 수정" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

git add App.tsx
git commit -m "Fix: 실시간 직원 정보 동기화 - 로그아웃 상태에서도 users 업데이트

- 로그인/로그아웃 상태 모두에서 USER_ADD/UPDATE/DELETE 메시지 처리
- 모바일 로그인 화면에서도 새로운 직원 추가 시 실시간 동기화
- localStorage에 users 저장하여 앱 재시작 시에도 유지
- handleAddUser/UpdateUser/DeleteUser에서도 localStorage 저장 추가"

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
        Write-Host "배포 완료 후 모바일에서 새로운 직원으로 로그인 가능합니다." -ForegroundColor Cyan
    } else {
        Write-Host "❌ 푸시 실패" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ 커밋 실패" -ForegroundColor Red
    exit 1
}
