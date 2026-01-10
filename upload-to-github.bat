@echo off
echo ========================================
echo HotelWorks GitHub Upload Script
echo ========================================
echo.

cd /d "%~dp0"

echo [1/7] Git 초기화...
git init
if errorlevel 1 (
    echo ERROR: Git 초기화 실패!
    pause
    exit /b 1
)
echo ✅ Git 초기화 완료
echo.

echo [2/7] Git 사용자 설정...
git config user.name "HotelWorks Team"
git config user.email "hotelworks@example.com"
echo ✅ 사용자 설정 완료
echo.

echo [3/7] 파일 추가 중...
git add .
if errorlevel 1 (
    echo ERROR: 파일 추가 실패!
    pause
    exit /b 1
)
echo ✅ 파일 추가 완료
echo.

echo [4/7] 커밋 생성 중...
git commit -m "feat: Complete HotelWorks with real-time sync and database integration"
if errorlevel 1 (
    echo ERROR: 커밋 실패!
    pause
    exit /b 1
)
echo ✅ 커밋 완료
echo.

echo [5/7] main 브랜치로 변경...
git branch -M main
echo ✅ 브랜치 변경 완료
echo.

echo ========================================
echo 🎉 로컬 Git 설정 완료!
echo ========================================
echo.
echo 다음 단계:
echo 1. GitHub에서 새 저장소 생성
echo 2. 저장소 URL 복사 (예: https://github.com/사용자명/hotelworks.git)
echo 3. 아래 명령어 실행:
echo.
echo    git remote add origin [저장소URL]
echo    git push -u origin main
echo.
echo ========================================
pause
