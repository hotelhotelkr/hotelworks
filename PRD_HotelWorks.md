# Product Requirements Document (PRD)
# HotelWorks - Hotel Operations Management System

---

## 📋 Document Information

- **Product Name**: HotelWorks
- **Version**: 1.0.0
- **Last Updated**: 2026-01-09
- **Document Owner**: Product Team
- **Status**: Active Development

---

## 🎯 Executive Summary

HotelWorks는 호텔 운영의 효율성을 극대화하기 위해 설계된 **실시간 주문 관리 및 부서 간 협업 시스템**입니다. Front Desk(프론트 데스크)와 Housekeeping(하우스키핑) 부서 간의 원활한 커뮤니케이션을 지원하며, 객실 관련 요청사항을 실시간으로 추적하고 관리합니다.

### 핵심 가치 제안
- **실시간 동기화**: WebSocket 기반으로 모든 디바이스 간 즉각적인 데이터 동기화
- **부서 간 협업**: Front Desk와 Housekeeping 간 효율적인 업무 흐름
- **모바일 최적화**: PC와 모바일 모두에서 완벽하게 작동
- **직관적 UX**: 최소한의 클릭으로 업무 처리 가능

---

## 🎨 Product Vision

### 미션
"호텔 운영의 디지털 전환을 통해 고객 만족도를 높이고, 직원들의 업무 효율성을 극대화한다."

### 목표
1. 객실 요청 처리 시간 **50% 단축**
2. 부서 간 커뮤니케이션 오류 **80% 감소**
3. 업무 진행 상황의 **실시간 가시성** 확보
4. 모바일 환경에서의 **원활한 업무 수행**

---

## 👥 Target Users

### 1. Front Desk Staff (프론트 데스크 직원)
- **역할**: 고객 요청 접수 및 Housekeeping에 전달
- **니즈**: 
  - 빠른 주문 생성 (1초 내 완료)
  - 주문 상태 실시간 확인
  - 긴급 요청 우선순위 설정
- **페인 포인트**:
  - 전화/무전기를 통한 수작업 전달의 비효율성
  - 요청 누락 및 혼선
  - 처리 상태 확인의 어려움

### 2. Housekeeping Staff (하우스키핑 직원)
- **역할**: 배정된 작업 확인 및 수행
- **니즈**:
  - 모바일에서 작업 목록 확인
  - 작업 상태 빠른 업데이트
  - 우선순위 기반 작업 순서 파악
- **페인 포인트**:
  - 이동 중 작업 확인의 어려움
  - 완료 보고의 번거로움
  - 여러 요청 간 우선순위 혼란

### 3. Admin (관리자)
- **역할**: 시스템 관리 및 통계 분석
- **니즈**:
  - 전체 운영 현황 대시보드
  - 시간대별/층별 통계 분석
  - 직원 관리 및 권한 설정
- **페인 포인트**:
  - 운영 데이터의 가시성 부족
  - 성과 측정의 어려움

---

## 🏗️ System Architecture

### Technical Stack

#### Frontend
- **Framework**: React 19.2.3 + TypeScript 5.8.2
- **Build Tool**: Vite 6.2.0
- **Router**: React Router DOM 7.11.0
- **Charts**: Recharts 3.6.0
- **Icons**: Lucide React 0.562.0
- **Mobile**: Capacitor 8.0.0

#### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express 4.18.2
- **Real-time**: Socket.IO 4.7.5
- **Database**: MySQL 8.0+
- **ORM**: Custom MySQL2 3.9.0

#### Infrastructure
- **Development Server**: 
  - Frontend: Vite Dev Server (Port 3000)
  - Backend: Express + Socket.IO (Port 3001)
- **WebSocket**: wss://hotelworks.kr
- **Database**: MySQL with connection pooling

### Data Flow Architecture

```
┌─────────────────┐
│  Client (PC)    │◄───────┐
└─────────────────┘        │
                           │
┌─────────────────┐        │  WebSocket (Real-time)
│Client (Mobile)  │◄───────┼────────────────────────┐
└─────────────────┘        │                        │
                           │                        │
┌─────────────────┐        │                        ▼
│  Client (Tab)   │◄───────┤              ┌──────────────────┐
└─────────────────┘        │              │  Socket.IO       │
                           │              │  Server          │
                           └──────────────┤  (Port 3001)     │
                                          └──────────────────┘
                                                   │
                                                   │ MySQL Connection
                                                   ▼
                                          ┌──────────────────┐
                                          │  MySQL Database  │
                                          │  - orders        │
                                          │  - memos         │
                                          │  - users         │
                                          └──────────────────┘
```

---

## 📊 Data Models

### 1. User Model
```typescript
interface User {
  id: string;              // 고유 ID (UUID)
  username: string;        // 로그인 ID (unique)
  password?: string;       // 암호화된 비밀번호
  name: string;           // 직원 이름
  dept: Department;       // 부서 (FRONT_DESK | HOUSEKEEPING | ADMIN)
  role: Role;            // 역할 (FD_STAFF | HK_STAFF | ADMIN)
}

enum Department {
  FRONT_DESK = 'FRONT_DESK',
  HOUSEKEEPING = 'HOUSEKEEPING',
  ADMIN = 'ADMIN'
}

enum Role {
  FD_STAFF = 'FD_STAFF',
  HK_STAFF = 'HK_STAFF',
  ADMIN = 'ADMIN'
}
```

### 2. Order Model
```typescript
interface Order {
  id: string;                    // 주문 고유 ID (UUID)
  roomNo: string;                // 객실 번호 (예: "501", "712")
  guestName?: string;            // 투숙객 이름 (선택)
  category: string;              // 카테고리 (Amenities, Delivery, etc.)
  itemName: string;              // 요청 아이템명
  quantity: number;              // 수량
  priority: Priority;            // 우선순위 (NORMAL | URGENT)
  status: OrderStatus;           // 주문 상태
  requestedAt: Date;             // 요청 시간
  acceptedAt?: Date;             // 접수 시간
  inProgressAt?: Date;           // 진행 시작 시간
  completedAt?: Date;            // 완료 시간
  createdBy: string;             // 생성자 User ID
  assignedTo?: string;           // 담당자 User ID
  requestChannel: string;        // 요청 경로 (PC | MOBILE | PHONE)
  requestNote?: string;          // 요청 메모
  memos: Memo[];                // 메모 목록
}

enum OrderStatus {
  REQUESTED = 'REQUESTED',       // 요청됨
  ACCEPTED = 'ACCEPTED',         // 접수됨 (HK가 확인)
  IN_PROGRESS = 'IN_PROGRESS',   // 진행중 (HK가 이동 시작)
  COMPLETED = 'COMPLETED',       // 완료됨
  CANCELLED = 'CANCELLED'        // 취소됨
}

enum Priority {
  NORMAL = 'NORMAL',             // 일반
  URGENT = 'URGENT'              // 긴급
}
```

### 3. Memo Model
```typescript
interface Memo {
  id: string;                    // 메모 고유 ID (UUID)
  text: string;                  // 메모 내용
  senderId: string;              // 작성자 User ID
  senderName: string;            // 작성자 이름
  senderDept: Department;        // 작성자 부서
  timestamp: Date;               // 작성 시간
}
```

### 4. Database Schema

#### orders 테이블
```sql
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(50) PRIMARY KEY,
  room_no VARCHAR(20) NOT NULL,
  guest_name VARCHAR(100),
  category VARCHAR(100) NOT NULL,
  item_name VARCHAR(200) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  priority ENUM('NORMAL', 'URGENT') NOT NULL DEFAULT 'NORMAL',
  status ENUM('REQUESTED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'REQUESTED',
  requested_at DATETIME NOT NULL,
  accepted_at DATETIME,
  in_progress_at DATETIME,
  completed_at DATETIME,
  created_by VARCHAR(50) NOT NULL,
  assigned_to VARCHAR(50),
  request_channel VARCHAR(50) NOT NULL,
  request_note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_room_no (room_no),
  INDEX idx_status (status),
  INDEX idx_created_by (created_by),
  INDEX idx_assigned_to (assigned_to),
  INDEX idx_requested_at (requested_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### memos 테이블
```sql
CREATE TABLE IF NOT EXISTS memos (
  id VARCHAR(50) PRIMARY KEY,
  order_id VARCHAR(50) NOT NULL,
  text TEXT NOT NULL,
  sender_id VARCHAR(50) NOT NULL,
  sender_name VARCHAR(100) NOT NULL,
  sender_dept ENUM('FRONT_DESK', 'HOUSEKEEPING', 'ADMIN') NOT NULL,
  timestamp DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_order_id (order_id),
  INDEX idx_sender_id (sender_id),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### users 테이블
```sql
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  dept ENUM('FRONT_DESK', 'HOUSEKEEPING', 'ADMIN') NOT NULL,
  role ENUM('FD_STAFF', 'HK_STAFF', 'ADMIN') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_dept (dept)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 🎯 Core Features

### Feature 1: Rapid Order Dispatch (빠른 주문 생성)

**목적**: Front Desk 직원이 최소한의 클릭으로 주문을 생성할 수 있도록 함

**사용자 흐름**:
1. 층 선택 (5F ~ 10F) 또는 방 번호 직접 검색
2. 객실 선택 (501 ~ 550호실, 각 층별 50개 객실)
3. 필요한 어메니티 선택 (다중 선택 가능)
4. 수량 조정 (+ / - 버튼)
5. 우선순위 설정 (Normal / Urgent)
6. 메모 입력 (선택)
7. "HK에 요청하기" 버튼 클릭

**지원 어메니티 (19종)**:
- **음료**: 생수
- **타월류**: 대형 타월(Bath Towel), 중형 타월(Face Towel), 발매트, 샤워가운
- **침구류**: 베개, 침구세트
- **세면용품**: 샴푸, 린스, 바디워시, 칫솔/치약, 드라이기
- **기타**: 슬리퍼, 어댑터, 런드리 봉투
- **식기류**: 숟가락, 젓가락, 포크, 와인잔
- **직접 입력**: 목록에 없는 아이템 직접 추가 가능

**기술 구현**:
- 컴포넌트: `RapidOrder.tsx`
- 검색 기능: 실시간 필터링 (층별 + 방 번호)
- Enter 키 지원: 검색 결과 첫 번째 방 자동 선택
- 중복 방지: `isDispatching` 플래그로 중복 제출 방지
- 배치 전송: 여러 아이템을 50ms 간격으로 순차 전송

**성공 지표**:
- 주문 생성 완료 시간: **5초 이내**
- 사용자 클릭 수: **평균 4~6회**
- 오류율: **1% 미만**

---

### Feature 2: Order Status Management (주문 상태 관리)

**목적**: 주문의 전체 생명주기를 추적하고 관리

**주문 상태 흐름**:
```
REQUESTED → ACCEPTED → IN_PROGRESS → COMPLETED
    ↓
CANCELLED
```

**상태별 설명**:

1. **REQUESTED (요청됨)**
   - Front Desk가 주문 생성 시 초기 상태
   - 색상: Amber (주황색)
   - 가능한 액션:
     - **접수** (HK/Admin만): ACCEPTED로 변경
     - **완료**: COMPLETED로 바로 변경
     - **취소** (FD/Admin만): CANCELLED로 변경

2. **ACCEPTED (접수됨)**
   - Housekeeping이 주문을 확인하고 접수
   - 색상: Blue (파란색)
   - 가능한 액션:
     - **출발** (HK/Admin만): IN_PROGRESS로 변경
     - **완료**: COMPLETED로 바로 변경
     - **취소** (FD/Admin만): CANCELLED로 변경

3. **IN_PROGRESS (진행중)**
   - Housekeeping이 현장으로 이동 중
   - 색상: Indigo (남색)
   - 가능한 액션:
     - **완료**: COMPLETED로 변경
     - **취소** (FD/Admin만): CANCELLED로 변경

4. **COMPLETED (완료됨)**
   - 주문 처리 완료
   - 색상: Emerald (초록색)
   - 완료 시 메모 작성 가능 (선택)
   - 가능한 액션:
     - **다시 시작**: REQUESTED로 다시 변경

5. **CANCELLED (취소됨)**
   - 주문이 취소됨
   - 색상: Slate (회색)
   - 시각적 효과: 굵은 취소선 + 회색 처리 + 반투명
   - 가능한 액션:
     - **복구** (Admin만): REQUESTED로 변경

**우선순위 시스템**:
- **NORMAL**: 일반 우선순위 (회색 텍스트)
- **URGENT**: 긴급 우선순위 (빨간색 + 굵은 글씨 + 애니메이션)

**경과 시간 표시**:
- 요청 시간부터 현재까지의 경과 시간을 분 단위로 표시
- 예: "15m", "45m", "120m"
- CANCELLED 상태에서는 "--" 표시

---

### Feature 3: Real-time Synchronization (실시간 동기화)

**목적**: 모든 디바이스 간 즉각적인 데이터 동기화

**기술 스택**:
- **WebSocket**: Socket.IO 4.7.5
- **프로토콜**: wss:// (Secure WebSocket)
- **Fallback**: Long Polling

**동기화 메커니즘**:

1. **연결 관리**:
   ```javascript
   // WebSocket URL 우선순위:
   1. localStorage의 저장된 URL
   2. 환경 변수 (VITE_WS_SERVER_URL)
   3. 현재 호스트:3001 (자동 감지)
   ```

2. **이벤트 타입**:
   - `hotelflow_sync`: 주문 생성/업데이트/삭제
   - `order_created`: 새 주문 알림
   - `order_updated`: 주문 상태 변경 알림
   - `order_status_changed`: 상태 변경 전용 알림
   - `memo_added`: 메모 추가 알림
   - `order_cancelled`: 주문 취소 알림

3. **Offline Queue**:
   - 오프라인 시 로컬에 변경사항 저장
   - 재연결 시 자동 동기화
   - localStorage 기반 큐 관리

4. **충돌 해결**:
   - Last Write Wins (LWW) 전략
   - Timestamp 기반 충돌 해결

**연결 상태 표시**:
- ✅ **CONNECTED**: 정상 연결 (초록색)
- 🔄 **CONNECTING**: 연결 중 (파란색)
- ⚠️ **DISCONNECTED**: 연결 끊김 (빨간색)
- 📡 **RECONNECTING**: 재연결 중 (주황색)

**성능 요구사항**:
- 연결 대기 시간: **3초 이내**
- 이벤트 전파 시간: **500ms 이내**
- 재연결 시도: 최대 5회 (exponential backoff)

---

### Feature 4: Dashboard & Analytics (대시보드 및 분석)

**목적**: 운영 현황을 한눈에 파악하고 데이터 기반 의사결정 지원

#### 4.1 KPI 카드 (실시간 업데이트)
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│  Pending    │   Active    │   Urgent    │  Resolved   │
│     12      │      5      │      2      │     45      │
│  대기 중    │  처리 중    │   긴급      │   완료      │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

**지표 설명**:
- **Pending**: REQUESTED 상태의 주문 수
- **Active**: ACCEPTED + IN_PROGRESS 상태의 주문 수
- **Urgent**: 긴급 우선순위 중 미완료 주문 수
- **Resolved**: COMPLETED 상태의 주문 수 (오늘)

#### 4.2 운영 흐름 차트 (Bar Chart)
- 상태별 주문 분포 시각화
- 실시간 업데이트
- 색상 코딩: Requested(Amber), Active(Indigo), Done(Emerald)

#### 4.3 24시간 시간대별 통계 (Stock Chart Style)
```
📊 오늘 총 오더: 128건
   완료: 85 | 진행: 12 | 대기: 31
   평균: 5.3오더/시간 | 최대: 18오더 (14:00)

   [Area Chart - 24시간 시간대별 주문량]
   
   23시: 5건 (자정 전 피크 타임 표시)
```

**분석 기능**:
- 시간대별 주문량 추세 (Area Chart)
- 전일 대비 변화율 (%)
- 피크 타임 자동 감지
- 완료/진행/대기 상태별 분포
- Hover 시 상세 정보 표시

**차트 인터랙션**:
- X축: 00:00 ~ 23:00 (24시간)
- Y축: 주문 수 (자동 스케일링)
- 툴팁: 시간대, 총 건수, 상태별 분포, 변화율

#### 4.4 최근 활동 (Recent Activity)
- Front Desk: 최근 50개 주문 표시
- Housekeeping: 활성 작업 목록 (미완료 건)
- 필터링: 상태/우선순위/객실번호
- 정렬: 최신순 (위에서 아래로)

---

### Feature 5: Memo System (메모 시스템)

**목적**: 주문별 부서 간 커뮤니케이션 지원

**기능**:
1. **메모 작성**
   - 모든 사용자가 모든 주문에 메모 작성 가능
   - 실시간 동기화
   - 작성자 정보 자동 기록 (이름, 부서, 시간)

2. **메모 표시**
   - 주문 목록에서 최근 2개 메모 표시
   - Front Desk 메모: 주황색 배경
   - Housekeeping 메모: 파란색 배경
   - "메모 더보기" 버튼으로 전체 이력 확인

3. **메모 모달**
   - 전체 메모 이력 표시 (시간순)
   - 새 메모 작성
   - 스크롤 가능한 이력
   - 모바일 최적화

**시각적 구분**:
```
┌────────────────────────────────┐
│ 🔸 FD • 김프론트               │
│ "502호 샴푸 2개 추가 요청"     │
└────────────────────────────────┘

┌────────────────────────────────┐
│ ✅ HK • 박하우스               │
│ "확인했습니다. 5분 내 도착"    │
└────────────────────────────────┘
```

---

### Feature 6: Excel Export (엑셀 내보내기)

**목적**: 주문 데이터를 Excel 형식으로 내보내기

**내보내기 항목**:
- 주문 ID
- 객실 번호
- 아이템명
- 수량
- 우선순위
- 상태
- 요청 시간
- 접수 시간
- 완료 시간
- 처리 시간 (분)
- 생성자
- 메모 수

**파일명 규칙**:
```
HotelWorks_Orders_YYYYMMDD_HHMMSS.xlsx
예: HotelWorks_Orders_20260109_143522.xlsx
```

**라이브러리**: SheetJS (xlsx)

**데이터 포맷**:
- UTF-8 인코딩
- 한글 지원
- 날짜/시간: ISO 8601 형식
- 숫자: 쉼표 구분자

---

### Feature 7: Mobile Optimization (모바일 최적화)

**목적**: 이동 중인 Housekeeping 직원을 위한 모바일 UX

**반응형 디자인**:
- **Desktop (≥1024px)**: 3단 레이아웃 (Room | Items | Order)
- **Tablet (768px~1023px)**: 2단 레이아ウ�
- **Mobile (<768px)**: 1단 레이아웃, 카드형 UI

**모바일 최적화 요소**:
1. **터치 타겟**:
   - 최소 크기: 44px × 44px (iOS 가이드라인)
   - 버튼 간격: 최소 8px

2. **제스처**:
   - 스와이프: 주문 목록 스크롤
   - 탭: 주문 선택/상태 변경
   - 롱 프레스: 메모 빠른 추가

3. **오프라인 모드**:
   - 로컬 스토리지 기반 캐싱
   - 오프라인 큐 관리
   - 재연결 시 자동 동기화

4. **PWA 기능**:
   - 홈 화면 추가 가능
   - 오프라인 작동
   - 푸시 알림 (Capacitor)
   - 스플래시 화면

**Capacitor 통합**:
- **플랫폼**: iOS, Android
- **플러그인**:
  - Push Notifications: 실시간 알림
  - Haptics: 촉각 피드백
  - Status Bar: 상태바 커스터마이징
  - Keyboard: 키보드 처리
  - Network: 네트워크 상태 감지

---

### Feature 8: User Management (사용자 관리)

**목적**: 부서별 권한 관리 및 직원 계정 관리

**권한 매트릭스**:

| 기능 | FD_STAFF | HK_STAFF | ADMIN |
|------|----------|----------|-------|
| 주문 생성 | ✅ | ❌ | ✅ |
| 주문 접수 | ❌ | ✅ | ✅ |
| 주문 진행 | ❌ | ✅ | ✅ |
| 주문 완료 | ✅ | ✅ | ✅ |
| 주문 취소 | ✅ | ❌ | ✅ |
| 취소 복구 | ❌ | ❌ | ✅ |
| 메모 작성 | ✅ | ✅ | ✅ |
| 통계 확인 | ✅ | ✅ | ✅ |
| 직원 관리 | ❌ | ❌ | ✅ |

**Admin 기능**:
1. **직원 관리**:
   - 직원 추가/수정/삭제
   - 부서 배정
   - 권한 설정
   - 비밀번호 초기화

2. **시스템 설정**:
   - WebSocket URL 설정
   - 디버그 로깅 활성화
   - 데이터 백업/복구

---

## 🎨 User Interface Design

### Design System

#### Color Palette
```css
/* Primary Colors */
--indigo-600: #4f46e5;    /* 주요 액션 버튼 */
--indigo-700: #4338ca;    /* Hover 상태 */
--indigo-50: #eef2ff;     /* 배경 */

/* Status Colors */
--amber-600: #d97706;     /* REQUESTED */
--blue-600: #2563eb;      /* ACCEPTED */
--indigo-600: #4f46e5;    /* IN_PROGRESS */
--emerald-600: #059669;   /* COMPLETED */
--slate-500: #64748b;     /* CANCELLED */

/* Priority Colors */
--rose-600: #e11d48;      /* URGENT */
--slate-500: #64748b;     /* NORMAL */

/* Semantic Colors */
--success: #10b981;
--warning: #f59e0b;
--error: #ef4444;
--info: #3b82f6;
```

#### Typography
```css
/* Font Family */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Font Sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */

/* Font Weights */
--font-medium: 500;
--font-bold: 700;
--font-black: 900;
```

#### Spacing
```css
/* Base unit: 4px */
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
```

#### Border Radius
```css
--rounded-lg: 0.5rem;    /* 8px */
--rounded-xl: 0.75rem;   /* 12px */
--rounded-2xl: 1rem;     /* 16px */
--rounded-3xl: 1.5rem;   /* 24px */
```

### Component Patterns

#### Button Styles
1. **Primary**: 주요 액션 (주문하기, 완료 등)
2. **Secondary**: 보조 액션 (취소, 뒤로가기)
3. **Danger**: 위험한 액션 (삭제, 취소)
4. **Ghost**: 텍스트 버튼

#### Card Styles
1. **Default**: 흰색 배경 + 테두리 + 그림자
2. **Elevated**: 강한 그림자 효과
3. **Flat**: 그림자 없음

#### Status Badges
- 둥근 모서리 (rounded-full)
- 아이콘 + 텍스트
- 상태별 색상 코딩

---

## 🔊 Sound & Haptic Feedback

### Sound Effects

**사운드 타입**:
1. **NEW_ORDER**: 새 주문 생성 (FD → HK)
2. **SUCCESS**: 작업 완료
3. **MEMO**: 새 메모 추가
4. **ALERT**: 긴급 요청
5. **UPDATE**: 상태 변경
6. **LOGIN**: 로그인 성공
7. **CANCEL**: 주문 취소

**사운드 설정**:
- 볼륨: 사용자 조절 가능
- 음소거 모드 지원
- 부서별 다른 사운드 (FD/HK 구분)

### Haptic Feedback (모바일)

**피드백 타입**:
1. **Light**: 버튼 탭
2. **Medium**: 상태 변경
3. **Heavy**: 중요 액션 (완료, 취소)
4. **Success**: 작업 성공
5. **Warning**: 경고
6. **Error**: 오류

---

## 🔔 Notification System

### Toast Notifications

**표시 위치**: 화면 우측 상단
**표시 시간**: 5초 (자동 사라짐)
**스택**: 최대 3개까지 동시 표시

**알림 타입**:
1. **INFO**: 일반 정보 (파란색)
2. **SUCCESS**: 성공 메시지 (초록색)
3. **WARNING**: 경고 (주황색)
4. **ERROR**: 오류 (빨간색)
5. **MEMO**: 메모 추가 (보라색)

**알림 예시**:
```
✅ 501호 주문이 완료되었습니다.
📝 김하우스님이 메모를 추가했습니다.
⚠️ 긴급 요청: 715호 (생수 3개)
❌ 주문이 취소되었습니다.
```

### Push Notifications (모바일)

**권한 요청**: 최초 로그인 시
**알림 시나리오**:

1. **Housekeeping 알림**:
   - 새 주문 생성
   - 긴급 요청
   - Front Desk 메모 추가

2. **Front Desk 알림**:
   - 주문 완료
   - Housekeeping 메모 추가
   - 처리 지연 (30분 이상)

---

## 📱 Screen Specifications

### 1. Login Screen
- **경로**: `/` (기본)
- **컴포넌트**: `Login.tsx`
- **레이아웃**: 중앙 정렬 카드
- **입력 필드**:
  - Username (ID)
  - Password (비밀번호)
- **버튼**: Sign In
- **하단**: 비밀번호 분실 시 연락처 (HotelHotel@kakao.com)

### 2. Dashboard Screen
- **경로**: `/dashboard`
- **컴포넌트**: `Dashboard.tsx`
- **권한**: 모든 사용자
- **레이아웃**:
  - KPI 카드 (4개)
  - Rapid Order (FD/Admin만)
  - Recent Activity / Active Tasks
  - Analytics Charts (24시간 통계)

### 3. Orders Screen
- **경로**: `/orders`
- **컴포넌트**: `OrderList.tsx`
- **권한**: 모든 사용자
- **레이아웃**:
  - 필터 바 (검색, 상태 필터)
  - 주문 테이블 (데스크톱)
  - 주문 카드 (모바일)
- **기능**:
  - 검색 (객실 번호, 아이템명, 주문 ID)
  - 필터링 (상태, 우선순위)
  - 정렬 (최신순)
  - 상태 변경 버튼
  - 메모 보기/추가

### 4. Settings Screen
- **경로**: `/settings`
- **컴포넌트**: `Settings.tsx`
- **권한**: 모든 사용자
- **설정 항목**:
  - 사용자 정보
  - WebSocket URL (개발자용)
  - 디버그 로깅
  - 알림 설정
  - 사운드 설정

### 5. Admin Screen
- **경로**: `/admin/staff`
- **컴포넌트**: `AdminStaffManager.tsx`
- **권한**: Admin만
- **기능**:
  - 직원 목록
  - 직원 추가/수정/삭제
  - 부서 배정
  - 권한 관리
  - 비밀번호 초기화

---

## 🔒 Security Requirements

### Authentication
- **방식**: Username + Password
- **세션**: localStorage 기반
- **만료**: 브라우저 종료 시까지 유지
- **재인증**: 로그아웃 또는 세션 만료 시

### Authorization
- **역할 기반**: FD_STAFF, HK_STAFF, ADMIN
- **권한 체크**: 클라이언트 + 서버 양쪽
- **API 보호**: 토큰 기반 인증 (추후 구현)

### Data Protection
- **전송**: HTTPS/WSS (프로덕션)
- **저장**: 로컬 스토리지 (암호화 권장)
- **비밀번호**: 해싱 (bcrypt 권장)

### Input Validation
- **클라이언트**: 타입스크립트 타입 체크
- **서버**: 입력값 검증 및 sanitization
- **XSS 방지**: 사용자 입력 이스케이프 처리

---

## 🚀 Performance Requirements

### Load Time
- **초기 로드**: < 3초 (3G 네트워크)
- **페이지 전환**: < 500ms
- **WebSocket 연결**: < 2초

### Responsiveness
- **버튼 반응**: < 100ms
- **검색 필터링**: < 200ms
- **차트 렌더링**: < 500ms

### Scalability
- **동시 사용자**: 최대 100명
- **동시 WebSocket 연결**: 최대 100개
- **주문 처리량**: 초당 10건

### Offline Support
- **로컬 캐싱**: 최근 500개 주문
- **오프라인 큐**: 최대 50개 액션
- **동기화 시간**: < 5초 (재연결 후)

---

## 📊 Analytics & Metrics

### Business Metrics
1. **처리 시간**:
   - 평균 주문 처리 시간
   - 상태별 평균 소요 시간
   - 긴급/일반 우선순위별 비교

2. **생산성**:
   - 시간대별 주문량
   - 직원별 처리 건수
   - 완료율 (일/주/월)

3. **품질**:
   - 취소율
   - 재요청률
   - 메모 작성률

### Technical Metrics
1. **성능**:
   - 페이지 로드 시간
   - API 응답 시간
   - WebSocket 지연 시간

2. **안정성**:
   - 업타임 (99.9% 목표)
   - 오류율
   - 연결 끊김 빈도

3. **사용성**:
   - 활성 사용자 수
   - 세션 길이
   - 기능별 사용 빈도

---

## 🧪 Testing Strategy

### Unit Testing
- **프레임워크**: Jest + React Testing Library
- **커버리지**: 최소 70%
- **대상**:
  - 유틸리티 함수
  - 상태 관리 로직
  - 데이터 변환 함수

### Integration Testing
- **대상**:
  - API 엔드포인트
  - WebSocket 이벤트
  - 컴포넌트 간 상호작용

### E2E Testing
- **프레임워크**: Playwright 또는 Cypress
- **시나리오**:
  - 로그인 → 주문 생성 → 상태 변경 → 완료
  - 메모 추가 및 동기화
  - 오프라인 → 온라인 전환

### Manual Testing
- **QA 체크리스트**:
  - 모든 사용자 흐름
  - 다양한 디바이스 (PC, 모바일, 태블릿)
  - 다양한 브라우저 (Chrome, Safari, Firefox)
  - 네트워크 조건 (3G, 4G, WiFi)

---

## 🚢 Deployment

### Development
- **URL**: http://localhost:3000
- **WebSocket**: ws://localhost:3001
- **Database**: 로컬 MySQL

### Staging
- **URL**: https://staging.hotelworks.kr
- **WebSocket**: wss://staging.hotelworks.kr
- **Database**: Staging DB

### Production
- **URL**: https://hotelworks.kr
- **WebSocket**: wss://hotelworks.kr
- **Database**: Production DB (백업 자동화)

### CI/CD Pipeline
```
Git Push → GitHub Actions → Build → Test → Deploy
```

**빌드 프로세스**:
1. `npm install` - 의존성 설치
2. `npm run build` - Vite 빌드
3. `npm test` - 테스트 실행
4. Deploy to server

---

## 🔮 Future Enhancements

### Phase 2 (Q2 2026)
1. **Guest Portal**: 고객이 직접 요청할 수 있는 포털
2. **QR Code**: 객실 내 QR 코드로 빠른 주문
3. **Multi-language**: 영어/중국어/일본어 지원
4. **Voice Input**: 음성으로 주문 생성

### Phase 3 (Q3 2026)
1. **AI Predictions**: 요청 예측 및 선제적 배치
2. **Route Optimization**: HK 동선 최적화
3. **Inventory Management**: 재고 관리 연동
4. **PMS Integration**: 기존 호텔 관리 시스템 연동

### Phase 4 (Q4 2026)
1. **IoT Integration**: 스마트 룸 기기 연동
2. **Mobile App (Native)**: React Native 앱
3. **Advanced Analytics**: ML 기반 인사이트
4. **Multi-property**: 여러 호텔 관리

---

## 📚 Technical Documentation

### API Endpoints

#### REST API

**Base URL**: `http://localhost:3001`

1. **GET /health**
   - 서버 상태 확인
   - Response:
     ```json
     {
       "status": "ok",
       "service": "HotelWorks WebSocket Server",
       "port": 3001,
       "timestamp": "2026-01-09T10:59:58.000Z",
       "connectedClients": 5
     }
     ```

2. **GET /api/orders**
   - 모든 주문 조회
   - Response: `{ success: true, data: Order[] }`

3. **GET /api/orders/:id**
   - 특정 주문 조회
   - Response: `{ success: true, data: Order }`

4. **POST /api/orders**
   - 주문 생성
   - Body: `Partial<Order>`
   - Response: `{ success: true, data: Order }`

5. **PUT /api/orders/:id**
   - 주문 업데이트
   - Body: `Partial<Order>`
   - Response: `{ success: true, data: Order }`

6. **DELETE /api/orders/:id**
   - 주문 삭제
   - Response: `{ success: true, message: string }`

#### WebSocket Events

**Connection**: `wss://hotelworks.kr`

**Client → Server**:
- `hotelflow_sync`: 데이터 동기화
  ```typescript
  {
    type: 'CREATE' | 'UPDATE' | 'DELETE',
    order: Order
  }
  ```

**Server → Client**:
- `order_created`: 새 주문 생성
- `order_updated`: 주문 업데이트
- `order_status_changed`: 상태 변경
- `memo_added`: 메모 추가
- `order_cancelled`: 주문 취소

---

## 🐛 Known Issues & Limitations

### Current Limitations
1. **데이터베이스 연결 실패 시**: 로컬 스토리지 폴백으로 작동
2. **오프라인 모드**: 최대 50개 액션만 큐에 저장
3. **동시 편집**: Last Write Wins 전략으로 일부 변경사항 손실 가능
4. **대용량 데이터**: 500개 이상 주문 시 성능 저하 가능

### Known Bugs
1. 빠른 연속 클릭 시 중복 주문 생성 가능 (debounce 필요)
2. 모바일 키보드 표시 시 레이아웃 이슈
3. Safari에서 WebSocket 연결 지연

### Workarounds
1. 중복 주문: `isDispatching` 플래그로 방지
2. 키보드 이슈: `window.visualViewport` API 사용
3. Safari 이슈: Polling 폴백 사용

---

## 📖 Glossary

- **FD**: Front Desk (프론트 데스크)
- **HK**: Housekeeping (하우스키핑)
- **Order**: 주문, 요청
- **Amenity**: 어메니티, 객실 비품
- **Dispatch**: 배차, 주문 전달
- **Socket.IO**: WebSocket 라이브러리
- **PWA**: Progressive Web App
- **PRD**: Product Requirements Document

---

## 📞 Support & Contact

### Development Team
- **Email**: HotelHotel@kakao.com
- **오픈채팅**: [링크]

### Emergency Contact
- **긴급 문의**: 운영 시간 내 이메일 문의
- **버그 리포트**: GitHub Issues

---

## 📝 Change Log

### v1.0.0 (2026-01-09)
- ✨ 초기 릴리즈
- ✅ 빠른 주문 생성 기능
- ✅ 실시간 동기화
- ✅ 대시보드 및 분석
- ✅ 모바일 최적화
- ✅ 메모 시스템
- ✅ Excel 내보내기

---

## ✅ Acceptance Criteria

### 주문 생성
- [ ] 층 선택 후 방 번호 표시
- [ ] 검색으로 방 번호 필터링
- [ ] Enter 키로 첫 번째 결과 선택
- [ ] 다중 아이템 선택 가능
- [ ] 수량 조정 (+/- 버튼)
- [ ] 우선순위 설정
- [ ] 5초 이내 주문 완료

### 주문 관리
- [ ] 상태 변경 (REQUESTED → ACCEPTED → IN_PROGRESS → COMPLETED)
- [ ] 취소 및 복구 (권한별)
- [ ] 경과 시간 표시
- [ ] 필터링 (상태, 우선순위, 객실)
- [ ] 검색 (객실, 아이템, ID)

### 실시간 동기화
- [ ] 모든 디바이스 간 500ms 이내 동기화
- [ ] 오프라인 큐 관리
- [ ] 재연결 시 자동 동기화
- [ ] 연결 상태 표시

### 모바일
- [ ] 반응형 레이아웃
- [ ] 44px × 44px 최소 터치 타겟
- [ ] 오프라인 작동
- [ ] 푸시 알림

---

## 🎓 Training Materials

### User Guides
1. **Front Desk 가이드**: 주문 생성 및 관리
2. **Housekeeping 가이드**: 작업 확인 및 처리
3. **Admin 가이드**: 시스템 관리 및 설정

### Video Tutorials
1. 빠른 시작 가이드 (5분)
2. 주문 생성 및 관리 (10분)
3. 대시보드 활용법 (8분)
4. 모바일 앱 사용법 (7분)

---

*이 문서는 HotelWorks 프로덕트의 공식 요구사항 명세서입니다. 변경 시 버전을 업데이트하고 모든 이해관계자에게 공유해야 합니다.*

**작성일**: 2026-01-09  
**작성자**: Product Team  
**승인자**: [승인 대기]

