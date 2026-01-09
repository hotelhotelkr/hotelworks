# 🚀 ChemiCloud 배포 가이드 - HotelWorks
## 도메인: hotelworks.kr

---

## 📋 목차
1. [사전 준비](#사전-준비)
2. [cPanel 설정](#cpanel-설정)
3. [MySQL 데이터베이스 생성](#mysql-데이터베이스-생성)
4. [Node.js 앱 설정](#nodejs-앱-설정)
5. [파일 업로드](#파일-업로드)
6. [환경 변수 설정](#환경-변수-설정)
7. [SSL 인증서 설치](#ssl-인증서-설치)
8. [최종 확인](#최종-확인)

---

## 📌 사전 준비

### 필요한 정보
- ✅ ChemiCloud cPanel 로그인 정보
- ✅ 도메인: hotelworks.kr
- ✅ FTP/SFTP 접속 정보

### ChemiCloud 플랜 확인
- **Shared Hosting**: Node.js 앱 지원 (Application Manager 사용)
- **최소 요구사항**: 
  - Node.js 18.x 이상
  - MySQL 5.7 이상
  - 최소 2GB 저장공간

---

## 🔧 Step 1: cPanel 설정

### 1-1. cPanel 로그인

```
https://hotelworks.kr:2083
또는
https://your-server.chemicloud.com:2083
```

- **사용자명**: ChemiCloud에서 제공한 계정명
- **비밀번호**: 설정한 비밀번호

### 1-2. 도메인 확인

**cPanel → Domains → Domains**
- `hotelworks.kr` 도메인이 추가되어 있는지 확인
- Document Root: `/home/username/public_html` (기본값)

---

## 🗄️ Step 2: MySQL 데이터베이스 생성

### 2-1. 데이터베이스 생성

**cPanel → Databases → MySQL Databases**

1. **Create New Database**
   - Database Name: `hotelworks`
   - 생성 후 전체 이름 메모: `username_hotelworks`

2. **Create MySQL User**
   - Username: `hotelworks_user`
   - Password: **강력한 비밀번호 생성** (Generate Password 사용)
   - 비밀번호 메모해두기! ⚠️

3. **Add User to Database**
   - User: `username_hotelworks_user`
   - Database: `username_hotelworks`
   - Privileges: **ALL PRIVILEGES** 선택

### 2-2. phpMyAdmin에서 스키마 적용

**cPanel → Databases → phpMyAdmin**

1. 좌측에서 `username_hotelworks` 선택
2. 상단 **SQL** 탭 클릭
3. `database/schema.sql` 파일의 내용을 복사해서 붙여넣기
4. **Go** 버튼 클릭

---

## ⚙️ Step 3: Node.js 앱 설정

### 3-1. Node.js 앱 생성

**cPanel → Software → Setup Node.js App**

1. **Create Application** 클릭

2. **설정값 입력**:
   ```
   Node.js version: 18.x (최신 LTS 버전 선택)
   Application mode: Production
   Application root: hotelworks
   Application URL: hotelworks.kr
   Application startup file: server.js
   ```

3. **CREATE** 클릭

### 3-2. 경로 확인

생성 후 표시되는 경로 메모:
```
Application Root: /home/username/hotelworks
```

---

## 📤 Step 4: 파일 업로드

### 방법 A: cPanel 파일 관리자 (간단)

**cPanel → Files → File Manager**

1. `/home/username/hotelworks` 디렉토리로 이동
2. 상단 **Upload** 클릭
3. 로컬에서 먼저 빌드:
   ```bash
   # 로컬 PC에서 실행
   npm install
   npm run build
   ```
4. 다음 파일/폴더들을 ZIP으로 압축해서 업로드:
   - `dist/` (빌드된 프론트엔드)
   - `server.js`
   - `database/`
   - `package.json`
   - `package-lock.json`
   - `.env` (나중에 생성)

5. 업로드 후 ZIP 파일 우클릭 → **Extract** (압축 해제)

### 방법 B: FTP/SFTP (추천)

**FileZilla 사용**

1. **연결 정보**:
   ```
   Host: ftp.hotelworks.kr
   Username: ChemiCloud cPanel 사용자명
   Password: cPanel 비밀번호
   Port: 21 (FTP) 또는 22 (SFTP)
   ```

2. **원격 경로**: `/home/username/hotelworks`

3. **업로드할 파일들**:
   ```
   hotelworks/
   ├── dist/              (npm run build 결과물)
   ├── database/
   │   ├── db.js
   │   ├── init.js
   │   ├── schema.sql
   │   └── models/
   ├── server.js
   ├── package.json
   ├── package-lock.json
   └── .env              (다음 단계에서 생성)
   ```

### 방법 C: Git (선택)

**cPanel → Advanced → Terminal** (있는 경우)

```bash
cd ~/hotelworks
git clone https://github.com/YOUR_USERNAME/hotelworks.git .
npm install
npm run build
```

---

## 🔐 Step 5: 환경 변수 설정

### 5-1. .env 파일 생성

**cPanel → File Manager → `/home/username/hotelworks`**

1. **+ File** 클릭
2. 파일명: `.env`
3. 우클릭 → **Edit**
4. 다음 내용 입력:

```env
# 데이터베이스 설정
DB_HOST=localhost
DB_PORT=3306
DB_USER=username_hotelworks_user
DB_PASSWORD=생성한_실제_비밀번호
DB_NAME=username_hotelworks

# 서버 설정
PORT=3001
NODE_ENV=production

# 도메인 설정
SERVER_URL=https://hotelworks.kr
VITE_WS_SERVER_URL=https://hotelworks.kr
```

⚠️ **중요**: `username_`은 실제 cPanel 사용자명으로 변경!

### 5-2. Node.js 앱에 환경 변수 추가

**cPanel → Setup Node.js App → hotelworks 편집**

**Environment variables** 섹션에서 추가:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=username_hotelworks_user
DB_PASSWORD=실제_비밀번호
DB_NAME=username_hotelworks
PORT=3001
NODE_ENV=production
```

---

## 📦 Step 6: 의존성 설치 및 앱 시작

### 6-1. 터미널 접속

**cPanel → Setup Node.js App → hotelworks 옆 Actions → Run NPM Install**

또는

**cPanel → Advanced → Terminal**:
```bash
cd ~/hotelworks
source ~/nodevenv/hotelworks/18/bin/activate
npm install
npm run build  # 프론트엔드 빌드 (아직 안 했다면)
```

### 6-2. 앱 시작

**cPanel → Setup Node.js App → hotelworks**

1. **Actions → Restart** 클릭
2. 상태가 **Running**으로 표시되는지 확인

---

## 🌐 Step 7: 웹서버 설정 (Passenger)

ChemiCloud는 Passenger를 사용하여 Node.js 앱을 제공합니다.

### 7-1. .htaccess 파일 생성

**`/home/username/public_html/.htaccess`** 생성:

```apache
# HotelWorks Passenger 설정

# Node.js 앱으로 리다이렉션
PassengerAppRoot /home/username/hotelworks
PassengerBaseURI /
PassengerStartupFile server.js
PassengerNodejs /home/username/nodevenv/hotelworks/18/bin/node

# 정적 파일은 직접 서빙
RewriteEngine On
RewriteCond %{REQUEST_URI} !^/dist/
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ http://127.0.0.1:3001/$1 [P,L]

# Gzip 압축
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# 브라우저 캐싱
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType application/x-javascript "access plus 1 month"
</IfModule>

# CORS 설정 (필요시)
<IfModule mod_headers.c>
  Header set Access-Control-Allow-Origin "*"
  Header set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
  Header set Access-Control-Allow-Headers "Content-Type, Authorization"
</IfModule>
```

### 7-2. 정적 파일 심볼릭 링크

**Terminal**:
```bash
cd ~/public_html
ln -s ~/hotelworks/dist dist
```

---

## 🔒 Step 8: SSL 인증서 설치 (Let's Encrypt)

### 8-1. SSL 자동 설치

**cPanel → Security → SSL/TLS Status**

1. `hotelworks.kr` 체크박스 선택
2. **Run AutoSSL** 클릭
3. 몇 분 기다리면 자동으로 설치됨

### 8-2. HTTPS 강제 리다이렉션

**`/home/username/public_html/.htaccess`** 최상단에 추가:

```apache
# HTTPS 강제 리다이렉션
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

---

## ✅ Step 9: 최종 확인

### 9-1. 접속 테스트

1. 브라우저에서 **https://hotelworks.kr** 접속
2. 로그인 페이지가 표시되는지 확인

### 9-2. 데이터베이스 연결 확인

**터미널에서 로그 확인**:
```bash
cd ~/hotelworks
tail -f logs/app.log  # 로그 파일 경로는 실제 경로로 수정
```

또는 **cPanel → Setup Node.js App → View Log**

### 9-3. WebSocket 연결 확인

브라우저 개발자 도구 (F12) → Console:
- WebSocket 연결 오류가 없는지 확인
- `ws://` → `wss://` (HTTPS)로 자동 변경되는지 확인

---

## 🔧 문제 해결

### 문제 1: 500 Internal Server Error

**해결책**:
```bash
# 파일 권한 확인
cd ~/hotelworks
chmod 755 server.js
chmod -R 755 dist/

# 로그 확인
cat ~/logs/hotelworks_error.log
```

### 문제 2: 데이터베이스 연결 실패

**해결책**:
1. `.env` 파일의 DB 정보 재확인
2. phpMyAdmin에서 사용자 권한 확인
3. DB 호스트가 `localhost`인지 확인

### 문제 3: WebSocket 연결 안 됨

**해결책**:
- ChemiCloud는 Passenger로 WebSocket 지원
- `server.js`에서 포트를 환경 변수로 사용하는지 확인:
  ```javascript
  const PORT = process.env.PORT || 3001;
  ```

### 문제 4: 정적 파일 404 오류

**해결책**:
```bash
# 빌드 재실행
cd ~/hotelworks
npm run build

# 심볼릭 링크 재생성
cd ~/public_html
rm -rf dist
ln -s ~/hotelworks/dist dist
```

---

## 🔄 업데이트 방법

### 코드 업데이트 후 배포

```bash
# 1. FTP로 파일 업로드 또는 Git pull
cd ~/hotelworks
git pull origin main

# 2. 의존성 업데이트 (필요시)
source ~/nodevenv/hotelworks/18/bin/activate
npm install

# 3. 프론트엔드 재빌드
npm run build

# 4. 앱 재시작 (cPanel → Setup Node.js App → Restart)
# 또는 터미널에서:
touch ~/hotelworks/tmp/restart.txt
```

---

## 📊 모니터링

### 로그 확인
```bash
# 앱 로그
tail -f ~/logs/hotelworks_app.log

# 에러 로그
tail -f ~/logs/hotelworks_error.log

# Node.js 앱 상태
cd ~/hotelworks
pm2 status  # (PM2가 설치된 경우)
```

### 리소스 사용량 확인
**cPanel → Metrics → CPU and Concurrent Connection Usage**

---

## 🎯 최적화 팁

### 1. 캐싱 활성화
`.htaccess`에 브라우저 캐싱 설정 (위에 포함됨)

### 2. 정적 파일 CDN 사용 (선택)
ChemiCloud의 CloudFlare 통합 사용

### 3. 데이터베이스 최적화
```sql
-- phpMyAdmin에서 실행
OPTIMIZE TABLE users;
OPTIMIZE TABLE orders;
OPTIMIZE TABLE memos;
```

### 4. 백업 자동화
**cPanel → Files → Backups**
- 자동 백업 활성화
- 일일 백업 권장

---

## 📞 지원

### ChemiCloud 지원팀
- **라이브 챗**: https://chemicloud.com/contact/
- **티켓**: cPanel → Support → Open Ticket

### 일반적인 질문
- ChemiCloud Knowledge Base: https://chemicloud.com/kb/
- Node.js 앱 배포: https://chemicloud.com/kb/article/how-to-deploy-nodejs-application/

---

## ✨ 배포 완료!

축하합니다! 🎉

**HotelWorks**가 **https://hotelworks.kr**에 성공적으로 배포되었습니다!

### 다음 단계
1. ✅ 모든 기능 테스트
2. ✅ 백업 설정
3. ✅ 모니터링 설정
4. ✅ 팀원들에게 공유!

---

## 📋 체크리스트

배포 완료 확인:

- [ ] cPanel 로그인 완료
- [ ] MySQL 데이터베이스 생성 및 스키마 적용
- [ ] Node.js 앱 생성
- [ ] 파일 업로드 완료
- [ ] `.env` 파일 설정
- [ ] 의존성 설치 (`npm install`)
- [ ] 프론트엔드 빌드 (`npm run build`)
- [ ] 앱 시작 및 실행 중
- [ ] SSL 인증서 설치
- [ ] https://hotelworks.kr 접속 확인
- [ ] 로그인 테스트
- [ ] 주문 생성/조회 테스트
- [ ] WebSocket 실시간 동기화 테스트

모든 항목 체크되면 배포 완료! 🚀

