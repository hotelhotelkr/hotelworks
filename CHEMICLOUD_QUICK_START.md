# ⚡ ChemiCloud 빠른 시작 가이드
## HotelWorks 5분 배포

---

## 🎯 목표
**hotelworks.kr**에 HotelWorks를 빠르게 배포하기

---

## 📋 준비물 체크리스트

- [ ] ChemiCloud cPanel 접속 정보
- [ ] 도메인 `hotelworks.kr` 연결됨
- [ ] FTP/SFTP 클라이언트 (FileZilla 추천)
- [ ] 프로젝트 파일 (GitHub 또는 로컬)

---

## 🚀 5단계 배포 프로세스

### ✅ Step 1: 로컬에서 빌드 (2분)

로컬 PC에서 실행:

```bash
# 1. 프로젝트 디렉토리로 이동
cd hotelworks

# 2. 의존성 설치
npm install

# 3. 프론트엔드 빌드
npm run build

# ✓ dist/ 폴더가 생성됩니다
```

---

### ✅ Step 2: MySQL 데이터베이스 생성 (1분)

**cPanel 접속**: https://hotelworks.kr:2083

#### 2-1. 데이터베이스 생성
`cPanel → Databases → MySQL Databases`

1. **New Database**: `hotelworks` 입력 → **Create Database**
2. 생성된 이름 메모: `username_hotelworks`

#### 2-2. 사용자 생성
1. **Username**: `hotelworks_user` 입력
2. **Password**: **Generate Password** 클릭 (자동 생성)
3. **비밀번호 복사해서 메모장에 저장!** ⚠️
4. **Create User** 클릭

#### 2-3. 권한 부여
1. **Add User To Database** 섹션:
   - User: `username_hotelworks_user` 선택
   - Database: `username_hotelworks` 선택
   - **Add** 클릭
2. **ALL PRIVILEGES** 체크 → **Make Changes**

#### 2-4. 스키마 적용
`cPanel → phpMyAdmin`

1. 좌측에서 `username_hotelworks` 클릭
2. 상단 **SQL** 탭 클릭
3. `database/schema.sql` 파일 열기 → 내용 전체 복사
4. SQL 창에 붙여넣기 → **Go** 클릭

---

### ✅ Step 3: Node.js 앱 생성 (1분)

`cPanel → Software → Setup Node.js App`

1. **Create Application** 클릭
2. 설정값 입력:
   ```
   Node.js version:     18.x
   Application mode:    Production
   Application root:    hotelworks
   Application URL:     hotelworks.kr
   Application startup: server.js
   ```
3. **CREATE** 클릭

---

### ✅ Step 4: 파일 업로드 (2분)

#### 방법 A: FTP (추천)

**FileZilla 연결**:
```
Host:     ftp.hotelworks.kr
Username: [cPanel 사용자명]
Password: [cPanel 비밀번호]
Port:     21
```

**업로드할 파일**:
```
/home/username/hotelworks/
├── dist/                  ← 빌드 결과물 전체
├── database/              ← db.js, schema.sql, models/
├── server.js              ← 백엔드 서버
├── package.json
├── package-lock.json
└── .env                   ← 다음 단계에서 생성
```

#### 방법 B: cPanel 파일 관리자

1. `cPanel → File Manager`
2. `/home/username/hotelworks` 이동
3. **Upload** → 파일들을 ZIP으로 압축해서 업로드
4. 우클릭 → **Extract**

---

### ✅ Step 5: 환경 변수 & 실행 (1분)

#### 5-1. .env 파일 생성

`cPanel → File Manager → /home/username/hotelworks`

1. **+ File** → `.env` 생성
2. 우클릭 → **Edit** → 다음 내용 입력:

```env
# ⚠️ username을 실제 cPanel 사용자명으로 변경!
DB_HOST=localhost
DB_PORT=3306
DB_USER=username_hotelworks_user
DB_PASSWORD=Step2에서_복사한_비밀번호
DB_NAME=username_hotelworks
PORT=3001
NODE_ENV=production
SERVER_URL=https://hotelworks.kr
VITE_WS_SERVER_URL=https://hotelworks.kr
TZ=Asia/Seoul
```

3. **Save Changes**

#### 5-2. 앱 시작

`cPanel → Setup Node.js App`

1. **hotelworks** 앱 찾기
2. **Actions → Run NPM Install** 클릭 (의존성 설치)
3. 완료 후 **Actions → Restart** 클릭
4. 상태가 **Running**으로 변경 확인 ✅

---

## 🌐 배포 완료!

브라우저에서 접속:

```
https://hotelworks.kr
```

### 🎉 성공하면 보이는 것:
- ✅ 로그인 페이지
- ✅ FRONT DESK 타이틀
- ✅ 사용자명/비밀번호 입력 필드

---

## ⚙️ 추가 설정 (선택)

### SSL 인증서 (HTTPS)

`cPanel → Security → SSL/TLS Status`

1. `hotelworks.kr` 체크
2. **Run AutoSSL** 클릭
3. 5분 기다리면 자동 설치 ✅

### .htaccess 설정

`/home/username/public_html/.htaccess` 생성:

```apache
# HTTPS 리다이렉트
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Node.js 앱 연결
PassengerEnabled on
PassengerAppRoot /home/username/hotelworks
PassengerAppType node
PassengerStartupFile server.js
```

---

## 🔧 문제 해결

### 문제: 500 Internal Server Error

**해결**:
```bash
# cPanel → Terminal
cd ~/hotelworks
tail -f logs/*.log  # 로그 확인
```

또는 `cPanel → Setup Node.js App → View Log`

### 문제: 데이터베이스 연결 실패

**확인사항**:
1. `.env` 파일의 DB 정보가 정확한가?
2. `username_` 접두사가 붙어있나?
3. 비밀번호가 올바른가?

### 문제: 앱이 시작되지 않음

**해결**:
```bash
cd ~/hotelworks
source ~/nodevenv/hotelworks/18/bin/activate
npm install
touch tmp/restart.txt
```

---

## 📊 배포 확인 체크리스트

완료 여부를 체크하세요:

- [ ] **Step 1**: 로컬 빌드 완료 (`dist/` 폴더 생성)
- [ ] **Step 2**: MySQL DB, 사용자, 스키마 생성
- [ ] **Step 3**: Node.js 앱 생성 (cPanel)
- [ ] **Step 4**: 파일 업로드 (FTP 또는 파일 관리자)
- [ ] **Step 5**: `.env` 파일 생성 및 앱 실행
- [ ] **추가**: SSL 인증서 설치
- [ ] **확인**: https://hotelworks.kr 접속 성공
- [ ] **테스트**: 로그인 성공
- [ ] **테스트**: 주문 생성/조회 정상 작동
- [ ] **테스트**: 실시간 동기화 확인

모든 항목이 체크되면 배포 완료! 🎉

---

## 🆘 도움이 필요하면?

### ChemiCloud 지원팀
- **라이브 챗**: https://chemicloud.com/contact/
- **티켓**: cPanel → Support

### 일반적인 문제
- Node.js 배포: https://chemicloud.com/kb/article/how-to-deploy-nodejs-application/
- MySQL 관리: https://chemicloud.com/kb/article/mysql-database-management/

---

## 🎯 다음 단계

배포 성공 후:

1. ✅ **기능 테스트**: 모든 기능이 정상 작동하는지 확인
2. ✅ **백업 설정**: cPanel → Backups → 자동 백업 활성화
3. ✅ **모니터링**: 로그 주기적 확인
4. ✅ **팀 공유**: 팀원들에게 URL 공유!

---

**축하합니다! HotelWorks가 성공적으로 배포되었습니다!** 🚀🎉

문제가 있으면 언제든지 물어보세요! 😊

