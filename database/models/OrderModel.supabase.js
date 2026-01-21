import supabase from '../supabase.js';

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

      // 날짜 형식 변환
      const requestedAt = orderData.requestedAt instanceof Date
        ? orderData.requestedAt.toISOString()
        : (typeof orderData.requestedAt === 'string'
          ? orderData.requestedAt
          : new Date().toISOString());

      // 주문 삽입
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
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
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 메모가 있으면 삽입
      if (orderData.memos && Array.isArray(orderData.memos) && orderData.memos.length > 0) {
        const memosToInsert = orderData.memos.map(memo => {
          const memoTimestamp = memo.timestamp instanceof Date
            ? memo.timestamp.toISOString()
            : (typeof memo.timestamp === 'string'
              ? memo.timestamp
              : new Date().toISOString());

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
        updateFields.accepted_at = updateData.acceptedAt instanceof Date
          ? updateData.acceptedAt.toISOString()
          : updateData.acceptedAt;
      }
      if (updateData.inProgressAt !== undefined) {
        updateFields.in_progress_at = updateData.inProgressAt instanceof Date
          ? updateData.inProgressAt.toISOString()
          : updateData.inProgressAt;
      }
      if (updateData.completedAt !== undefined) {
        updateFields.completed_at = updateData.completedAt instanceof Date
          ? updateData.completedAt.toISOString()
          : updateData.completedAt;
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
