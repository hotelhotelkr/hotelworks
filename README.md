# HotelWorks

호텔 운영 관리를 위한 실시간 주문 관리 시스템

## 주요 기능

- 🏨 실시간 주문 관리 (Front Desk / Housekeeping)
- 📱 WebSocket 기반 실시간 동기화
- 📊 대시보드 및 통계 분석
- 💬 주문별 메모 시스템
- 📤 Excel 데이터 내보내기
- 🔔 실시간 알림 시스템

## 기술 스택

- **Frontend**: React, TypeScript, Vite
- **Backend**: Node.js, Express, Socket.IO
- **Database**: MySQL
- **Mobile**: Capacitor

## 설치 및 실행

### Prerequisites

- Node.js 18+
- MySQL 8.0+

### 설치

```bash
# 의존성 설치
npm install

# 데이터베이스 초기화
npm run db:init
```

### 실행

```bash
# 개발 서버 실행 (프론트엔드 + 백엔드)
npm run dev:all

# 또는 개별 실행
npm run dev          # 프론트엔드 (포트 3000)
npm run dev:server   # 백엔드 (포트 3001)
```

## Git 저장소 설정

### 방법 1: PowerShell 스크립트 사용 (Windows)

```powershell
.\setup-git.ps1
```

### 방법 2: 수동 설정

```bash
# Git 초기화
git init
git branch -M main
git add .
git commit -m "Initial commit: HotelWorks 프로젝트"

# GitHub 저장소 연결
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 방법 3: GitHub CLI 사용

```bash
# GitHub CLI 설치 후
gh auth login
gh repo create hotelworks --public --source=. --remote=origin --push
```

## 프로젝트 구조

```
hotelworks/
├── components/      # React 컴포넌트
├── database/        # 데이터베이스 스키마 및 모델
├── services/        # 서비스 레이어
├── public/          # 정적 파일
├── dist/            # 빌드 출력
└── server.js        # Express 서버
```

## 환경 변수

`.env` 파일 생성:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=hotelworks
PORT=3001
VITE_WS_SERVER_URL=ws://localhost:3001
```

## 라이선스

MIT
