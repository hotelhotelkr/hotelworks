# 자동으로 커밋 메시지 수정 (최근 20개)
# 주의: 이 스크립트는 Git 히스토리를 재작성합니다

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "커밋 메시지 자동 수정 스크립트" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# 현재 상태 확인
$status = git status --porcelain
if ($status) {
    Write-Host "⚠️  작업 디렉토리에 변경사항이 있습니다!" -ForegroundColor Red
    Write-Host "먼저 커밋하거나 stash하세요." -ForegroundColor Yellow
    exit 1
}

# 백업 브랜치 생성
$backupBranch = "backup-before-rebase-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Write-Host "백업 브랜치 생성: $backupBranch" -ForegroundColor Yellow
git branch $backupBranch
Write-Host "✅ 백업 완료" -ForegroundColor Green
Write-Host ""

Write-Host "최근 커밋 목록:" -ForegroundColor Yellow
git log --oneline -20
Write-Host ""

Write-Host "⚠️  이 작업은 Git 히스토리를 재작성합니다" -ForegroundColor Red
Write-Host "백업 브랜치: $backupBranch" -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "계속하시겠습니까? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "취소되었습니다." -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "Rebase를 시작합니다..." -ForegroundColor Cyan
Write-Host "편집기가 열리면 각 커밋의 메시지를 한글로 정상 입력하세요" -ForegroundColor Yellow
Write-Host ""

# Git 편집기 설정
# VS Code가 설치되어 있으면 사용, 없으면 메모장 사용
$codePath = Get-Command code -ErrorAction SilentlyContinue
if ($codePath) {
    $env:GIT_EDITOR = "code --wait"
    Write-Host "편집기: VS Code" -ForegroundColor Green
} else {
    $env:GIT_EDITOR = "notepad"
    Write-Host "편집기: 메모장" -ForegroundColor Yellow
}

# Rebase 실행
git rebase -i HEAD~20

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
    Write-Host "✅ Rebase 완료!" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
    Write-Host ""
    Write-Host "수정된 커밋 확인:" -ForegroundColor Yellow
    git log --oneline -20
    Write-Host ""
    Write-Host "다음 명령어로 강제 푸시하세요:" -ForegroundColor Yellow
    Write-Host "  git push --force-with-lease" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "문제 발생 시 복구:" -ForegroundColor Yellow
    Write-Host "  git reset --hard $backupBranch" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Red
    Write-Host "❌ Rebase 실패 또는 취소됨" -ForegroundColor Red
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Red
    Write-Host ""
    Write-Host "복구 방법:" -ForegroundColor Yellow
    Write-Host "  git rebase --abort" -ForegroundColor Cyan
    Write-Host "  또는" -ForegroundColor Yellow
    Write-Host "  git reset --hard $backupBranch" -ForegroundColor Cyan
}
