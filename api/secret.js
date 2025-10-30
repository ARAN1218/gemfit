// api/secret.js
// GASのウェブアプリURLをフロントエンドに渡すためのVercelサーバーレス関数

export default function handler(req, res) {
    // ⭐ Vercelの環境変数名に合わせて修正しました ⭐
    const gasUrl = process.env.MY_SECRET_MESSAGE; 
    
    if (gasUrl) {
        // GASのURLが存在すれば、JSONとして返します。
        res.status(200).json({ message: gasUrl });
    } else {
        // 環境変数が設定されていない場合、500エラーを返します。
        res.status(500).json({ error: 'GAS URL environment variable (MY_SECRET_MESSAGE) not set' });
    }
}