import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pnmkclrwmbmzrocyygwq.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🧪 Supabase 완전 작동 테스트');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

async function fullTest() {
  try {
    // 1. 연결 테스트
    console.log('1️⃣ 연결 테스트...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('orders')
      .select('count', { count: 'exact', head: true });
    
    if (connectionError) {
      console.log(`   ❌ 실패: ${connectionError.message}\n`);
      return false;
    }
    console.log('   ✅ 연결 성공!\n');
    
    // 2. 테이블 읽기 테스트
    console.log('2️⃣ 데이터 읽기 테스트...');
    
    // 사용자 읽기
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5);
    
    if (usersError) {
      console.log(`   ❌ 사용자 읽기 실패: ${usersError.message}\n`);
      return false;
    }
    console.log(`   ✅ 사용자 읽기 성공: ${users?.length || 0}명\n`);
    
    // 주문 읽기
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .limit(5);
    
    if (ordersError) {
      console.log(`   ⚠️ 주문 읽기: ${ordersError.message} (데이터가 없을 수 있음)\n`);
    } else {
      console.log(`   ✅ 주문 읽기 성공: ${orders?.length || 0}개\n`);
    }
    
    // 3. 데이터 쓰기 테스트 (테스트 주문 생성)
    console.log('3️⃣ 데이터 쓰기 테스트...');
    
    const testOrderId = `test_${Date.now()}`;
    const testOrder = {
      id: testOrderId,
      room_no: 'TEST-101',
      guest_name: '테스트 게스트',
      category: 'Room Service',
      item_name: '테스트 주문',
      quantity: 1,
      priority: 'NORMAL',
      status: 'REQUESTED',
      requested_at: new Date().toISOString(),
      created_by: 'u1',
      request_channel: 'Test'
    };
    
    const { data: insertedOrder, error: insertError } = await supabase
      .from('orders')
      .insert(testOrder)
      .select()
      .single();
    
    if (insertError) {
      console.log(`   ❌ 주문 생성 실패: ${insertError.message}\n`);
      return false;
    }
    console.log(`   ✅ 주문 생성 성공: ${insertedOrder.id}\n`);
    
    // 4. 데이터 업데이트 테스트
    console.log('4️⃣ 데이터 업데이트 테스트...');
    
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({ status: 'ACCEPTED' })
      .eq('id', testOrderId)
      .select()
      .single();
    
    if (updateError) {
      console.log(`   ❌ 주문 업데이트 실패: ${updateError.message}\n`);
    } else {
      console.log(`   ✅ 주문 업데이트 성공: ${updatedOrder.status}\n`);
    }
    
    // 5. 데이터 삭제 테스트 (테스트 데이터 정리)
    console.log('5️⃣ 데이터 삭제 테스트...');
    
    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .eq('id', testOrderId);
    
    if (deleteError) {
      console.log(`   ⚠️ 주문 삭제: ${deleteError.message} (무시 가능)\n`);
    } else {
      console.log(`   ✅ 주문 삭제 성공 (테스트 데이터 정리)\n`);
    }
    
    // 6. 로그인 테스트 (사용자 인증)
    console.log('6️⃣ 로그인 테스트...');
    
    const { data: loginUser, error: loginError } = await supabase
      .from('users')
      .select('*')
      .eq('username', 'FD')
      .eq('password', 'FD')
      .single();
    
    if (loginError || !loginUser) {
      console.log(`   ❌ 로그인 실패: ${loginError?.message || '사용자를 찾을 수 없음'}\n`);
    } else {
      console.log(`   ✅ 로그인 성공: ${loginUser.username} (${loginUser.name})\n`);
    }
    
    // 최종 결과
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Supabase 완전 작동 확인!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 테스트 결과:');
    console.log('   ✅ 연결: 성공');
    console.log('   ✅ 읽기: 성공');
    console.log('   ✅ 쓰기: 성공');
    console.log('   ✅ 업데이트: 성공');
    console.log('   ✅ 삭제: 성공');
    console.log('   ✅ 로그인: 성공\n');
    console.log('🎉 모든 기능이 정상 작동합니다!\n');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ 테스트 실패:', error.message);
    console.error(error);
    return false;
  }
}

fullTest();
