# 🔧 Vercel 환경 변수 중복 오류 해결

## ❌ 오류 내용

```
A variable with the name 'SUPABASE_URL' already exists for the target production
```

이미 `SUPABASE_URL` 환경 변수가 존재합니다.

## ✅ 해결 방법

### 방법 1: 기존 변수 업데이트 (권장)

1. **환경 변수 목록**에서 `SUPABASE_URL` 찾기
2. **변수 클릭**하여 편집 모드 열기
3. **Value** 필드에 새 값 입력:
   ```
   https://pnmkclrwmbmzrocyygwq.supabase.co
   ```
4. **Save** 클릭

### 방법 2: 기존 변수 삭제 후 재추가

1. **환경 변수 목록**에서 `SUPABASE_URL` 찾기
2. **...** 메뉴 클릭 > **Delete** 클릭
3. **Add** 버튼으로 새로 추가:
   - Key: `SUPABASE_URL`
   - Value: `https://pnmkclrwmbmzrocyygwq.supabase.co`
   - Environment: ✅ Production ✅ Preview ✅ Development

## 📋 설정해야 할 환경 변수

다음 4개 변수가 모두 올바른 값으로 설정되어 있는지 확인:

1. **SUPABASE_URL**
   - 현재 값 확인 필요
   - 올바른 값: `https://pnmkclrwmbmzrocyygwq.supabase.co`

2. **SUPABASE_ANON_KEY**
   - 값: `sb_publishable_WdzcqWms_a8Cq623qNPWwQ_okBbp28Q`

3. **SUPABASE_SERVICE_ROLE_KEY**
   - 값: `sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i`

4. **VITE_WS_SERVER_URL**
   - 값: `wss://hotelworks.kr`

## 🔍 확인 사항

각 변수의 **현재 값**을 확인하고, 위의 올바른 값과 일치하는지 확인하세요.

---

**기존 변수를 업데이트하면 됩니다!** ✅
