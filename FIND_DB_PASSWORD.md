# DB_PASSWORD 찾기 및 설정 가이드

## 🔑 DB_PASSWORD란?

`DB_PASSWORD`는 MySQL 데이터베이스에 접속하기 위한 **비밀번호**입니다.
phpMyAdmin에 로그인할 때 사용하는 비밀번호와 **동일**합니다.

---

## 📋 비밀번호 찾는 방법

### 방법 1: phpMyAdmin 로그인 시 사용한 비밀번호 확인 ✅

phpMyAdmin에 접속할 수 있다면, 그 로그인 비밀번호가 바로 `DB_PASSWORD`입니다.

**확인 단계:**
1. phpMyAdmin 접속 시도
2. 입력한 비밀번호 확인 (또는 브라우저가 저장한 비밀번호 확인)
3. 그 비밀번호를 Render Dashboard에 입력

**브라우저에서 저장된 비밀번호 확인:**
- **Chrome**: 설정 → 비밀번호 → phpMyAdmin 사이트 검색
- **Firefox**: 설정 → 로그인 및 비밀번호
- **Edge**: 설정 → 프로필 → 비밀번호

---

### 방법 2: 호스팅 서비스 대시보드에서 확인

호스팅 서비스(cPanel, DirectAdmin, Plesk 등)의 MySQL/데이터베이스 관리에서 확인할 수 있습니다.

**일반적인 위치:**
- **cPanel**: MySQL Databases → 사용자 목록
- **DirectAdmin**: MySQL Management → Users
- **Plesk**: Databases → MySQL Users
- **AWS RDS**: RDS Console → Databases → Modify → Master password
- **DigitalOcean**: Databases → Users → Reset Password

---

### 방법 3: 비밀번호 재설정하기

비밀번호를 모르거나 잊은 경우, 호스팅 서비스에서 재설정할 수 있습니다.

#### cPanel에서 재설정:
1. cPanel 로그인
2. **MySQL Databases** 클릭
3. **Current Users** 섹션에서 사용자 찾기
4. **Change Password** 또는 **Edit** 클릭
5. 새 비밀번호 입력 후 저장
6. 새 비밀번호를 Render Dashboard에 입력

#### 호스팅 서비스 대시보드에서 재설정:
1. 호스팅 서비스 대시보드 접속
2. **Databases** 또는 **MySQL** 섹션 찾기
3. **Users** 또는 **Database Users** 클릭
4. 해당 사용자 선택 후 **Reset Password** 또는 **Change Password** 클릭
5. 새 비밀번호 입력 및 확인

**⚠️ 주의**: 비밀번호를 변경하면:
- phpMyAdmin 로그인 비밀번호도 변경됩니다
- Render Dashboard의 `DB_PASSWORD`도 새 비밀번호로 업데이트해야 합니다

---

## 🎯 Render Dashboard에 설정하기

### 단계별 가이드:

1. **Render Dashboard 접속**
   - https://dashboard.render.com
   - `hotelworks-backend` 서비스 선택
   - **Environment** 탭 클릭

2. **환경 변수 편집**
   - Environment Variables 섹션에서 **"Edit"** 버튼 클릭
   - 또는 **"+ Add Environment Variable"** 클릭

3. **DB_PASSWORD 추가**
   ```
   Key: DB_PASSWORD
   Value: [실제 MySQL 비밀번호]
   ```
   
4. **비밀번호 입력 시 주의사항:**
   - ✅ 실제 비밀번호를 정확히 입력
   - ✅ 특수문자 포함 가능 (그대로 입력)
   - ✅ 따옴표나 이스케이프 문자 **불필요**
   - ✅ Render에서 값이 `*********`로 표시되는 것은 **정상** (보안)

5. **저장**
   - **"Save Changes"** 또는 **"Done"** 클릭
   - Render가 자동으로 서버 재배포 (약 2-3분)

---

## 🔍 비밀번호 입력 예시

### 올바른 예시:
```
DB_PASSWORD = MySecurePass123!
DB_PASSWORD = hotelworks2024
DB_PASSWORD = P@ssw0rd#2024
```

### 잘못된 예시:
```
❌ DB_PASSWORD = "MySecurePass123!"  (따옴표 불필요)
❌ DB_PASSWORD = 'hotelworks2024'    (따옴표 불필요)
❌ DB_PASSWORD = My Secure Pass      (공백 포함 시 따옴표 필요)
```

**참고**: 공백이 포함된 비밀번호는 특수한 경우입니다. 일반적으로 공백 없는 비밀번호를 사용하는 것을 권장합니다.

---

## ✅ 설정 확인 방법

환경 변수 설정 후 (약 2-3분 후):

1. **서버 상태 확인:**
   ```
   https://hotelworks-backend.onrender.com/health
   ```
   
2. **DB 연결 확인:**
   ```
   https://hotelworks-backend.onrender.com/api/db/status
   ```

**성공 시:**
```json
{
  "status": "connected",
  "message": "데이터베이스 연결 성공"
}
```

**실패 시 (비밀번호 오류):**
```json
{
  "status": "error",
  "error": "Access denied for user 'xxx'@'xxx' (using password: YES)"
}
```

비밀번호 오류가 발생하면 비밀번호를 다시 확인하세요.

---

## 🆘 문제 해결

### 문제 1: "Access denied" 오류

**원인**: 비밀번호가 잘못되었습니다.

**해결:**
1. phpMyAdmin으로 로그인하여 비밀번호 확인
2. Render Dashboard에서 `DB_PASSWORD` 값 다시 확인
3. 비밀번호에 특수문자가 있는 경우 정확히 입력했는지 확인

### 문제 2: 비밀번호를 모르겠어요

**해결:**
1. 호스팅 서비스 대시보드에서 비밀번호 재설정
2. phpMyAdmin에 새 비밀번호로 로그인 테스트
3. Render Dashboard의 `DB_PASSWORD`도 새 비밀번호로 업데이트

### 문제 3: Render에서 비밀번호가 `*********`로만 보여요

**설명**: 이것은 **정상**입니다. Render는 보안상 비밀번호를 숨깁니다.

**확인 방법:**
1. Render Dashboard에서 `DB_PASSWORD` 환경 변수 클릭
2. **"Show"** 또는 눈 아이콘 클릭하여 값 확인 가능 (일부 경우)
3. 또는 새로 입력하면 덮어쓰기 가능

---

## 💡 보안 팁

1. **강력한 비밀번호 사용:**
   - 최소 12자 이상
   - 대소문자, 숫자, 특수문자 조합

2. **비밀번호 관리:**
   - 비밀번호 관리 도구(예: 1Password, LastPass) 사용 권장
   - 문서에 평문으로 저장하지 않기

3. **정기적 변경:**
   - 3-6개월마다 비밀번호 변경 권장

---

## 📞 추가 도움이 필요하신가요?

비밀번호를 찾을 수 없거나 설정에 문제가 있으면 다음 정보를 알려주세요:

1. 사용 중인 호스팅 서비스 (예: cPanel, AWS, DigitalOcean 등)
2. phpMyAdmin에 접속할 수 있는지 여부
3. 호스팅 서비스 대시보드에서 비밀번호 재설정 기능이 있는지

이 정보를 주시면 더 구체적으로 도와드릴 수 있습니다!
