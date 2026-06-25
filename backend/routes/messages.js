const express = require('express');
const router = express.Router();
const supabase = require('../supabase');

// 特定の会話のメッセージ一覧を取得
router.get('/:conversationId', async (req, res) => {
  const { conversationId } = req.params;

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// メッセージを保存する
router.post('/', async (req, res) => {
  const { conversationId, sender, content } = req.body;

  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender, content })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;