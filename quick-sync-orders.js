// 빠른 주문 동기화 스크립트
// 브라우저 콘솔에서 실행하거나, sync-orders-to-db.html 파일을 열어서 사용하세요

(async function() {
  console.log('🔄 주문 동기화 시작...');
  
  // 1. localStorage에서 주문 가져오기
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
  
  // 2. API URL 가져오기
  const getApiBaseUrl = () => {
    try {
      const envUrl = (import.meta.env || {}).VITE_WS_SERVER_URL;
      if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
        return envUrl.replace('ws://', 'http://').replace('wss://', 'https://');
      }
    } catch (e) {}
    
    try {
      const savedUrl = localStorage.getItem('hotelflow_ws_url');
      if (savedUrl && savedUrl.trim() !== '') {
        return savedUrl.replace('ws://', 'http://').replace('wss://', 'https://');
      }
    } catch (e) {}
    
    if (typeof window !== 'undefined' && window.location) {
      const host = window.location.hostname;
      const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
      
      if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.')) {
        return `${protocol}//${host}:3001`;
      }
    }
    
    return 'http://localhost:3001';
  };
  
  // 3. 주문 포맷팅
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
  
  // 4. 동기화 요청
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
    
    if (result.results.created > 0) {
      alert(`✅ ${result.results.created}개의 주문이 데이터베이스에 저장되었습니다!\n\n총: ${result.results.total}개\n생성: ${result.results.created}개\n건너뜀: ${result.results.skipped}개`);
    } else {
      alert(`⏭️ 모든 주문이 이미 데이터베이스에 있습니다.\n\n총: ${result.results.total}개\n건너뜀: ${result.results.skipped}개`);
    }
  } catch (error) {
    console.error('❌ 동기화 실패:', error);
    alert(`❌ 동기화 실패: ${error.message}\n\n서버 URL을 확인하거나 서버가 실행 중인지 확인해주세요.`);
  }
})();
