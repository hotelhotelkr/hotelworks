import pool from '../db.js';

class OrderModel {
  // 모든 주문 조회
  static async findAll() {
    try {
      const [orders] = await pool.execute(`
        SELECT 
          o.*,
          JSON_ARRAYAGG(
            CASE 
              WHEN m.id IS NOT NULL THEN
                JSON_OBJECT(
                  'id', m.id,
                  'text', m.text,
                  'senderId', m.sender_id,
                  'senderName', m.sender_name,
                  'senderDept', m.sender_dept,
                  'timestamp', m.timestamp
                )
              ELSE NULL
            END
          ) as memos
        FROM orders o
        LEFT JOIN memos m ON o.id = m.order_id
        GROUP BY o.id
        ORDER BY o.requested_at DESC
      `);
      
      // 메모 배열 정리 (NULL 제거 및 파싱)
      return orders.map(order => {
        let memos = [];
        try {
          if (order.memos && Array.isArray(order.memos)) {
            memos = order.memos.filter(m => m !== null && m.id).map(m => ({
              id: m.id,
              text: m.text,
              senderId: m.senderId,
              senderName: m.senderName,
              senderDept: m.senderDept,
              timestamp: new Date(m.timestamp)
            }));
          } else if (typeof order.memos === 'string') {
            const parsed = JSON.parse(order.memos);
            memos = Array.isArray(parsed) ? parsed.filter(m => m !== null && m.id).map(m => ({
              id: m.id,
              text: m.text,
              senderId: m.senderId,
              senderName: m.senderName,
              senderDept: m.senderDept,
              timestamp: new Date(m.timestamp)
            })) : [];
          }
        } catch (e) {
          console.warn('메모 파싱 오류:', e);
          memos = [];
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
          memos
        };
      });
    } catch (error) {
      console.error('주문 조회 오류:', error);
      throw error;
    }
  }

  // 주문 ID로 조회
  static async findById(orderId) {
    try {
      const [orders] = await pool.execute(`
        SELECT 
          o.*,
          JSON_ARRAYAGG(
            CASE 
              WHEN m.id IS NOT NULL THEN
                JSON_OBJECT(
                  'id', m.id,
                  'text', m.text,
                  'senderId', m.sender_id,
                  'senderName', m.sender_name,
                  'senderDept', m.sender_dept,
                  'timestamp', m.timestamp
                )
              ELSE NULL
            END
          ) as memos
        FROM orders o
        LEFT JOIN memos m ON o.id = m.order_id
        WHERE o.id = ?
        GROUP BY o.id
      `, [orderId]);
      
      if (orders.length === 0) return null;
      
      const order = orders[0];
      
      // 메모 파싱
      let memos = [];
      try {
        if (order.memos && Array.isArray(order.memos)) {
          memos = order.memos.filter(m => m !== null && m.id).map(m => ({
            id: m.id,
            text: m.text,
            senderId: m.senderId,
            senderName: m.senderName,
            senderDept: m.senderDept,
            timestamp: new Date(m.timestamp)
          }));
        } else if (typeof order.memos === 'string') {
          const parsed = JSON.parse(order.memos);
          memos = Array.isArray(parsed) ? parsed.filter(m => m !== null && m.id).map(m => ({
            id: m.id,
            text: m.text,
            senderId: m.senderId,
            senderName: m.senderName,
            senderDept: m.senderDept,
            timestamp: new Date(m.timestamp)
          })) : [];
        }
      } catch (e) {
        console.warn('메모 파싱 오류:', e);
        memos = [];
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
        memos
      };
    } catch (error) {
      console.error('주문 조회 오류:', error);
      throw error;
    }
  }

  // 주문 생성
  static async create(orderData) {
    const connection = await pool.getConnection();
    try {
      // 이미 존재하는 주문인지 확인
      const [existing] = await connection.execute(
        'SELECT id FROM orders WHERE id = ?',
        [orderData.id]
      );

      if (existing.length > 0) {
        console.log('⏭️ 주문 이미 존재 (건너뜀):', orderData.id);
        connection.release();
        return await this.findById(orderData.id);
      }

      await connection.beginTransaction();
      
      // 날짜 형식 변환
      const requestedAt = orderData.requestedAt instanceof Date 
        ? orderData.requestedAt.toISOString().slice(0, 19).replace('T', ' ')
        : (typeof orderData.requestedAt === 'string' 
          ? orderData.requestedAt.replace('T', ' ').slice(0, 19)
          : new Date().toISOString().slice(0, 19).replace('T', ' '));
      
      // 주문 삽입
      await connection.execute(`
        INSERT INTO orders (
          id, room_no, guest_name, category, item_name, quantity, priority,
          status, requested_at, created_by, request_channel, request_note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        orderData.id,
        orderData.roomNo,
        orderData.guestName || null,
        orderData.category,
        orderData.itemName,
        orderData.quantity || 1,
        orderData.priority || 'NORMAL',
        orderData.status || 'REQUESTED',
        requestedAt,
        orderData.createdBy,
        orderData.requestChannel || 'Phone',
        orderData.requestNote || null
      ]);
      
      // 메모가 있으면 삽입
      if (orderData.memos && Array.isArray(orderData.memos) && orderData.memos.length > 0) {
        for (const memo of orderData.memos) {
          try {
            // 날짜 형식 변환
            const memoTimestamp = memo.timestamp instanceof Date 
              ? memo.timestamp.toISOString().slice(0, 19).replace('T', ' ')
              : (typeof memo.timestamp === 'string' 
                ? memo.timestamp.replace('T', ' ').slice(0, 19)
                : new Date().toISOString().slice(0, 19).replace('T', ' '));
            
            await connection.execute(`
              INSERT IGNORE INTO memos (id, order_id, text, sender_id, sender_name, sender_dept, timestamp)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
              memo.id,
              orderData.id,
              memo.text,
              memo.senderId,
              memo.senderName,
              memo.senderDept,
              memoTimestamp
            ]);
          } catch (memoError) {
            console.warn('⚠️ 메모 삽입 실패 (건너뜀):', memo.id, memoError.message);
          }
        }
      }
      
      await connection.commit();
      return await this.findById(orderData.id);
    } catch (error) {
      await connection.rollback();
      console.error('주문 생성 오류:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // 주문 업데이트
  static async update(orderId, updateData) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const updateFields = [];
      const updateValues = [];
      
      if (updateData.status !== undefined) {
        updateFields.push('status = ?');
        updateValues.push(updateData.status);
      }
      if (updateData.acceptedAt !== undefined) {
        updateFields.push('accepted_at = ?');
        updateValues.push(updateData.acceptedAt);
      }
      if (updateData.inProgressAt !== undefined) {
        updateFields.push('in_progress_at = ?');
        updateValues.push(updateData.inProgressAt);
      }
      if (updateData.completedAt !== undefined) {
        updateFields.push('completed_at = ?');
        updateValues.push(updateData.completedAt);
      }
      if (updateData.assignedTo !== undefined) {
        updateFields.push('assigned_to = ?');
        updateValues.push(updateData.assignedTo || null);
      }
      
      if (updateFields.length > 0) {
        updateValues.push(orderId);
        await connection.execute(`
          UPDATE orders 
          SET ${updateFields.join(', ')}
          WHERE id = ?
        `, updateValues);
      }
      
      // 새 메모 추가
      if (updateData.memos && updateData.memos.length > 0) {
        for (const memo of updateData.memos) {
          await connection.execute(`
            INSERT IGNORE INTO memos (id, order_id, text, sender_id, sender_name, sender_dept, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            memo.id,
            orderId,
            memo.text,
            memo.senderId,
            memo.senderName,
            memo.senderDept,
            memo.timestamp
          ]);
        }
      }
      
      await connection.commit();
      return await this.findById(orderId);
    } catch (error) {
      await connection.rollback();
      console.error('주문 업데이트 오류:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // 주문 삭제
  static async delete(orderId) {
    try {
      await pool.execute('DELETE FROM orders WHERE id = ?', [orderId]);
      return true;
    } catch (error) {
      console.error('주문 삭제 오류:', error);
      throw error;
    }
  }
}

export default OrderModel;
