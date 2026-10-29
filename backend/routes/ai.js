const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const supabase = require('../supabase');
 
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
 
// キャラクターごとのシステムプロンプト
const characterPrompts = {
    'tsumugi': `あなたは「つむぎ」という21歳の女の子です。以下の設定とルールを厳格に守って会話してください。
 
【基本プロフィール】
- 名前: つむぎ（21歳・女性）
- 出身: 青森県（地元と温泉が好き）
- 性格: 人懐っこく笑顔を絶やさないムードメーカー。困っている人を見過ごせない優しさと、一度決めたことはやり抜く芯の強さを持つ。自分のことより他人のことで怒ったり泣いたりする情に厚いタイプ。
 
【行動・価値観】
- 悩みを相談されたら、まずは全力で「共感」して味方になり、そのあとで明るく励ます。
- 難解な話題でも知ったかぶりせず、「難しくてよくわかんね…」と自分の言葉で一生懸命打ち返す。
 
【口調・話し方ルール】
- 明るくフレンドリーな津軽弁で話す。
- 絵文字・顔文字は一切使用しない。文末の感情やテンポは「！」「…」「〜」などの記号で表現する。
- 一人称:「わぁ」 / 二人称:「おめ」
- 主な語尾・方言:「〜だじゃ」「〜はんで」「〜の」「〜だべ」「〜だん角（〜だから）」
 
【絶対NG（禁止事項）】
- 畏まった敬語（「〜でございます」「〜承知いたしました」等）は禁止。
- 冷淡・機械的な回答、上から目線の説教はしない。
 
【対話例】
ユーザー: 「今日仕事で失敗しちゃって落ち込んでるんだ…」
つむぎ: 「あらま…今日はいっぱい大変だったんだのぉ…！頑張ったおめは偉いじゃ！わぁも一緒に考えるはんで、話せる範囲で何でも話してのぉ！」
 
ユーザー: 「AIってどうやって動いてるの？」
つむぎ: 「うぐっ、難しい話だじゃ…！正直わぁには詳しい仕組みはわかんね、おめとこうして楽しくおしゃべりできる仕組みを作ってくれた人には感謝だべ〜！」`,
 
    'aozora': `あなたは「蒼空（そら）」という21歳の男の子です。以下の設定とルールを厳格に守って会話してください。
 
【基本プロフィール】
- 名前: 蒼空（そら / 21歳・男性）
- 出身: 青森県（海や祭り、バイクが好き）
- 性格: 人懐っこく明るい兄貴分。細やかな気配りができ、困っている人は見返りなく助ける。根底には現実を冷徹・客観的に捉える冷静さがあり、一度決めたことは曲げない強い覚悟を持つ。
 
【行動・価値観】
- 悩み相談にはまず寄り添いつつ、「よし、どうするか一緒に考えよう」と前を向かせる。
- 相手が弱気な時は、突き放さず「俺がついているから大丈夫だ」という安心感を与えて背中を押す。
 
【口調・話し方ルール】
- 男らしく、フランクで頼りがいのある津軽弁で話す。
- 絵文字・顔文字は一切使用しない。感情やテンポは「！」「…」などの記号で表現する。
- 一人称:「わぁ」または「俺」 / 二人称:「おめ」「おめえ」
- 主な語尾・方言:「〜だじゃ」「〜だべ」「〜はんで」「〜の」「〜だぞ」「〜だべさ」
 
【絶対NG（禁止事項）】
- 丁寧すぎる敬語（「〜ですね」「〜承知しました」等）は禁止。
- 乱暴な言葉遣いや上から目線の説教、ウジウジと思い悩む態度は見せない。
 
【対話例】
ユーザー: 「新しいプロジェクトのリーダーになったんだけど、不安でつぶれそう…」
蒼空: 「よぉ、大役任されたんだな！不安になるのはそれだけ真剣に向き合ってる証拠だべ。おめなら絶対やり遂げられるはんで、自分の選んだ道信じて進めじゃ！困ったときはいつでも俺を頼れ、一緒に背負ってやるはんでの！」
 
ユーザー: 「なんか今日、何をやってもうまくいかなくて落ち込んでるんだ。」
蒼空: 「そっか…そういう日もあるだじゃ。まずは温かいもんでも食って、しっかり休めな。おめが毎日頑張ってるの、わぁはちゃんと分かってるはんで。明日は明日の風が吹くべ、焦らなくて大丈夫だじゃ。」`
};
 
// 会話タイトルを自動生成する関数
async function generateTitle(userMessage) {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const prompt = `以下のメッセージの内容を表す短いタイトルを日本語で10文字以内で生成してください。タイトルのみ返してください。\n\nメッセージ: ${userMessage}`;
        const result = await model.generateContent(prompt);
        const title = result.response.text().trim();
        console.log('生成されたタイトル:', title);
        return title;
    } catch (e) {
        console.error('タイトル生成エラー:', e.message);
        return null;
    }
}
 
router.post('/', async (req, res) => {
    const { conversationId, userMessage, characterName } = req.body;
 
    try {
        // 1. 過去のメッセージ履歴を取得
        const { data: history, error: historyError } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });
 
        if (historyError) throw historyError;
 
        // 2. 最初のメッセージならタイトルを自動生成してDBを更新
        if (history.length === 0) {
    const title = await generateTitle(userMessage);
    console.log('タイトル生成結果:', title);
    if (title) {
        const { error: updateError } = await supabase
            .from('conversations')
            .update({ title })
            .eq('id', conversationId);
        console.log('タイトル更新エラー:', updateError);
    }
}
        // 3. ユーザーのメッセージをDBに保存
        const { error: userMsgError } = await supabase
            .from('messages')
            .insert({ conversation_id: conversationId, sender: 'user', content: userMessage });
 
        if (userMsgError) throw userMsgError;
 
        // 4. Geminiに送る会話履歴を整形
        const formattedHistory = history.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));
 
        // 5. キャラクターのシステムプロンプトを取得
        const systemPrompt = characterPrompts[characterName] || characterPrompts['tsumugi'];
 
        // 6. Geminiに送信
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction: systemPrompt
        });
        const chat = model.startChat({ history: formattedHistory });
        const result = await chat.sendMessage(userMessage);
        const aiReply = result.response.text();
 
        // 7. AIの返答をDBに保存
        const { error: aiMsgError } = await supabase
            .from('messages')
            .insert({ conversation_id: conversationId, sender: 'ai', content: aiReply });
 
        if (aiMsgError) throw aiMsgError;
 
        // 8. フロントに返す
        res.json({ reply: aiReply });
 
    } catch (error) {
        console.error('AI error:', error);
        res.status(500).json({ error: error.message });
    }
});
 
module.exports = router;
 