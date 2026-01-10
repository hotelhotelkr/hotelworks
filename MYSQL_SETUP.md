# MySQL 데이터베이스 설치 및 설정 가이드

## 🚀 빠른 설치 (XAMPP 사용)

### 1️⃣ XAMPP 다운로드 및 설치

1. **XAMPP 다운로드**
   - [https://www.apachefriends.org/download.html](https://www.apachefriends.org/download.html)
   - Windows용 XAMPP 다운로드

2. **XAMPP 설치**
   - 다운로드한 파일 실행
   - MySQL 체크박스 선택
   - 기본 경로로 설치: `C:\xampp`

3. **MySQL 시작**
   - XAMPP Control Panel 실행
   - MySQL의 "Start" 버튼 클릭
   - 초록색 표시되면 정상 실행

### 2️⃣ 데이터베이스 생성

1. **phpMyAdmin 접속**
   - 브라우저에서 `http://localhost/phpmyadmin` 접속

2. **데이터베이스 생성**
   ```sql
   CREATE DATABASE hotelworks CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

### 3️⃣ HotelWorks 설정

1. **`.env` 파일 생성**
   - 프로젝트 루트에 `.env` 파일 생성
   - `.env.example` 내용을 복사하여 붙여넣기

2. **데이터베이스 초기화**
   ```bash
   node database/init.js
   ```

3. **서버 재시작**
   ```bash
   npm run dev:all
   ```

---

## 📊 대안: MySQL Server 직접 설치

### Windows에서 MySQL Server 설치

1. **MySQL Installer 다운로드**
   - [https://dev.mysql.com/downloads/installer/](https://dev.mysql.com/downloads/installer/)
   - "Windows (x86, 32-bit), MSI Installer" 다운로드

2. **MySQL Server 설치**
   - Developer Default 선택
   - Root 비밀번호 설정 (비어있거나 간단한 비밀번호 권장)

3. **MySQL 서비스 시작**
   ```powershell
   Start-Service MySQL80
   ```

4. **데이터베이스 생성**
   ```bash
   mysql -u root -p
   CREATE DATABASE hotelworks CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   EXIT;
   ```

---

## ⚙️ `.env` 파일 설정

프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 입력하세요:

```env
# 서버 설정
PORT=4000
SERVER_URL=http://localhost:4000
WS_SERVER_URL=http://localhost:4000

# MySQL 데이터베이스 설정
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=          # MySQL root 비밀번호 (없으면 비워두기)
DB_NAME=hotelworks

# 환경
NODE_ENV=development
```

---

## 🔧 데이터베이스 초기화

`.env` 파일 설정 후, 다음 명령어로 테이블을 생성하세요:

```bash
node database/init.js
```

성공 메시지:
```
📊 데이터베이스 초기화 시작...
✅ 데이터베이스 초기화 완료
✅ 초기화 스크립트 실행 완료
```

---

## ❌ 데이터베이스 없이 사용

데이터베이스를 설치하지 않아도 HotelWorks는 정상 작동합니다!

- **데이터 저장**: `localStorage` 사용
- **실시간 동기화**: WebSocket으로 정상 작동
- **제한 사항**: 서버 재시작 시 데이터 초기화

현재 설정으로도 모든 기능이 정상 작동하며, 나중에 언제든 MySQL을 추가할 수 있습니다.

---

## 🐛 문제 해결

### MySQL 연결 오류

**오류 메시지:**
```
❌ 데이터베이스 연결 실패: connect ECONNREFUSED 127.0.0.1:3306
```

**해결 방법:**
1. MySQL 서비스가 실행 중인지 확인
   ```powershell
   Get-Service MySQL* | Start-Service
   ```

2. 포트 3306이 사용 가능한지 확인
   ```powershell
   netstat -ano | findstr :3306
   ```

3. `.env` 파일의 DB_HOST, DB_PORT, DB_USER, DB_PASSWORD 확인

---

## ✅ 연결 확인

서버 시작 시 다음 메시지가 표시되면 정상:

```
✅ 데이터베이스 연결 성공
🚀 WebSocket 서버가 포트 4000에서 실행 중입니다.
💾 데이터베이스 연동 활성화
```
