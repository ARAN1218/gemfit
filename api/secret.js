// これはVercelのサーバー(Node.js環境)で実行されます

export default function handler(request, response) {
  
    // Vercelの「Environment Variables」に設定した秘密の値を読み込む
    // process.env.[設定した変数名] でアクセスできる
    const secretMessage = process.env.MY_SECRET_MESSAGE;
  
    // もし変数が設定されていなかったらエラーを返す
    if (!secretMessage) {
      return response.status(500).json({ error: 'シークレット変数がサーバーに設定されていません。' });
    }
  
    // 読み込んだシークレット変数の値をJSON形式でクライアントに返す
    response.status(200).json({ 
      message: secretMessage 
    });
  }