# 📋 phpMyAdmin에서 테이블 생성하기

## 1️⃣ phpMyAdmin 접속
```
http://localhost/phpmyadmin
```

## 2️⃣ hotelworks 데이터베이스 선택
- 좌측에서 `hotelworks` 클릭

## 3️⃣ SQL 탭 클릭
- 상단 메뉴에서 "SQL" 탭 클릭

## 4️⃣ 아래 SQL 복사 & 붙여넣기 & 실행

```sql
-- 1. orders 테이블
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

-- 2. users 테이블
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

-- 3. memos 테이블
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

-- 4. 초기 사용자 데이터
INSERT INTO users (id, username, password, name, dept, role) VALUES
('user-fd-001', '1', '1', '김프론트', 'FRONT_DESK', 'FD_STAFF'),
('user-hk-001', '2', '2', '이하우스', 'HOUSEKEEPING', 'HK_STAFF'),
('user-admin-001', 'admin', 'admin', '관리자', 'ADMIN', 'ADMIN')
ON DUPLICATE KEY UPDATE id=id;
```

## 5️⃣ "실행" 버튼 클릭

✅ 성공 메시지가 나타나면 완료!

## 6️⃣ 확인
- 좌측에서 `hotelworks` 확장
- `orders`, `users`, `memos` 테이블이 보이면 성공!
