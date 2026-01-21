# ✅ Supabase 최종 설정 가이드

## 현재 상태
- ✅ Supabase 프로젝트 연결 확인됨
- ✅ 테이블 존재 확인됨 (orders, memos, users)
- ⚠️ 스키마 캐시 문제로 데이터 삽입 실패

## 해결 방법

### 1단계: Supabase Dashboard에서 스키마 재생성

1. **Supabase Dashboard 접속**: https://supabase.com/dashboard
2. **HotelWorks Project** 선택
3. 왼쪽 메뉴 **SQL Editor** 클릭
4. **New Query** 버튼 클릭
5. **`CREATE_SCHEMA.sql` 파일 내용을 전체 복사**하여 붙여넣기
6. **Run** 버튼 클릭 (또는 `Ctrl+Enter`)
7. 성공 메시지 확인

이 SQL은 다음을 수행합니다:
- ✅ 테이블 생성 (이미 있으면 건너뜀)
- ✅ 인덱스 생성
- ✅ 트리거 생성
- ✅ RLS 정책 설정
- ✅ 초기 사용자 데이터 삽입

### 2단계: 환경 변수 확인

프로젝트 루트에 `.env` 파일이 있는지 확인하고, 없으면 생성:

```env
SUPABASE_URL=https://pnmkclrwmbmzrocyygwq.supabase.co
SUPABASE_ANON_KEY=sb_publishable_WdzcqWms_a8Cq623qNPWwQ_okBbp28Q
SUPABASE_SERVICE_ROLE_KEY=sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i

PORT=3001
SERVER_URL=http://localhost:3001
WS_SERVER_URL=ws://localhost:3001
```

### 3단계: 연결 테스트

```bash
npm run dev:all
```

브라우저에서 확인:
- `http://localhost:3001/health` - 서버 상태
- `http://localhost:3001/api/db/status` - Supabase 연결 상태

### 4단계: Vercel 환경 변수 설정 (배포용)

Vercel Dashboard에서 다음 환경 변수를 추가:

1. **Vercel Dashboard** 접속
2. 프로젝트 선택
3. **Settings** > **Environment Variables**
4. 다음 변수 추가:
   - `SUPABASE_URL` = `https://pnmkclrwmbmzrocyygwq.supabase.co`
   - `SUPABASE_ANON_KEY` = `sb_publishable_WdzcqWms_a8Cq623qNPWwQ_okBbp28Q`
   - `SUPABASE_SERVICE_ROLE_KEY` = `sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i`

## 기본 사용자 계정

스키마 실행 후 다음 계정으로 로그인 가능:

| Username | Password | 역할 |
|----------|----------|------|
| FD | FD | 프론트 데스크 |
| HK | HK | 하우스키핑 |
| 3 | 3 | 프론트 데스크 (로미오) |
| 4 | 4 | 하우스키핑 (줄리엣) |
| admin | admin | 관리자 |

## 문제 해결

### "Could not find the table" 오류
- Supabase Dashboard > SQL Editor에서 `CREATE_SCHEMA.sql` 실행
- 몇 분 기다린 후 다시 시도 (스키마 캐시 갱신 시간)

### 연결 실패
- API 키가 올바른지 확인
- Supabase 프로젝트가 활성화되어 있는지 확인

---

**중요**: `CREATE_SCHEMA.sql` 파일을 Supabase Dashboard에서 실행하면 모든 설정이 완료됩니다!
