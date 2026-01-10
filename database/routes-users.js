import express from 'express';
import pool from './db.js';

const router = express.Router();

/**
 * 사용자 추가
 * POST /api/users
 */
router.post('/users', async (req, res) => {
  try {
    const { id, username, password, name, dept, role } = req.body;

    if (!id || !username || !password || !name || !dept || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    await pool.execute(
      `INSERT INTO users (id, username, password, name, dept, role)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       username = VALUES(username),
       password = VALUES(password),
       name = VALUES(name),
       dept = VALUES(dept),
       role = VALUES(role)`,
      [id, username, password, name, dept, role]
    );

    console.log('✅ 사용자 추가/업데이트 완료:', username);
    res.status(201).json({ message: 'User created/updated', id, username });
  } catch (error) {
    console.error('❌ 사용자 추가/업데이트 실패:', error.message);
    res.status(500).json({ error: 'Failed to create/update user', message: error.message });
  }
});

/**
 * 사용자 업데이트
 * PUT /api/users/:id
 */
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, name, dept, role } = req.body;

    const updates = [];
    const values = [];

    if (username) {
      updates.push('username = ?');
      values.push(username);
    }
    if (password) {
      updates.push('password = ?');
      values.push(password);
    }
    if (name) {
      updates.push('name = ?');
      values.push(name);
    }
    if (dept) {
      updates.push('dept = ?');
      values.push(dept);
    }
    if (role) {
      updates.push('role = ?');
      values.push(role);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    const [result] = await pool.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('✅ 사용자 업데이트 완료:', id);
    res.json({ message: 'User updated', id });
  } catch (error) {
    console.error('❌ 사용자 업데이트 실패:', error.message);
    res.status(500).json({ error: 'Failed to update user', message: error.message });
  }
});

/**
 * 사용자 삭제
 * DELETE /api/users/:id
 */
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      'DELETE FROM users WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('✅ 사용자 삭제 완료:', id);
    res.json({ message: 'User deleted', id });
  } catch (error) {
    console.error('❌ 사용자 삭제 실패:', error.message);
    res.status(500).json({ error: 'Failed to delete user', message: error.message });
  }
});

export default router;
