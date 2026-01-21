# 🔍 데이터베이스 저장 문제 디버깅 가이드

## 문제 상황

950호에 와인잔을 주문했는데 Supabase에 저장이 안 되는 것처럼 보입니다.

## 확인 사항

### 1. Supabase 데이터 확인

실제로 Supabase에 데이터가 있는지 확인:
```sql
SELECT * FROM orders WHERE room_no = '950' ORDER BY created_at DESC;
```

**확인 결과**: 데이터가 저장되어 있습니다!
- `id: "20260121_12"`
- `room_no: "950"`
- `item_name: "와인잔"`
- `status: "REQUESTED"`
- `created_at: "2026-01-21 13:51:51"`

### 2. 가능한 문제

1. **UI 업데이트 문제**
   - 데이터는 저장되었지만 UI에 반영되지 않음
   - 브라우저 새로고침 필요

2. **실시간 동기화 문제**
   - 다른 기기에서 보이지 않음
   - WebSocket 연결 문제

3. **RLS 정책 문제**
   - 데이터는 저장되었지만 조회 시 필터링됨
   - RLS 정책 확인 필요

4. **타임스탬프 문제**
   - Supabase Table Editor에서 최신 데이터가 보이지 않음
   - 정렬 기준 확인

## 해결 방법

### 1. 브라우저 새로고침

1. F5 또는 Ctrl+R로 페이지 새로고침
2. 주문 목록 다시 확인

### 2. Render 서버 로그 확인

Render Dashboard → `hotelworks-backend` → **Logs** 탭에서:
- "💾 DB 저장 시도" 로그 확인
- "💾 DB 저장 완료" 로그 확인
- "❌ DB 저장 오류" 로그 확인

### 3. 브라우저 콘솔 확인

F12 → Console 탭에서:
- "📤 주문 전송" 로그 확인
- "📥 WebSocket 메시지 수신" 로그 확인
- 오류 메시지 확인

### 4. Supabase Table Editor 확인

1. Supabase Dashboard → Table Editor
2. `orders` 테이블 선택
3. 정렬: `created_at` DESC
4. 필터: `room_no = '950'`
5. 데이터 확인

## 개선 사항

### 로깅 강화

1. **server.js**
   - DB 저장 시도/완료 로그 추가
   - 저장된 주문 상세 정보 로그
   - 오류 발생 시 상세 스택 트레이스

2. **OrderModel.js**
   - Supabase INSERT 시도/완료 로그
   - INSERT 데이터 내용 로그
   - 오류 발생 시 상세 정보

## 테스트 방법

1. **새 주문 생성**
   - 950호에 다른 아이템 주문
   - 브라우저 콘솔에서 로그 확인
   - Render 서버 로그 확인
   - Supabase에서 데이터 확인

2. **다른 기기에서 확인**
   - 다른 기기에서 접속
   - 주문 목록 확인
   - 실시간 동기화 확인

---

**데이터는 저장되고 있습니다. UI 업데이트나 실시간 동기화 문제일 수 있습니다!** 🔍
