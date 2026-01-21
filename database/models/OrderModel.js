import supabase from '../db.js';

/**
 * 한국 시간을 UTC로 변환하는 헬퍼 함수
 * Supabase Table Editor에서 한국 시간으로 보이게 하기 위해
 * 한국 시간을 UTC로 변환하여 저장
 * 
 * 예: 한국 시간 23:34 → UTC 14:34 (9시간 차이)
 * Supabase에 저장: 14:34 (UTC)
 * Supabase Table Editor에서 조회 시: 23:34 (한국 시간으로 표시되도록)
 */
function koreaTimeToUTC(koreaTime) {
  if (!koreaTime) return null;
  
  // Date 객체인 경우
  if (koreaTime instanceof Date) {
    // Date 객체는 이미 브라우저의 로컬 시간대(한국)로 생성됨
    // 한국 시간을 UTC로 변환하려면 9시간을 빼야 함
    // 하지만 toISOString()은 이미 UTC로 변환하므로, 
    // 한국 시간을 그대로 UTC로 저장하려면 9시간을 더해야 함
    // 예: 한국 시간 23:34 → UTC로 저장하면 14:34가 되어야 함
    // 따라서 한국 시간에서 9시간을 빼면 UTC가 됨
    const koreaTimeMs = koreaTime.getTime();
    // 브라우저의 로컬 시간대 오프셋을 고려
    const localOffset = koreaTime.getTimezoneOffset() * 60 * 1000; // 분을 밀리초로 변환
    // 한국 시간대 오프셋 (UTC+9 = -540분)
    const koreaOffset = -9 * 60 * 60 * 1000;
    // 한국 시간을 UTC로 변환
    const utcTime = new Date(koreaTimeMs - localOffset + koreaOffset);
    return utcTime.toISOString();
  }
  
  // 문자열인 경우 (이미 ISO 형식)
  if (typeof koreaTime === 'string') {
    // 이미 UTC 형식이면 그대로 반환
    if (koreaTime.endsWith('Z') || koreaTime.includes('+00') || koreaTime.includes('+00:00')) {
      return koreaTime;
    }
    // 한국 시간 문자열을 Date로 파싱 후 UTC로 변환
    const date = new Date(koreaTime);
    const localOffset = date.getTimezoneOffset() * 60 * 1000;
    const koreaOffset = -9 * 60 * 60 * 1000;
    const utcTime = new Date(date.getTime() - localOffset + koreaOffset);
    return utcTime.toISOString();
  }
  
  return new Date().toISOString();
}

class OrderModel {
  // 모든 주문 조회
  static async findAll() {
    try {
      // 주문 조회
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('requested_at', { ascending: false });

      if (ordersError) throw ordersError;

      // 각 주문의 메모 조회
      const ordersWithMemos = await Promise.all(
        orders.map(async (order) => {
          const { data: memos, error: memosError } = await supabase
            .from('memos')
            .select('*')
            .eq('order_id', order.id)
            .order('timestamp', { ascending: true });

          if (memosError) {
            console.warn('메모 조회 오류:', memosError);
            return {
              ...order,
              memos: []
            };
          }

          return {
            id: order.id,
            roomNo: order.room_no,
            guestName: order.guest_name,
            category: order.category,
            itemName: order.item_name,
            quantity: order.quantity,
            priority: order.priority,
            status: order.status,
            requestedAt: new Date(order.requested_at),
            acceptedAt: order.accepted_at ? new Date(order.accepted_at) : undefined,
            inProgressAt: order.in_progress_at ? new Date(order.in_progress_at) : undefined,
            completedAt: order.completed_at ? new Date(order.completed_at) : undefined,
            createdBy: order.created_by,
            assignedTo: order.assigned_to || undefined,
            requestChannel: order.request_channel,
            requestNote: order.request_note || undefined,
            memos: (memos || []).map(m => ({
              id: m.id,
              text: m.text,
              senderId: m.sender_id,
              senderName: m.sender_name,
              senderDept: m.sender_dept,
              timestamp: new Date(m.timestamp)
            }))
          };
        })
      );

      return ordersWithMemos;
    } catch (error) {
      console.error('주문 조회 오류:', error);
      throw error;
    }
  }

  // 주문 ID로 조회
  static async findById(orderId) {
    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) {
        if (orderError.code === 'PGRST116') {
          return null; // 주문을 찾을 수 없음
        }
        throw orderError;
      }

      // 메모 조회
      const { data: memos, error: memosError } = await supabase
        .from('memos')
        .select('*')
        .eq('order_id', orderId)
        .order('timestamp', { ascending: true });

      if (memosError) {
        console.warn('메모 조회 오류:', memosError);
      }

      return {
        id: order.id,
        roomNo: order.room_no,
        guestName: order.guest_name,
        category: order.category,
        itemName: order.item_name,
        quantity: order.quantity,
        priority: order.priority,
        status: order.status,
        requestedAt: new Date(order.requested_at),
        acceptedAt: order.accepted_at ? new Date(order.accepted_at) : undefined,
        inProgressAt: order.in_progress_at ? new Date(order.in_progress_at) : undefined,
        completedAt: order.completed_at ? new Date(order.completed_at) : undefined,
        createdBy: order.created_by,
        assignedTo: order.assigned_to || undefined,
        requestChannel: order.request_channel,
        requestNote: order.request_note || undefined,
        memos: (memos || []).map(m => ({
          id: m.id,
          text: m.text,
          senderId: m.sender_id,
          senderName: m.sender_name,
          senderDept: m.sender_dept,
          timestamp: new Date(m.timestamp)
        }))
      };
    } catch (error) {
      console.error('주문 조회 오류:', error);
      throw error;
    }
  }

  // 주문 생성
  static async create(orderData) {
    try {
      // 이미 존재하는 주문인지 확인
      const existing = await this.findById(orderData.id);
      if (existing) {
        console.log('⏭️ 주문 이미 존재 (건너뜀):', orderData.id);
        return existing;
      }

      // 날짜 형식 변환: 한국 시간을 UTC로 변환하여 저장
      // 클라이언트에서 new Date()로 생성된 시간은 브라우저의 로컬 시간대(한국)입니다
      // Supabase Table Editor에서 한국 시간으로 보이게 하려면,
      // 한국 시간을 UTC로 변환하여 저장해야 합니다
      let requestedAt;
      if (orderData.requestedAt) {
        if (orderData.requestedAt instanceof Date) {
          // Date 객체: 브라우저의 로컬 시간대(한국)로 생성됨
          // 한국 시간을 UTC로 변환 (9시간 빼기)
          // 예: 한국 시간 23:34 → UTC 14:34
          const koreaTime = orderData.requestedAt;
          // 한국 시간대 오프셋 (UTC+9)
          const koreaOffset = 9 * 60 * 60 * 1000;
          // 한국 시간에서 9시간을 빼서 UTC로 변환
          const utcTime = new Date(koreaTime.getTime() - koreaOffset);
          requestedAt = utcTime.toISOString();
        } else if (typeof orderData.requestedAt === 'string') {
          // 문자열: 이미 UTC 형식이면 그대로, 아니면 변환
          if (orderData.requestedAt.endsWith('Z') || orderData.requestedAt.includes('+00')) {
            requestedAt = orderData.requestedAt;
          } else {
            const date = new Date(orderData.requestedAt);
            const koreaOffset = 9 * 60 * 60 * 1000;
            const utcTime = new Date(date.getTime() - koreaOffset);
            requestedAt = utcTime.toISOString();
          }
        } else {
          const now = new Date();
          const koreaOffset = 9 * 60 * 60 * 1000;
          const utcTime = new Date(now.getTime() - koreaOffset);
          requestedAt = utcTime.toISOString();
        }
      } else {
        // 현재 시간을 한국 시간으로 간주하고 UTC로 변환
        const now = new Date();
        const koreaOffset = 9 * 60 * 60 * 1000;
        const utcTime = new Date(now.getTime() - koreaOffset);
        requestedAt = utcTime.toISOString();
      }

      // 주문 삽입
      const insertData = {
        id: orderData.id,
        room_no: orderData.roomNo,
        guest_name: orderData.guestName || null,
        category: orderData.category,
        item_name: orderData.itemName,
        quantity: orderData.quantity || 1,
        priority: orderData.priority || 'NORMAL',
        status: orderData.status || 'REQUESTED',
        requested_at: requestedAt,
        created_by: orderData.createdBy,
        request_channel: orderData.requestChannel || 'Phone',
        request_note: orderData.requestNote || null
      };
      
      console.log('📝 Supabase INSERT 시도:', orderData.id);
      console.log('📝 INSERT 데이터:', JSON.stringify(insertData, null, 2));
      
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(insertData)
        .select()
        .single();

      if (orderError) {
        console.error('❌ Supabase INSERT 오류:', orderError.message);
        console.error('❌ 오류 코드:', orderError.code);
        console.error('❌ 오류 상세:', orderError);
        throw orderError;
      }
      
      console.log('✅ Supabase INSERT 성공:', orderData.id);

      // 메모가 있으면 삽입
      if (orderData.memos && Array.isArray(orderData.memos) && orderData.memos.length > 0) {
        const memosToInsert = orderData.memos.map(memo => {
          const memoTimestamp = koreaTimeToUTC(
            memo.timestamp instanceof Date 
              ? memo.timestamp 
              : (typeof memo.timestamp === 'string' ? new Date(memo.timestamp) : new Date())
          );

          return {
            id: memo.id,
            order_id: orderData.id,
            text: memo.text,
            sender_id: memo.senderId,
            sender_name: memo.senderName,
            sender_dept: memo.senderDept,
            timestamp: memoTimestamp
          };
        });

        const { error: memosError } = await supabase
          .from('memos')
          .insert(memosToInsert);

        if (memosError) {
          console.warn('⚠️ 메모 삽입 실패:', memosError.message);
        }
      }

      return await this.findById(orderData.id);
    } catch (error) {
      console.error('주문 생성 오류:', error);
      throw error;
    }
  }

  // 주문 업데이트
  static async update(orderId, updateData) {
    try {
      const updateFields = {};

      if (updateData.status !== undefined) {
        updateFields.status = updateData.status;
      }
      if (updateData.acceptedAt !== undefined) {
        updateFields.accepted_at = koreaTimeToUTC(
          updateData.acceptedAt instanceof Date 
            ? updateData.acceptedAt 
            : new Date(updateData.acceptedAt)
        );
      }
      if (updateData.inProgressAt !== undefined) {
        updateFields.in_progress_at = koreaTimeToUTC(
          updateData.inProgressAt instanceof Date 
            ? updateData.inProgressAt 
            : new Date(updateData.inProgressAt)
        );
      }
      if (updateData.completedAt !== undefined) {
        updateFields.completed_at = koreaTimeToUTC(
          updateData.completedAt instanceof Date 
            ? updateData.completedAt 
            : new Date(updateData.completedAt)
        );
      }
      if (updateData.assignedTo !== undefined) {
        updateFields.assigned_to = updateData.assignedTo || null;
      }

      if (Object.keys(updateFields).length > 0) {
        const { error: updateError } = await supabase
          .from('orders')
          .update(updateFields)
          .eq('id', orderId);

        if (updateError) throw updateError;
      }

      // 새 메모 추가
      if (updateData.memos && Array.isArray(updateData.memos) && updateData.memos.length > 0) {
        const memosToInsert = updateData.memos.map(memo => ({
          id: memo.id,
          order_id: orderId,
          text: memo.text,
          sender_id: memo.senderId,
          sender_name: memo.senderName,
          sender_dept: memo.senderDept,
          timestamp: memo.timestamp instanceof Date
            ? memo.timestamp.toISOString()
            : memo.timestamp
        }));

        const { error: memosError } = await supabase
          .from('memos')
          .upsert(memosToInsert, { onConflict: 'id' });

        if (memosError) {
          console.warn('⚠️ 메모 삽입 실패:', memosError.message);
        }
      }

      return await this.findById(orderId);
    } catch (error) {
      console.error('주문 업데이트 오류:', error);
      throw error;
    }
  }

  // 주문 삭제
  static async delete(orderId) {
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('주문 삭제 오류:', error);
      throw error;
    }
  }
}

export default OrderModel;
