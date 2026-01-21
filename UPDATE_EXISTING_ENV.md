# 🔧 기존 Vercel 환경 변수 업데이트 방법

## ❌ 문제

`SUPABASE_URL`이 이미 존재하여 새로 추가할 수 없습니다.

## ✅ 해결 방법

### 방법 1: 기존 변수 값 업데이트 (가장 쉬움)

1. **환경 변수 목록**에서 `SUPABASE_URL` 찾기
2. **변수 클릭** (또는 편집 아이콘 클릭)
3. **Value** 필드를 다음으로 변경:
   ```
   https://pnmkclrwmbmzrocyygwq.supabase.co
   ```
4. **Save** 클릭

### 방법 2: 기존 변수 삭제 후 재추가

1. **환경 변수 목록**에서 `SUPABASE_URL` 찾기
2. **...** 메뉴 (또는 오른쪽 아이콘) 클릭
3. **Delete** 클릭하여 삭제
4. **Add** 버튼 클릭
5. 새로 추가:
   - Key: `SUPABASE_URL`
   - Value: `https://pnmkclrwmbmzrocyygwq.supabase.co`
   - Environment: ✅ Production ✅ Preview ✅ Development 모두 체크
   - **Save** 클릭

## 📋 모든 환경 변수 확인

다음 4개 변수가 올바른 값으로 설정되어 있는지 확인:

| 변수 이름 | 올바른 값 |
|----------|----------|
| `SUPABASE_URL` | `https://pnmkclrwmbmzrocyygwq.supabase.co` |
| `SUPABASE_ANON_KEY` | `sb_publishable_WdzcqWms_a8Cq623qNPWwQ_okBbp28Q` |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i` |
| `VITE_WS_SERVER_URL` | `wss://hotelworks.kr` |

## 🔍 현재 값 확인

각 변수를 클릭하여 현재 값이 위의 "올바른 값"과 일치하는지 확인하세요.

**일치하지 않으면 업데이트하세요!**

---

**기존 변수를 업데이트하면 됩니다!** ✅
