const express = require('express');
const router = express.Router();
const supabase = require('../supabase');

// 対応しているキャラクター（ID → 表示名）
const CHARACTERS = { tsumugi: 'つむぎ', aozora: '蒼空' };

// ユーザー×キャラクターの会話を探す（古い重複が残っていても最古の1件を使う）
async function findConversation(userId, characterName) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .eq('character_name', characterName)
    .order('created_at', { ascending: true })
    .limit(1);

  if (error) throw error;
  return data[0] || null;
}

// 会話を取得し、なければ作成する。同時リクエストで先に作られた場合は、その会話を返す。
async function getOrCreateConversation(userId, characterName) {
  const existing = await findConversation(userId, characterName);
  if (existing) return existing;

  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: userId, character_name: characterName, title: CHARACTERS[characterName] })
    .select()
    .single();

  if (!error) return data;

  // unique(user_id, character_name) に違反 = 同時に別リクエストが作成済み
  if (error.code === '23505') {
    const again = await findConversation(userId, characterName);
    if (again) return again;
  }
  throw error;
}

// 会話一覧を取得（キャラクターごとに1件）
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

// キャラクターとのチャットを取得（なければ作成）
router.post('/', async (req, res) => {
  const { userId, characterName } = req.body;

  if (!userId) return res.status(400).json({ error: 'userId is required' });
  if (!CHARACTERS[characterName]) {
    return res.status(400).json({ error: 'characterName must be one of: ' + Object.keys(CHARACTERS).join(', ') });
  }

  try {
    const conversation = await getOrCreateConversation(userId, characterName);
    res.json(conversation);
  } catch (error) {
    console.error('Supabase error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 会話の削除は廃止（キャラクターごとに1つのチャットを履歴ごと保持する）

module.exports = router;
