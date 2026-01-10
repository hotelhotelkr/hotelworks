# 📊 HotelWorks 데이터베이스 설정 가이드

## ✅ 1단계: XAMPP 설치 (진행 중)

XAMPP 다운로드가 시작되었습니다! (약 144MB)

### 설치 방법

1. **다운로드 완료 대기**
   - 다운로드 폴더에서 `xampp-windows-x64-8.0.30-0-VS16-installer.exe` 확인

2. **XAMPP 설치 실행**
   ```
   - 다운로드한 파일을 더블클릭
   - "Yes" 클릭 (관리자 권한 허용)
   - 설치 경로: C:\xampp (기본값 권장)
   - 구성 요소 선택:
     ✅ Apache
     ✅ MySQL
     ✅ PHP
     ✅ phpMyAdmin
     ❌ 나머지는 선택 해제 가능
   ```

3. **설치 완료**
   - "Finish" 클릭
   - "Do you want to start the Control Panel now?" → Yes

---

## ✅ 2단계: MySQL 서버 시작

### XAMPP Control Panel에서

1. **MySQL 시작**
   ```
   - XAMPP Control Panel 열기
   - MySQL 행에서 "Start" 버튼 클릭
   - 초록색으로 변경되면 성공!
   ```

2. **자동 시작 설정 (선택사항)**
   ```
   - MySQL 옆의 체크박스 선택
   - 다음 부팅 시 자동 시작
   ```

---

## ✅ 3단계: 데이터베이스 생성

### 방법 1: phpMyAdmin 사용 (추천)

1. **phpMyAdmin 접속**
   ```
   브라우저에서: http://localhost/phpmyadmin
   ```

2. **데이터베이스 생성**
   ```sql
   - 상단 "SQL" 탭 클릭
   - 다음 명령어 입력:
   
   CREATE DATABASE hotelworks CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

3. **실행**
   ```
   - "Go" 버튼 클릭
   - 성공 메시지 확인
   ```

### 방법 2: 명령줄 사용

```bash
# PowerShell에서 실행
cd C:\xampp\mysql\bin
.\mysql.exe -u root -p
# 비밀번호 없으면 Enter

# MySQL 프롬프트에서
CREATE DATABASE hotelworks CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

---

## ✅ 4단계: HotelWorks 데이터베이스 초기화

### 프로젝트 폴더에서 실행

```bash
# 터미널에서 (프로젝트 루트)
node database/init.js
```

### 성공 메시지

```
📊 데이터베이스 초기화 시작...
✅ 데이터베이스 초기화 완료
✅ 초기화 스크립트 실행 완료
```

---

## ✅ 5단계: 서버 재시작 및 확인

### 1. 서버 재시작

```bash
# 기존 서버 종료 (Ctrl+C)
# 새로 시작
npm run dev:all
```

### 2. 성공 메시지 확인

```
✅ 데이터베이스 연결 성공
🚀 WebSocket 서버가 포트 4000에서 실행 중입니다.
📱 PC와 모바일에서 실시간 동기화가 가능합니다.
💾 데이터베이스 연동 활성화
```

---

## 🔧 문제 해결

### ❌ MySQL 시작 실패

**오류:** Port 3306 already in use

**해결:**
```powershell
# 포트 3306 사용 중인 프로세스 확인
netstat -ano | findstr :3306

# 프로세스 종료 (PID 확인 후)
taskkill /F /PID <PID>
```

### ❌ 데이터베이스 연결 실패

**오류:** `connect ECONNREFUSED 127.0.0.1:3306`

**해결:**
1. XAMPP Control Panel에서 MySQL이 실행 중인지 확인
2. `.env` 파일의 DB 설정 확인:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=hotelworks
   ```

### ❌ phpMyAdmin 접속 안 됨

**해결:**
1. XAMPP Control Panel에서 Apache도 시작
2. 브라우저에서 `http://localhost/phpmyadmin` 재접속

---

## 📋 설치 체크리스트

- [ ] XAMPP 다운로드 완료
- [ ] XAMPP 설치 완료
- [ ] MySQL 서버 시작
- [ ] `hotelworks` 데이터베이스 생성
- [ ] `node database/init.js` 실행
- [ ] 서버 재시작 및 연결 확인

---

## 🎯 다음 단계

데이터베이스 설정이 완료되면:

1. ✅ 실시간 동기화 테스트
2. ✅ 주문 생성 및 관리
3. ✅ 데이터 영구 저장 확인

---

## 💡 참고 사항

- **개발 환경**: 비밀번호 없이 root 계정 사용 가능
- **프로덕션**: 반드시 강력한 비밀번호 설정 필요
- **백업**: 정기적으로 데이터베이스 백업 권장

---

## 📞 도움이 필요하신가요?

설치 중 문제가 발생하면:
1. XAMPP 공식 문서: https://www.apachefriends.org/faq.html
2. HotelWorks 문서: `MYSQL_SETUP.md` 참조
