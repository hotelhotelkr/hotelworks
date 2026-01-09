# 🚀 HotelWorks 배포 가이드

## 목차
1. [웹 앱 배포 (Vercel)](#1-웹-앱-배포-vercel)
2. [자체 서버 배포](#2-자체-서버-배포)
3. [모바일 앱 배포](#3-모바일-앱-배포)
4. [환경 변수 설정](#4-환경-변수-설정)

---

## 1. 웹 앱 배포 (Vercel)

### 사전 준비
- GitHub 계정
- Vercel 계정 (무료)

### 배포 단계

#### Step 1: GitHub에 코드 푸시

```bash
# Git 초기화 (아직 안 했다면)
git init
git add .
git commit -m "Initial commit"

# GitHub 저장소 생성 후
git remote add origin https://github.com/YOUR_USERNAME/hotelworks.git
git branch -M main
git push -u origin main
```

#### Step 2: Vercel에 배포

1. **Vercel 가입**: https://vercel.com/signup
2. **New Project** 클릭
3. **Import Git Repository** - GitHub 연결
4. **hotelworks 저장소 선택**
5. **Configure Project**:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

6. **Environment Variables 추가**:
   ```
   VITE_WS_SERVER_URL=https://your-backend-url.com
   ```

7. **Deploy** 클릭!

#### Step 3: 백엔드 서버 배포

**옵션 A: Railway (추천, 무료)**

1. https://railway.app/ 가입
2. **New Project** → **Deploy from GitHub repo**
3. hotelworks 선택
4. **Variables** 탭에서 환경 변수 추가:
   ```
   DB_HOST=your-db-host
   DB_PORT=3306
   DB_USER=your-db-user
   DB_PASSWORD=your-db-password
   DB_NAME=hotelworks
   PORT=3001
   NODE_ENV=production
   ```
5. **Start Command** 설정: `node server.js`
6. 자동 배포 완료!

**옵션 B: Render (무료)**

1. https://render.com/ 가입
2. **New** → **Web Service**
3. GitHub 저장소 연결
4. 설정:
   - Build Command: `npm install`
   - Start Command: `node server.js`
5. Environment Variables 추가 (위와 동일)

#### Step 4: 프론트엔드에서 백엔드 URL 연결

Vercel에서 Environment Variables 업데이트:
```
VITE_WS_SERVER_URL=https://your-railway-url.railway.app
```

재배포 하면 완료! ✅

---

## 2. 자체 서버 배포

### 사전 준비
- Ubuntu/CentOS 서버
- Node.js 18+ 설치
- MySQL 8.0+ 설치
- 도메인 (선택)

### 배포 단계

#### Step 1: 서버 접속 및 패키지 설치

```bash
# SSH 접속
ssh user@your-server-ip

# Node.js 설치 (Ubuntu)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# MySQL 설치
sudo apt-get install mysql-server

# PM2 설치 (프로세스 관리)
sudo npm install -g pm2

# Nginx 설치 (웹 서버)
sudo apt-get install nginx
```

#### Step 2: 코드 배포

```bash
# 프로젝트 디렉토리 생성
cd /var/www
sudo mkdir hotelworks
sudo chown $USER:$USER hotelworks
cd hotelworks

# Git clone
git clone https://github.com/YOUR_USERNAME/hotelworks.git .

# 의존성 설치
npm install

# 프론트엔드 빌드
npm run build
```

#### Step 3: 데이터베이스 설정

```bash
# MySQL 접속
sudo mysql -u root -p

# 데이터베이스 생성
CREATE DATABASE hotelworks CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 사용자 생성
CREATE USER 'hotelworks'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON hotelworks.* TO 'hotelworks'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# 스키마 생성
mysql -u hotelworks -p hotelworks < database/schema.sql
```

#### Step 4: 환경 변수 설정

```bash
# .env 파일 생성
nano .env
```

다음 내용 입력:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=hotelworks
DB_PASSWORD=your_secure_password
DB_NAME=hotelworks
PORT=3001
NODE_ENV=production
SERVER_URL=https://your-domain.com
```

#### Step 5: PM2로 서버 실행

```bash
# 서버 시작
pm2 start server.js --name hotelworks-server

# 부팅 시 자동 시작 설정
pm2 startup
pm2 save

# 상태 확인
pm2 status
pm2 logs hotelworks-server
```

#### Step 6: Nginx 설정

```bash
# Nginx 설정 파일 생성
sudo nano /etc/nginx/sites-available/hotelworks
```

다음 내용 입력:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 프론트엔드 (정적 파일)
    location / {
        root /var/www/hotelworks/dist;
        try_files $uri $uri/ /index.html;
    }

    # 백엔드 API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3001;
    }
}
```

```bash
# 설정 활성화
sudo ln -s /etc/nginx/sites-available/hotelworks /etc/nginx/sites-enabled/

# Nginx 테스트 및 재시작
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 7: SSL 인증서 설정 (HTTPS)

```bash
# Certbot 설치
sudo apt-get install certbot python3-certbot-nginx

# SSL 인증서 발급
sudo certbot --nginx -d your-domain.com

# 자동 갱신 설정 (이미 자동 설정됨)
sudo certbot renew --dry-run
```

#### Step 8: 방화벽 설정

```bash
# UFW 방화벽 설정
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

배포 완료! 🎉

**접속 URL**: `https://your-domain.com`

---

## 3. 모바일 앱 배포

### iOS 앱 배포 (Apple App Store)

#### 사전 준비
- macOS 컴퓨터
- Xcode 설치
- Apple Developer 계정 ($99/년)

#### 배포 단계

```bash
# 1. iOS 플랫폼 추가
npm run cap:build:ios

# 2. Xcode에서 열기
npx cap open ios
```

**Xcode에서:**
1. **Signing & Capabilities** 탭
   - Team 선택
   - Bundle Identifier 설정 (예: com.yourcompany.hotelworks)
2. **Product** → **Archive**
3. **Distribute App** → **App Store Connect**
4. **Upload** 완료!

**App Store Connect에서:**
1. https://appstoreconnect.apple.com/
2. **My Apps** → **+** → **New App**
3. 앱 정보 입력 (이름, 스크린샷, 설명 등)
4. **Submit for Review**
5. 승인 대기 (보통 1-3일)

---

### Android 앱 배포 (Google Play Store)

#### 사전 준비
- Google Play Console 계정 ($25 일회성)
- Java Development Kit (JDK) 설치

#### 배포 단계

```bash
# 1. Android 플랫폼 추가
npm run cap:build:android

# 2. Keystore 생성 (릴리즈 서명용)
keytool -genkey -v -keystore hotelworks.keystore -alias hotelworks -keyalg RSA -keysize 2048 -validity 10000

# 3. Android Studio에서 열기
npx cap open android
```

**Android Studio에서:**
1. **Build** → **Generate Signed Bundle / APK**
2. **Android App Bundle** 선택
3. Keystore 정보 입력
4. **release** 빌드 타입 선택
5. **Build** 완료!

**Google Play Console에서:**
1. https://play.google.com/console/
2. **Create App**
3. 앱 정보 입력
4. **Production** → **Create new release**
5. AAB 파일 업로드
6. **Review and rollout** → **Start rollout to production**

배포 완료! (승인 대기 시간: 수 시간~수일)

---

## 4. 환경 변수 설정

### 개발 환경 (.env)
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=hotelworks
PORT=3001
NODE_ENV=development
VITE_WS_SERVER_URL=http://localhost:3001
```

### 프로덕션 환경 (.env.production)
```env
DB_HOST=production-db-host
DB_PORT=3306
DB_USER=hotelworks_user
DB_PASSWORD=secure_password_here
DB_NAME=hotelworks
PORT=3001
NODE_ENV=production
VITE_WS_SERVER_URL=https://your-domain.com
SERVER_URL=https://your-domain.com
```

### Vercel 환경 변수
```
VITE_WS_SERVER_URL=https://your-backend-url.railway.app
```

---

## 5. 배포 후 확인 사항

### ✅ 체크리스트

- [ ] 프론트엔드가 정상적으로 로드되는가?
- [ ] 백엔드 서버에 연결되는가? (`/health` 확인)
- [ ] WebSocket 연결이 작동하는가?
- [ ] 데이터베이스 연결이 정상인가?
- [ ] 로그인이 작동하는가?
- [ ] 주문 생성/수정/삭제가 작동하는가?
- [ ] 실시간 동기화가 작동하는가?
- [ ] HTTPS가 적용되었는가?
- [ ] 모바일에서 정상 작동하는가?

### 🔍 디버깅 방법

```bash
# 서버 로그 확인
pm2 logs hotelworks-server

# Nginx 로그 확인
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# 데이터베이스 연결 테스트
mysql -u hotelworks -p hotelworks -e "SELECT 1"

# 서버 상태 확인
curl http://localhost:3001/health
```

### 🐛 일반적인 문제 해결

#### 1. WebSocket 연결 실패
```bash
# Nginx 설정 확인
sudo nginx -t

# WebSocket 프록시 설정이 올바른지 확인
# location /socket.io/ 섹션이 있어야 함
```

#### 2. 데이터베이스 연결 실패
```bash
# MySQL 실행 중인지 확인
sudo systemctl status mysql

# 권한 확인
mysql -u hotelworks -p -e "SHOW GRANTS"
```

#### 3. CORS 에러
```javascript
// server.js에서 CORS 설정 확인
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  // ...
});
```

---

## 6. 성능 최적화

### 프론트엔드 최적화
```bash
# 빌드 최적화
npm run build

# 빌드 크기 분석
npm install -D rollup-plugin-visualizer
```

### 백엔드 최적화
```javascript
// server.js - 압축 미들웨어 추가
import compression from 'compression';
app.use(compression());
```

### 데이터베이스 최적화
```sql
-- 인덱스 확인
SHOW INDEX FROM orders;

-- 쿼리 성능 분석
EXPLAIN SELECT * FROM orders WHERE status = 'REQUESTED';
```

---

## 7. 백업 전략

### 데이터베이스 백업
```bash
# 매일 자동 백업 스크립트
nano /home/user/backup-db.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u hotelworks -p'password' hotelworks > /backups/hotelworks_$DATE.sql
find /backups -name "hotelworks_*.sql" -mtime +7 -delete
```

```bash
# 실행 권한 부여
chmod +x /home/user/backup-db.sh

# Cron 작업 추가 (매일 새벽 2시)
crontab -e
0 2 * * * /home/user/backup-db.sh
```

---

## 8. 모니터링

### PM2 모니터링
```bash
# 실시간 모니터링
pm2 monit

# 웹 대시보드
pm2 web
# http://localhost:9615 접속
```

### 로그 관리
```bash
# 로그 로테이션 설정
pm2 install pm2-logrotate

# 설정
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 📞 지원

문제가 발생하면:
1. 로그 확인 (`pm2 logs`)
2. GitHub Issues에 문의
3. 이메일: HotelHotel@kakao.com

---

**배포 완료를 축하합니다! 🎉**

