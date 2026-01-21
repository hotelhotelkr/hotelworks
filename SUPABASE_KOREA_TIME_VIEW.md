# 🇰🇷 Supabase에서 한국 시간으로 보기

## 문제

Supabase Table Editor는 원시 데이터(UTC)를 표시하므로, 한국 시간으로 보이지 않습니다.

## 해결 방법

### 방법 1: SQL 뷰 사용 (권장)

Supabase SQL Editor에서 다음 뷰를 사용하세요:

```sql
-- 한국 시간으로 표시되는 주문 뷰
SELECT * FROM orders_korea_time;

-- 한국 시간으로 표시되는 메모 뷰
SELECT * FROM memos_korea_time;
```

### 방법 2: SQL 쿼리에서 직접 변환

```sql
-- 주문 조회 (한국 시간)
SELECT 
  id,
  room_no,
  requested_at AT TIME ZONE 'Asia/Seoul' as requested_at_korea,
  accepted_at AT TIME ZONE 'Asia/Seoul' as accepted_at_korea,
  in_progress_at AT TIME ZONE 'Asia/Seoul' as in_progress_at_korea,
  completed_at AT TIME ZONE 'Asia/Seoul' as completed_at_korea
FROM orders
ORDER BY requested_at DESC;
```

### 방법 3: Supabase Table Editor에서 직접 변환

Table Editor에서:
1. "Filter" 버튼 클릭
2. SQL 쿼리 입력:
   ```sql
   SELECT *, 
     requested_at AT TIME ZONE 'Asia/Seoul' as requested_at_korea
   FROM orders
   ```
3. 한국 시간 컬럼 확인

## 뷰 생성

이미 `orders_korea_time`과 `memos_korea_time` 뷰가 생성되어 있습니다.

### 뷰 사용 방법

1. **Supabase Dashboard → SQL Editor**
2. 다음 쿼리 실행:
   ```sql
   SELECT * FROM orders_korea_time ORDER BY requested_at_korea DESC;
   ```

3. 또는 **Table Editor**에서:
   - 왼쪽 사이드바에서 "orders_korea_time" 뷰 선택
   - 한국 시간으로 표시된 데이터 확인

## 예시

### UTC 시간 (원본 테이블)
```
requested_at: 2026-01-21 14:59:33.655+00
```

### 한국 시간 (뷰)
```
requested_at_korea: 2026-01-21 23:59:33.655
```

## 참고

- **원본 테이블**: UTC로 저장 (표준 관행)
- **뷰**: 한국 시간으로 변환하여 표시
- **애플리케이션 UI**: 한국 시간으로 표시 (이미 구현됨)

---

**결론**: Supabase Table Editor에서 한국 시간을 보려면 `orders_korea_time` 뷰를 사용하세요!
