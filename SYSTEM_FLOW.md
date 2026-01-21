# 🔄 HotelWorks 실시간 동기화 시스템 흐름도

## 📊 전체 시스템 아키텍처

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   PC/모바일 │         │   PC/모바일 │         │   PC/모바일 │
│  (기기 A)   │         │  (기기 B)   │         │  (기기 C)   │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │  WebSocket 연결       │  WebSocket 연결       │  WebSocket 연결
       │  (wss://...)          │  (wss://...)          │  (wss://...)
       │                       │                       │
       └───────────┬───────────┴───────────┬───────────┘
                   │                     │
                   │   Socket.IO          │
                   │   WebSocket 서버     │
                   │   (Render)          │
                   │                     │
       ┌───────────┴───────────┬───────────┘
       │                       │
       │  REST API             │  WebSocket
       │  (Supabase)           │  (브로드캐스트)
       │                       │
┌──────┴──────┐         ┌──────┴──────┐
│  Supabase   │         │  모든 기기   │
│  Database   │         │  (A, B, C)  │
│  (PostgreSQL)│        │             │
└─────────────┘         └─────────────┘
```

---

## 🔄 주문 생성 흐름도 (NEW_ORDER)

### 1단계: 사용자 액션 (기기 A)

```
사용자 (기기 A)
    │
    ├─ 주문 생성 버튼 클릭
    │
    ├─ 주문 정보 입력
    │   ├─ 방번호: 101
    │   ├─ 아이템: 물
    │   ├─ 수량: 2
    │   └─ 우선순위: NORMAL
    │
    └─ 저장 버튼 클릭
```

### 2단계: 클라이언트 처리 (기기 A)

```
App.tsx - handleCreateOrder()
    │
    ├─ 1. 주문 객체 생성
    │   ├─ ID 생성: "order_1234567890"
    │   ├─ 타임스탬프 생성
    │   └─ 사용자 정보 포함
    │
    ├─ 2. 로컬 상태 업데이트
    │   └─ setOrders() → 즉시 UI 반영
    │
    ├─ 3. localStorage 저장
    │   └─ 오프라인 대비
    │
    └─ 4. WebSocket 전송
        │
        ├─ socket.connected 확인
        │
        ├─ 메시지 구성
        │   ├─ type: "NEW_ORDER"
        │   ├─ payload: 주문 데이터
        │   ├─ senderId: "u1"
        │   ├─ sessionId: "session_xxx"
        │   └─ timestamp: "2026-01-21T..."
        │
        └─ socket.emit('hotelflow_sync', message)
            │
            └─ WebSocket 서버로 전송
```

### 3단계: 서버 처리 (Render)

```
server.js - socket.on('hotelflow_sync')
    │
    ├─ 1. 메시지 수신
    │   ├─ type: "NEW_ORDER"
    │   ├─ payload: 주문 데이터
    │   └─ senderId: "u1"
    │
    ├─ 2. 로그 출력
    │   └─ 콘솔에 상세 정보 출력
    │
    ├─ 3. 데이터베이스 저장
    │   │
    │   ├─ OrderModel.create(orderData)
    │   │
    │   ├─ Supabase에 주문 삽입
    │   │   ├─ orders 테이블
    │   │   └─ memos 테이블 (있는 경우)
    │   │
    │   └─ 저장 결과 확인
    │       ├─ 성공: 로그 출력
    │       └─ 실패: 오류 로그 (브로드캐스트는 계속)
    │
    └─ 4. 브로드캐스트
        │
        ├─ 연결된 클라이언트 수 확인
        │   └─ io.sockets.sockets.size
        │
        ├─ 메시지 구성
        │   ├─ type: "NEW_ORDER"
        │   ├─ payload: 주문 데이터
        │   ├─ senderId: "u1"
        │   └─ timestamp: "2026-01-21T..."
        │
        └─ io.emit('hotelflow_sync', message)
            │
            └─ 모든 연결된 클라이언트에게 전송
                ├─ 기기 A (발신자)
                ├─ 기기 B
                └─ 기기 C
```

### 4단계: 클라이언트 수신 (모든 기기)

```
App.tsx - socket.on('hotelflow_sync')
    │
    ├─ 1. 메시지 수신
    │   ├─ type: "NEW_ORDER"
    │   ├─ payload: 주문 데이터
    │   └─ senderId: "u1"
    │
    ├─ 2. 발신자 확인
    │   ├─ senderId === currentUser.id?
    │   ├─ sessionId === SESSION_ID?
    │   └─ isSelfMessage 판단
    │
    ├─ 3. UI 업데이트
    │   │
    │   ├─ 기기 A (발신자)
    │   │   ├─ 이미 로컬에 추가됨
    │   │   └─ 중복 방지 (스킵)
    │   │
    │   └─ 기기 B, C (수신자)
    │       ├─ setOrders() 업데이트
    │       ├─ 새 주문 추가
    │       └─ UI 즉시 반영
    │
    ├─ 4. 알림 표시
    │   │
    │   ├─ 기기 A (발신자)
    │   │   └─ 알림 스킵 (자신이 보낸 메시지)
    │   │
    │   └─ 기기 B, C (수신자)
    │       ├─ triggerToast() 호출
    │       ├─ 알림 메시지: "101호 신규 요청: 물 (수량: 2)"
    │       ├─ 사운드 재생: 'NEW_ORDER'
    │       └─ 화면에 토스트 표시
    │
    └─ 5. localStorage 업데이트
        └─ 오프라인 대비 저장
```

---

## 🔄 상태 변경 흐름도 (STATUS_UPDATE)

### 1단계: 사용자 액션 (기기 B)

```
사용자 (기기 B)
    │
    ├─ 주문 상태 변경 버튼 클릭
    │   └─ "수락" 버튼 클릭
    │
    └─ 상태 변경
        ├─ REQUESTED → ACCEPTED
        └─ acceptedAt: 현재 시간
```

### 2단계: 클라이언트 처리 (기기 B)

```
App.tsx - handleStatusChange()
    │
    ├─ 1. 로컬 상태 업데이트
    │   └─ setOrders() → 즉시 UI 반영
    │
    ├─ 2. localStorage 업데이트
    │
    └─ 3. WebSocket 전송
        │
        ├─ 메시지 구성
        │   ├─ type: "STATUS_UPDATE"
        │   ├─ payload: { id, status, acceptedAt }
        │   └─ senderId: "u2"
        │
        └─ socket.emit('hotelflow_sync', message)
```

### 3단계: 서버 처리 (Render)

```
server.js - socket.on('hotelflow_sync')
    │
    ├─ 1. 메시지 수신
    │   └─ type: "STATUS_UPDATE"
    │
    ├─ 2. 데이터베이스 업데이트
    │   │
    │   └─ OrderModel.update(orderId, updateData)
    │       │
    │       └─ Supabase orders 테이블 업데이트
    │           ├─ status: "ACCEPTED"
    │           └─ accepted_at: "2026-01-21T..."
    │
    └─ 3. 브로드캐스트
        │
        └─ io.emit('hotelflow_sync', message)
            │
            └─ 모든 기기에게 전송
```

### 4단계: 클라이언트 수신 (모든 기기)

```
App.tsx - socket.on('hotelflow_sync')
    │
    ├─ 1. 메시지 수신
    │   └─ type: "STATUS_UPDATE"
    │
    ├─ 2. UI 업데이트
    │   │
    │   └─ setOrders() 업데이트
    │       ├─ 주문 찾기
    │       ├─ 상태 업데이트
    │       └─ UI 즉시 반영
    │
    └─ 3. 알림 표시 (선택적)
        └─ 상태 변경 알림
```

---

## 🔄 메모 추가 흐름도 (NEW_MEMO)

### 1단계: 사용자 액션 (기기 C)

```
사용자 (기기 C)
    │
    └─ 메모 입력 및 전송
        ├─ 주문 선택
        ├─ 메모 입력: "빠른 배달 부탁"
        └─ 전송 버튼 클릭
```

### 2단계: 클라이언트 처리 (기기 C)

```
App.tsx - handleAddMemo()
    │
    ├─ 1. 메모 객체 생성
    │   ├─ ID 생성
    │   ├─ 텍스트
    │   └─ 발신자 정보
    │
    ├─ 2. 로컬 상태 업데이트
    │   └─ 주문의 memos 배열에 추가
    │
    └─ 3. WebSocket 전송
        │
        └─ socket.emit('hotelflow_sync', {
            type: "NEW_MEMO",
            payload: { orderId, memo }
        })
```

### 3단계: 서버 처리 (Render)

```
server.js - socket.on('hotelflow_sync')
    │
    ├─ 1. 메시지 수신
    │   └─ type: "NEW_MEMO"
    │
    ├─ 2. 데이터베이스 저장 (선택적)
    │   └─ memos 테이블에 저장
    │
    └─ 3. 브로드캐스트
        │
        └─ io.emit('hotelflow_sync', message)
```

### 4단계: 클라이언트 수신 (모든 기기)

```
App.tsx - socket.on('hotelflow_sync')
    │
    ├─ 1. 메시지 수신
    │   └─ type: "NEW_MEMO"
    │
    ├─ 2. UI 업데이트
    │   │
    │   └─ 주문의 memos 배열에 추가
    │
    └─ 3. 알림 표시
        └─ "101호 메모: 빠른 배달 부탁"
```

---

## 🔄 전체 동기화 흐름도 (연결 시)

### 1단계: WebSocket 연결

```
모든 기기
    │
    ├─ 1. 페이지 로드
    │
    ├─ 2. WebSocket URL 결정
    │   ├─ 환경 변수 확인
    │   ├─ localStorage 확인
    │   └─ 도메인 기반 결정
    │
    ├─ 3. Socket.IO 연결
    │   └─ io(wsUrl, options)
    │
    └─ 4. 연결 성공
        │
        ├─ socket.on('connect')
        │
        └─ 주문 목록 요청
            │
            └─ socket.emit('request_all_orders')
```

### 2단계: 서버 응답

```
server.js - socket.on('request_all_orders')
    │
    ├─ 1. 데이터베이스 조회
    │   │
    │   └─ OrderModel.findAll()
    │       │
    │       └─ Supabase에서 모든 주문 조회
    │           ├─ orders 테이블
    │           └─ memos 테이블 (JOIN)
    │
    ├─ 2. 요청자에게 직접 응답
    │   │
    │   └─ socket.emit('all_orders_response', {
    │       orders: [...],
    │       senderId: 'server'
    │   })
    │
    └─ 3. 다른 클라이언트에게 브로드캐스트
        │
        └─ socket.broadcast.emit('request_all_orders')
```

### 3단계: 클라이언트 수신

```
App.tsx - socket.on('all_orders_response')
    │
    ├─ 1. 주문 목록 수신
    │
    ├─ 2. 로컬 상태 업데이트
    │   └─ setOrders(orders)
    │
    └─ 3. localStorage 저장
        └─ 오프라인 대비
```

---

## 🔄 오프라인 큐 동기화 흐름도

### 오프라인 상태에서 주문 생성

```
기기 A (오프라인)
    │
    ├─ 1. 주문 생성
    │
    ├─ 2. WebSocket 연결 확인
    │   └─ socket.connected === false
    │
    └─ 3. 오프라인 큐에 저장
        │
        └─ localStorage.setItem('hotelflow_offline_queue', [...])
```

### 온라인 복귀 시 동기화

```
기기 A (온라인 복귀)
    │
    ├─ 1. WebSocket 연결 성공
    │   └─ socket.on('connect')
    │
    ├─ 2. 오프라인 큐 확인
    │   └─ localStorage.getItem('hotelflow_offline_queue')
    │
    ├─ 3. 큐에 있는 모든 메시지 전송
    │   │
    │   └─ queue.forEach(message => {
    │       socket.emit('hotelflow_sync', message)
    │   })
    │
    └─ 4. 큐 비우기
        └─ localStorage.removeItem('hotelflow_offline_queue')
```

---

## 📋 핵심 데이터 흐름 요약

### 주문 생성 시

```
[기기 A] 주문 생성
    ↓
[기기 A] WebSocket 전송
    ↓
[서버] 메시지 수신
    ↓
[서버] Supabase 저장
    ↓
[서버] 브로드캐스트
    ↓
[기기 A] 수신 (자신의 메시지 - 스킵)
[기기 B] 수신 → UI 업데이트 + 알림
[기기 C] 수신 → UI 업데이트 + 알림
```

### 상태 변경 시

```
[기기 B] 상태 변경
    ↓
[기기 B] WebSocket 전송
    ↓
[서버] 메시지 수신
    ↓
[서버] Supabase 업데이트
    ↓
[서버] 브로드캐스트
    ↓
[모든 기기] 수신 → UI 업데이트
```

---

## 🔑 핵심 포인트

1. **실시간 동기화**: WebSocket을 통한 즉시 전송
2. **데이터 일관성**: Supabase 데이터베이스에 저장
3. **오프라인 지원**: 오프라인 큐로 메시지 저장
4. **중복 방지**: sessionId로 자신의 메시지 구분
5. **알림 최적화**: 다른 사용자의 메시지만 알림 표시

---

**이 흐름도로 전체 시스템의 동작 방식을 이해할 수 있습니다!** 🎯
