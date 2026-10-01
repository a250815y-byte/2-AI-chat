const express = require('express');
const router = express.Router();
const supabase = require('../supabase');

// 新規登録
router.post('/register', async (req, res) => {
  const { email, password, username } = req.body;

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (error) return res.status(400).json({ error: error.message });

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ id: data.user.id, username });

    if (profileError) return res.status(400).json({ error: profileError.message });

    res.json({ message: '登録完了', userId: data.user.id });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ログイン
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) return res.status(400).json({ error: error.message });

    res.json({
      userId: data.user.id,
      email: data.user.email,
      accessToken: data.session.access_token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ログアウト
router.post('/logout', async (req, res) => {
  const { error } = await supabase.auth.signOut();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'ログアウトしました' });
});

module.exports = router;