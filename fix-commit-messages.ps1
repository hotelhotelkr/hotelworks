# Git 커밋 메시지 한글 깨짐 수정 스크립트
# 최근 20개 커밋의 메시지를 UTF-8로 재작성

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Git 커밋 메시지 한글 깨짐 수정" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# 현재 브랜치 확인
$currentBranch = git branch --show-current
Write-Host "현재 브랜치: $currentBranch" -ForegroundColor Yellow
Write-Host ""

# 백업 브랜치 생성
$backupBranch = "backup-before-rebase-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Write-Host "백업 브랜치 생성: $backupBranch" -ForegroundColor Yellow
git branch $backupBranch
Write-Host "✅ 백업 완료" -ForegroundColor Green
Write-Host ""

# 최근 커밋 확인
Write-Host "최근 커밋 목록:" -ForegroundColor Yellow
git log --oneline -20
Write-Host ""

Write-Host "⚠️  주의사항:" -ForegroundColor Red
Write-Host "1. 이 작업은 Git 히스토리를 재작성합니다" -ForegroundColor Yellow
Write-Host "2. 협업 중이라면 다른 사람과 상의 후 진행하세요" -ForegroundColor Yellow
Write-Host "3. 백업 브랜치가 생성되었습니다: $backupBranch" -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "계속하시겠습니까? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "취소되었습니다." -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Rebase 시작..." -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "편집기가 열리면, 수정할 커밋 앞의 'pick'을 'reword'로 변경하세요" -ForegroundColor Yellow
Write-Host "저장 후 종료하면 각 커밋의 메시지를 수정할 수 있습니다" -ForegroundColor Yellow
Write-Host ""

# Git 편집기 설정 (한글 입력 가능하도록)
$env:GIT_EDITOR = "code --wait"  # VS Code 사용 시
# $env:GIT_EDITOR = "notepad"    # 메모장 사용 시

# Rebase 시작
git rebase -i HEAD~20

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
    Write-Host "✅ Rebase 완료!" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
    Write-Host ""
    Write-Host "다음 명령어로 강제 푸시하세요:" -ForegroundColor Yellow
    Write-Host "  git push --force-with-lease" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "문제가 발생하면 백업 브랜치로 복구:" -ForegroundColor Yellow
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
