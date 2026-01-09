# 빠른 시작 가이드

## Git 저장소 설정 (3단계)

### 1단계: Git 초기화
```bash
git init
git branch -M main
git add .
git commit -m "Initial commit"
```

### 2단계: GitHub 저장소 생성
- 웹: https://github.com/new 에서 생성
- 또는 CLI: `gh repo create hotelworks --public`

### 3단계: 연결 및 푸시
```bash
git remote add origin https://github.com/YOUR_USERNAME/hotelworks.git
git push -u origin main
```

## 또는 한 번에 (GitHub CLI 필요)
```bash
gh repo create hotelworks --public --source=. --remote=origin --push
```

