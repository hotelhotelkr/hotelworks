# 로그인 디버깅 강화 - 공백 처리 및 상세 로그 추가

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  로그인 디버깅 강화" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

git add components/Login.tsx
git commit -m "Fix: 로그인 디버깅 강화 - 공백 처리 및 상세 로그

- username/password 비교 시 trim() 추가 (공백 제거)
- 로그인 시도 시 각 사용자와 상세 비교 로그 출력
- username 매칭 상태 표시 (✅/⚠️/❌)
- 비슷한 username 자동 감지 (대소문자 차이)
- 입력값과 저장된 값의 길이 및 공백 정보 출력"

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
        Write-Host "  1. 모바일에서 https://hotelworks.vercel.app/ 접속" -ForegroundColor Yellow
        Write-Host "  2. 개발자 도구 콘솔 열기" -ForegroundColor Yellow
        Write-Host "  3. 로미오/줄리엣으로 로그인 시도" -ForegroundColor Yellow
        Write-Host "  4. 콘솔에서 상세 비교 로그 확인:" -ForegroundColor Yellow
        Write-Host "     - 입력한 username/password 값" -ForegroundColor Gray
        Write-Host "     - 각 사용자와의 매칭 상태 (✅/⚠️/❌)" -ForegroundColor Gray
        Write-Host "     - username 매칭 여부" -ForegroundColor Gray
        Write-Host "     - password 매칭 여부" -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host "❌ 푸시 실패" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ 커밋 실패" -ForegroundColor Red
    exit 1
}
