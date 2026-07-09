const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const supabase = require('../supabase');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/', async (req, res) => {
  const { conversationId, userMessage } = req.body;

  try {
    // 1. 過去のメッセージ履歴を取得
    const { data: history, error: historyError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (historyError) throw historyError;

    // 2. ユーザーのメッセージをDBに保存
    const { error: userMsgError } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender: 'user', content: userMessage });

    if (userMsgError) throw userMsgError;

    // 3. Geminiに送る会話履歴を整形
    const formattedHistory = history.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // 4. Geminiに送信
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const chat = model.startChat({ history: formattedHistory });
    const result = await chat.sendMessage(userMessage);
    const aiReply = result.response.text();

    // 5. AIの返答をDBに保存
    const { error: aiMsgError } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender: 'ai', content: aiReply });

    if (aiMsgError) throw aiMsgError;

    // 6. フロントに返す
    res.json({ reply: aiReply });

  } catch (error) {
    console.error('AI error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;