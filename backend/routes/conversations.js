const express = require('express');
const router = express.Router();
const supabase = require('../supabase');

// 会話一覧を取得
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 新しい会話を作成
router.post('/', async (req, res) => {
  const { userId, title } = req.body;

  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: userId, title: title || '新しい会話' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;