# HotelWorks - Complete GitHub Upload
# User: hotelhotelkr

Write-Host "========================================"
Write-Host "HotelWorks - GitHub Upload"
Write-Host "   User: hotelhotelkr"
Write-Host "========================================"
Write-Host ""

# 1. Git init
Write-Host "[1/9] Git init..." -ForegroundColor Green
if (Test-Path .git) {
    Write-Host "Already initialized" -ForegroundColor Yellow
} else {
    git init
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Done" -ForegroundColor Green
    } else {
        Write-Host "Failed!" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}
Write-Host ""

# 2. Git config
Write-Host "[2/9] Git config..." -ForegroundColor Green
git config user.name "HotelWorks"
git config user.email "hotelhotel.kr@gmail.com"
Write-Host "Done" -ForegroundColor Green
Write-Host ""

# 3. Git add
Write-Host "[3/9] Git add..." -ForegroundColor Green
git add .
if ($LASTEXITCODE -eq 0) {
    Write-Host "Done" -ForegroundColor Green
} else {
    Write-Host "Failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# 4. Git commit
Write-Host "[4/9] Git commit..." -ForegroundColor Green
git commit -m "feat: Complete HotelWorks - Real-time Order Management System" > $null 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "Done" -ForegroundColor Green
} else {
    Write-Host "Failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# 5. Git branch
Write-Host "[5/9] Git branch..." -ForegroundColor Green
git branch -M main
Write-Host "Done" -ForegroundColor Green
Write-Host ""

# 6. Check remote
Write-Host "[6/9] Check remote..." -ForegroundColor Green
$remotes = git remote
if ($remotes -contains "origin") {
    Write-Host "Removing existing origin..." -ForegroundColor Yellow
    git remote remove origin
}
Write-Host "Done" -ForegroundColor Green
Write-Host ""

# 7. Add remote
Write-Host "[7/9] Add remote..." -ForegroundColor Green
git remote add origin https://github.com/hotelhotelkr/hotelworks.git
if ($LASTEXITCODE -eq 0) {
    Write-Host "Done: https://github.com/hotelhotelkr/hotelworks.git" -ForegroundColor Green
} else {
    Write-Host "Failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# 8. Verify remote
Write-Host "[8/9] Verify remote..." -ForegroundColor Green
git remote -v
Write-Host ""

# 9. Ready to push
Write-Host "[9/9] Ready to push!" -ForegroundColor Green
Write-Host ""

Write-Host "========================================"
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================"
Write-Host ""

Write-Host "Checklist:" -ForegroundColor Yellow
Write-Host "  [OK] Git initialized" -ForegroundColor Green
Write-Host "  [OK] Files committed" -ForegroundColor Green
Write-Host "  [OK] Branch: main" -ForegroundColor Green
Write-Host "  [OK] Remote: https://github.com/hotelhotelkr/hotelworks" -ForegroundColor Green
Write-Host ""

Write-Host "========================================"
Write-Host "Next Steps" -ForegroundColor Yellow
Write-Host "========================================"
Write-Host ""

Write-Host "1. Create GitHub repository:"
Write-Host "   https://github.com/new"
Write-Host "   Name: hotelworks"
Write-Host "   [X] Uncheck Initialize options!"
Write-Host ""

Write-Host "2. After creating repo, run:"
Write-Host "   git push -u origin main" -ForegroundColor Yellow
Write-Host ""

Write-Host "3. Authentication:"
Write-Host "   Username: hotelhotelkr"
Write-Host "   Password: Personal Access Token"
Write-Host "   (GitHub -> Settings -> Developer settings -> Tokens)"
Write-Host ""

Write-Host "========================================"

Read-Host "Press Enter to exit"
