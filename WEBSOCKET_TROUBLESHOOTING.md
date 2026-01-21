# 🔍 WebSocket 실시간 동기화 문제 해결 가이드

## 문제 상황

"admin"으로 주문을 했는데 실시간 동기화가 안 되는 경우

## 확인 사항

### 1. 브라우저 콘솔 확인 (F12)

주문 생성 시 다음 로그를 확인하세요:

#### ✅ 정상적인 경우
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📤 주문 전송 시작
   주문 ID: 20260121_22
   방번호: 618
   아이템: 중형 타월(Face Towel)
   수량: 1
   발신자: u1 (admin)
   세션 ID: session_...
   Socket ID: abc123
   연결 상태: ✅ 연결됨
   WebSocket URL: wss://...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📨 전송할 메시지: {...}
✅ 브로드캐스트 전송 완료: 20260121_22
✅ 메시지 전송 후 WebSocket 연결 유지 확인
```

#### ❌ 문제가 있는 경우

**케이스 1: WebSocket 연결 안 됨**
```
❌ WebSocket 연결되지 않음!
   주문 ID: 20260121_22
   방번호: 618
   Socket ID: undefined
   연결 상태: false
   WebSocket URL: wss://...
💾 오프라인 큐에 저장됨. 연결 후 자동 전송됩니다.
🔄 WebSocket 재연결 시도
```

**해결 방법:**
1. WebSocket URL이 올바른지 확인
2. Render 서버가 실행 중인지 확인
3. 네트워크 연결 확인
4. 브라우저 새로고침

**케이스 2: 메시지 전송 후 연결 끊김**
```
✅ 브로드캐스트 전송 완료: 20260121_22
❌ 메시지 전송 후 WebSocket 연결 끊김 감지
   - 재연결 시도 필요
   - 오프라인 큐에 저장됨
```

**해결 방법:**
1. 네트워크 연결 안정성 확인
2. Render 서버 상태 확인
3. 자동 재연결 대기 (2-3초)

### 2. Supabase 데이터 확인

주문이 실제로 저장되었는지 확인:

```sql
SELECT id, room_no, item_name, status, created_at, created_by 
FROM orders 
WHERE room_no = '618' 
ORDER BY created_at DESC 
LIMIT 5;
```

**결과:**
- 데이터가 있으면: 서버에서 저장 성공 ✅
- 데이터가 없으면: 서버로 전송 실패 또는 저장 실패 ❌

### 3. Render 서버 로그 확인

Render Dashboard → `hotelworks-backend` → **Logs** 탭에서:

#### ✅ 정상적인 경우
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📨 서버 메시지 수신: NEW_ORDER
   발신자: u1
   Socket ID: abc123
   주문 ID: 20260121_22
   방번호: 618
   아이템: 중형 타월(Face Towel)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   💾 DB 저장 시도: 20260121_22
   💾 DB 저장 완료 (NEW_ORDER): 20260121_22
   📡 브로드캐스트 시작 - 3개 클라이언트에게 전송
   ✅ 브로드캐스트 완료
```

#### ❌ 문제가 있는 경우

**케이스 1: 메시지 수신 안 됨**
- 로그에 "📨 서버 메시지 수신"이 없음
- **원인**: 클라이언트에서 서버로 전송 실패

**케이스 2: DB 저장 실패**
```
   💾 DB 저장 시도: 20260121_22
   ❌ DB 저장 오류: ...
```
- **원인**: Supabase 연결 문제 또는 RLS 정책 문제

**케이스 3: 브로드캐스트 실패**
```
   📡 브로드캐스트 시작 - 0개 클라이언트에게 전송
```
- **원인**: 다른 클라이언트가 연결되지 않음

### 4. 오프라인 큐 확인

브라우저 콘솔에서:

```javascript
// 오프라인 큐 확인
const queue = JSON.parse(localStorage.getItem('hotelflow_offline_queue') || '[]');
console.log('오프라인 큐:', queue);
console.log('큐 크기:', queue.length);
```

**결과:**
- 큐가 비어있으면: 모든 메시지 전송 완료 ✅
- 큐에 메시지가 있으면: 전송 실패, 재연결 대기 중 ⏳

### 5. WebSocket 연결 상태 확인

브라우저 콘솔에서:

```javascript
// WebSocket 연결 상태 확인
const socket = window.socket; // 또는 React DevTools에서 확인
console.log('Socket 존재:', !!socket);
console.log('연결 상태:', socket?.connected);
console.log('Socket ID:', socket?.id);
```

## 해결 방법

### 방법 1: 수동 재연결

1. 브라우저 새로고침 (F5)
2. WebSocket 자동 재연결 대기
3. 오프라인 큐 자동 동기화 확인

### 방법 2: 오프라인 큐 수동 동기화

브라우저 콘솔에서:

```javascript
// 오프라인 큐 확인
const queue = JSON.parse(localStorage.getItem('hotelflow_offline_queue') || '[]');
console.log('오프라인 큐:', queue);

// 큐가 있으면 페이지 새로고침으로 자동 동기화
if (queue.length > 0) {
  console.log('오프라인 큐가 있습니다. 페이지를 새로고침하세요.');
  location.reload();
}
```

### 방법 3: WebSocket URL 확인

Settings 페이지에서:
1. WebSocket URL 확인
2. 연결 테스트 버튼 클릭
3. 연결 성공 시 주문 재시도

### 방법 4: Render 서버 재시작

Render Dashboard에서:
1. `hotelworks-backend` 서비스 선택
2. Manual Deploy 클릭
3. 배포 완료 대기

## 예방 방법

1. **정기적인 연결 상태 확인**
   - Settings 페이지에서 연결 상태 확인
   - 연결이 끊어지면 자동 재연결 대기

2. **오프라인 큐 모니터링**
   - 주문 생성 후 콘솔에서 오프라인 큐 확인
   - 큐에 메시지가 있으면 재연결 대기

3. **네트워크 안정성**
   - 안정적인 네트워크 환경에서 사용
   - 모바일 데이터 사용 시 연결 불안정 가능

## 추가 디버깅

### 디버그 모드 활성화

Settings 페이지에서:
1. "디버그 로깅" 활성화
2. "WebSocket 메시지 로깅" 활성화
3. 브라우저 콘솔에서 상세 로그 확인

### 로그 파일 확인

브라우저 콘솔에서:
1. F12 → Console 탭
2. 필터: "WebSocket", "주문", "동기화"
3. 로그 내용 확인

---

**문제가 계속되면:**
1. 브라우저 콘솔 로그 스크린샷
2. Render 서버 로그 스크린샷
3. Supabase 데이터 확인 결과
4. 오프라인 큐 내용

위 정보를 함께 제공해주시면 더 정확한 진단이 가능합니다.
