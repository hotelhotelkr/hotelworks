# 🕐 시간대(Timezone) 설명

## 문제 상황

Supabase의 `requested_at` 시간이 한국 시간과 다르게 표시되는 이유

## 원인

1. **Supabase는 UTC 시간으로 저장합니다**
   - PostgreSQL의 `timestamptz` 타입은 UTC(협정 세계시)로 저장됩니다
   - 예: `2026-01-21 14:34:27.986+00` (UTC 시간)

2. **한국은 UTC+9 시간대입니다**
   - 한국 시간 = UTC 시간 + 9시간
   - 예: UTC `14:34` → 한국 시간 `23:34` (14 + 9 = 23)

3. **코드에서 UTC로 변환하여 저장**
   - `toISOString()` 메서드는 UTC 시간으로 변환합니다
   - 이는 표준 관행이며 올바른 방법입니다

## 해결 방법

### ✅ 올바른 방법 (현재 구현)

1. **저장: UTC로 저장** (변경 없음)
   - Supabase에 UTC 시간으로 저장
   - 이는 표준 관행이며 전 세계 사용자 지원에 유리

2. **표시: 한국 시간으로 변환** (수정 완료)
   - UI에서 표시할 때 한국 시간대(`Asia/Seoul`)로 변환
   - `toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })` 사용

### 📝 변경 사항

1. **OrderList.tsx**
   - 경과 시간 계산: 한국 시간 기준으로 계산
   - 시간 표시: 한국 시간대로 변환하여 표시

2. **NoteModal.tsx**
   - 메모 시간 표시: 한국 시간대로 변환

## 예시

### 저장 (UTC)
```
Supabase: 2026-01-21 14:34:27.986+00 (UTC)
```

### 표시 (한국 시간)
```
UI: 2026-01-21 23:34:27 (KST, UTC+9)
```

## 참고 사항

- **UTC 저장은 표준 관행입니다**
  - 전 세계 사용자 지원
  - 서머타임(DST) 문제 없음
  - 데이터 일관성 유지

- **표시 시 로컬 시간대로 변환**
  - 사용자에게 친숙한 시간 표시
  - 브라우저의 로컬 시간대 자동 감지
  - 명시적으로 `Asia/Seoul` 지정 (더 정확)

## 확인 방법

1. **Supabase Table Editor**
   - `requested_at` 컬럼은 UTC 시간으로 표시됩니다
   - 예: `2026-01-21 14:34:27.986+00`

2. **애플리케이션 UI**
   - 주문 목록의 시간은 한국 시간으로 표시됩니다
   - 예: `2026-01-21 23:34:27`

3. **브라우저 콘솔**
   ```javascript
   // UTC 시간
   const utcTime = new Date('2026-01-21T14:34:27.986Z');
   console.log('UTC:', utcTime.toISOString());
   
   // 한국 시간
   console.log('KST:', utcTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));
   ```

---

**결론**: Supabase에 UTC로 저장하는 것은 정상이며 올바른 방법입니다. UI에서 한국 시간으로 변환하여 표시하도록 수정했습니다.
