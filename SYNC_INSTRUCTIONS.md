# 주문 동기화 방법

## 문제: orders 테이블에 주문이 3개만 있음

localStorage에 저장된 주문들이 데이터베이스로 동기화되지 않았습니다.

## 해결 방법

### 방법 1: 동기화 도구 사용 (가장 쉬움)

1. 브라우저에서 `sync-orders-to-db.html` 파일을 엽니다.
2. "1. localStorage 확인" 버튼을 클릭하여 저장된 주문 수를 확인합니다.
3. 서버 URL을 입력합니다:
   - 로컬 개발: `http://localhost:3001`
   - Render 프로덕션: Render 서버 URL (예: `https://hotelworks-backend.onrender.com`)
4. "2. 동기화 시작" 버튼을 클릭합니다.
5. 결과를 확인합니다.

### 방법 2: 브라우저 콘솔에서 직접 실행

1. HotelWorks 앱 페이지를 엽니다 (https://hotelworks.vercel.app 또는 로컬)
2. F12를 눌러 개발자 도구를 엽니다
3. Console 탭을 선택합니다
4. 아래 코드를 붙여넣고 Enter를 누릅니다:

```javascript
// 주문 동기화 스크립트
(async function() {
  console.log('🔄 주문 동기화 시작...');
  
  // localStorage에서 주문 가져오기
  const ordersJson = localStorage.getItem('hotelflow_orders_v1');
  if (!ordersJson) {
    console.error('❌ localStorage에 주문이 없습니다.');
    return;
  }
  
  const orders = JSON.parse(ordersJson);
  if (!Array.isArray(orders) || orders.length === 0) {
    console.error('❌ 주문이 0개입니다.');
    return;
  }
  
  console.log(`✅ localStorage에서 ${orders.length}개 주문 발견`);
  
  // API URL 가져오기
  const getApiBaseUrl = () => {
    try {
      const savedUrl = localStorage.getItem('hotelflow_ws_url');
      if (savedUrl && savedUrl.trim() !== '') {
        return savedUrl.replace('ws://', 'http://').replace('wss://', 'https://');
      }
    } catch (e) {}
    
    try {
      const envUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001'
        : 'https://hotelworks-backend.onrender.com';
      return envUrl;
    } catch (e) {}
    
    return 'http://localhost:3001';
  };
  
  // 주문 포맷팅
  const formattedOrders = orders.map(order => ({
    ...order,
    requestedAt: order.requestedAt instanceof Date 
      ? order.requestedAt.toISOString() 
      : (typeof order.requestedAt === 'string' ? order.requestedAt : new Date(order.requestedAt).toISOString()),
    acceptedAt: order.acceptedAt ? (order.acceptedAt instanceof Date ? order.acceptedAt.toISOString() : order.acceptedAt) : undefined,
    inProgressAt: order.inProgressAt ? (order.inProgressAt instanceof Date ? order.inProgressAt.toISOString() : order.inProgressAt) : undefined,
    completedAt: order.completedAt ? (order.completedAt instanceof Date ? order.completedAt.toISOString() : order.completedAt) : undefined,
    memos: (order.memos || []).map(memo => ({
      ...memo,
      timestamp: memo.timestamp instanceof Date 
        ? memo.timestamp.toISOString() 
        : (typeof memo.timestamp === 'string' ? memo.timestamp : new Date(memo.timestamp).toISOString())
    }))
  }));
  
  const apiUrl = `${getApiBaseUrl()}/api/orders/sync`;
  console.log(`📤 서버로 전송 중... (${formattedOrders.length}개 주문)`);
  console.log(`   API URL: ${apiUrl}`);
  
  // 동기화 요청
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ orders: formattedOrders })
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    const result = await response.json();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 동기화 완료!');
    console.log(`   총 주문: ${result.results.total}개`);
    console.log(`   ✅ 생성: ${result.results.created}개`);
    console.log(`   ⏭️ 건너뜀: ${result.results.skipped}개`);
    console.log(`   ❌ 오류: ${result.results.errors.length}개`);
    
    if (result.results.errors.length > 0) {
      console.warn('오류 목록:');
      result.results.errors.forEach(e => {
        console.warn(`   - ${e.orderId}: ${e.error}`);
      });
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    alert(`✅ ${result.results.created}개의 주문이 데이터베이스에 저장되었습니다!\n\n총: ${result.results.total}개\n생성: ${result.results.created}개\n건너뜀: ${result.results.skipped}개`);
  } catch (error) {
    console.error('❌ 동기화 실패:', error);
    alert(`❌ 동기화 실패: ${error.message}\n\n서버 URL을 확인하거나 서버가 실행 중인지 확인해주세요.`);
  }
})();
```

### 방법 3: 자동 동기화 (배포 완료 후)

배포가 완료되면 로그인 시 자동으로 동기화됩니다:
1. HotelWorks 앱에 로그인합니다
2. 2초 후 자동으로 localStorage의 주문들이 DB로 동기화됩니다
3. 성공 시 알림이 표시됩니다

## 확인 방법

동기화 후 phpMyAdmin에서 다시 확인:
1. orders 테이블을 선택
2. "Browse" 또는 "조회" 클릭
3. 주문 개수가 증가했는지 확인

## 문제 해결

### "서버에 연결할 수 없음" 오류

1. Render 서버가 실행 중인지 확인
2. 서버 URL이 올바른지 확인
3. 네트워크 연결 상태 확인

### "주문이 0개" 오류

1. localStorage에 주문이 실제로 있는지 확인:
   ```javascript
   const orders = JSON.parse(localStorage.getItem('hotelflow_orders_v1') || '[]');
   console.log('주문 개수:', orders.length);
   ```

### 동기화는 되었지만 여전히 적음

1. 이미 DB에 있는 주문은 건너뜀니다 (중복 방지)
2. localStorage에 있는 주문이 실제로 얼마나 되는지 확인
3. 다른 기기나 브라우저의 localStorage를 확인
