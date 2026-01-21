import express from 'express';
import supabase from './supabase.js';

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

    const { data: user, error } = await supabase
      .from('users')
      .upsert({
        id,
        username,
        password,
        name,
        dept,
        role
      }, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (error) throw error;

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

    const updateData = {};
    if (username) updateData.username = username;
    if (password) updateData.password = password;
    if (name) updateData.name = name;
    if (dept) updateData.dept = dept;
    if (role) updateData.role = role;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!user) {
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

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log('✅ 사용자 삭제 완료:', id);
    res.json({ message: 'User deleted', id });
  } catch (error) {
    console.error('❌ 사용자 삭제 실패:', error.message);
    res.status(500).json({ error: 'Failed to delete user', message: error.message });
  }
});

export default router;
