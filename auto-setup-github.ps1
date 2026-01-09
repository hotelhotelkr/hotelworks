# 완전 자동화 GitHub 설정 스크립트
# 이 스크립트는 Git 설치, 초기화, GitHub 저장소 생성을 자동으로 수행합니다.

$ErrorActionPreference = "Stop"

Write-Host "🚀 HotelWorks GitHub 자동 설정 시작..." -ForegroundColor Cyan
Write-Host ""

# 1. Git 설치 확인 및 설치
Write-Host "📦 1단계: Git 설치 확인..." -ForegroundColor Yellow
try {
    $gitVersion = git --version 2>&1
    Write-Host "✅ Git이 이미 설치되어 있습니다: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Git이 설치되어 있지 않습니다. 자동 설치를 시도합니다..." -ForegroundColor Yellow
    
    # Winget을 사용한 Git 설치 시도
    try {
        Write-Host "📥 Winget을 통해 Git 설치 중..." -ForegroundColor Cyan
        winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements --silent
        Write-Host "✅ Git 설치 완료. 터미널을 재시작한 후 다시 실행해주세요." -ForegroundColor Green
        Write-Host "   또는 수동으로 설치: https://git-scm.com/download/win" -ForegroundColor Yellow
        exit 0
    } catch {
        Write-Host "❌ 자동 설치 실패. 수동 설치가 필요합니다." -ForegroundColor Red
        Write-Host "   다운로드: https://git-scm.com/download/win" -ForegroundColor Yellow
        exit 1
    }
}

# 2. Git 초기화
Write-Host ""
Write-Host "📦 2단계: Git 저장소 초기화..." -ForegroundColor Yellow

if (Test-Path .git) {
    Write-Host "⚠️ 이미 Git 저장소가 초기화되어 있습니다." -ForegroundColor Yellow
    $overwrite = Read-Host "기존 저장소를 사용하시겠습니까? (Y/N)"
    if ($overwrite -ne "Y" -and $overwrite -ne "y") {
        Write-Host "작업을 취소했습니다." -ForegroundColor Yellow
        exit 0
    }
} else {
    git init | Out-Null
    Write-Host "✅ Git 저장소 초기화 완료" -ForegroundColor Green
}

# 기본 브랜치 설정
git branch -M main 2>&1 | Out-Null

# 3. 파일 추가
Write-Host ""
Write-Host "📦 3단계: 파일 추가..." -ForegroundColor Yellow
git add .
Write-Host "✅ 파일 추가 완료" -ForegroundColor Green

# 4. 초기 커밋
Write-Host ""
Write-Host "📦 4단계: 초기 커밋 생성..." -ForegroundColor Yellow
$commitMessage = "Initial commit: HotelWorks 프로젝트 최적화 완료"
git commit -m $commitMessage 2>&1 | Out-Null
Write-Host "✅ 커밋 완료: $commitMessage" -ForegroundColor Green

# 5. GitHub CLI 확인
Write-Host ""
Write-Host "📦 5단계: GitHub CLI 확인..." -ForegroundColor Yellow
try {
    $ghVersion = gh --version 2>&1
    Write-Host "✅ GitHub CLI 설치 확인됨" -ForegroundColor Green
} catch {
    Write-Host "⚠️ GitHub CLI가 설치되어 있지 않습니다." -ForegroundColor Yellow
    Write-Host "   설치: https://cli.github.com/" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📝 수동 설정 방법:" -ForegroundColor Cyan
    Write-Host "   1. GitHub에서 저장소 생성: https://github.com/new" -ForegroundColor White
    Write-Host "   2. 다음 명령어 실행:" -ForegroundColor White
    Write-Host "      git remote add origin https://github.com/YOUR_USERNAME/hotelworks.git" -ForegroundColor Yellow
    Write-Host "      git push -u origin main" -ForegroundColor Yellow
    exit 0
}

# 6. GitHub 인증 확인
Write-Host ""
Write-Host "📦 6단계: GitHub 인증 확인..." -ForegroundColor Yellow
try {
    gh auth status 2>&1 | Out-Null
    Write-Host "✅ GitHub 인증 완료" -ForegroundColor Green
} catch {
    Write-Host "⚠️ GitHub 인증이 필요합니다." -ForegroundColor Yellow
    Write-Host "🔐 GitHub 인증을 시작합니다..." -ForegroundColor Cyan
    gh auth login
}

# 7. GitHub 저장소 생성
Write-Host ""
Write-Host "📦 7단계: GitHub 저장소 생성..." -ForegroundColor Yellow
$repoName = "hotelworks"
$repoExists = gh repo view $repoName --json name -q .name 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "⚠️ 저장소 '$repoName'가 이미 존재합니다." -ForegroundColor Yellow
    $useExisting = Read-Host "기존 저장소를 사용하시겠습니까? (Y/N)"
    if ($useExisting -eq "Y" -or $useExisting -eq "y") {
        git remote add origin "https://github.com/$(gh api user --jq .login)/$repoName.git" 2>&1 | Out-Null
        Write-Host "✅ 기존 저장소에 연결했습니다." -ForegroundColor Green
    } else {
        $repoName = Read-Host "새 저장소 이름을 입력하세요"
    }
}

if (-not (git remote get-url origin 2>&1)) {
    Write-Host "📤 GitHub 저장소 생성 및 푸시 중..." -ForegroundColor Cyan
    gh repo create $repoName --public --source=. --remote=origin --push 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "🎉 성공! GitHub 저장소가 생성되고 푸시되었습니다!" -ForegroundColor Green
        Write-Host "🔗 저장소 URL: https://github.com/$(gh api user --jq .login)/$repoName" -ForegroundColor Cyan
    } else {
        Write-Host "❌ 저장소 생성 실패. 수동으로 진행해주세요." -ForegroundColor Red
        Write-Host "   gh repo create $repoName --public --source=. --remote=origin --push" -ForegroundColor Yellow
    }
} else {
    Write-Host "✅ 이미 원격 저장소가 설정되어 있습니다." -ForegroundColor Green
    $push = Read-Host "푸시하시겠습니까? (Y/N)"
    if ($push -eq "Y" -or $push -eq "y") {
        git push -u origin main
        Write-Host "✅ 푸시 완료!" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "✨ 모든 작업이 완료되었습니다!" -ForegroundColor Green

