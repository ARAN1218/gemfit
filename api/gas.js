// api/gas.js
// GAS へのリクエストをサーバー側でプロキシして、CORS を回避するためのエンドポイント

export default async function handler(req, res) {
  const gasUrl = process.env.MY_SECRET_MESSAGE; // GAS WebApp のベースURL
  if (!gasUrl) {
    res.status(500).json({ error: 'GAS URL environment variable (MY_SECRET_MESSAGE) not set' });
    return;
  }

  try {
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.status(204).end();
      return;
    }
    // クエリをそのまま転送（例: action=getHistory など）
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    const targetUrl = `${gasUrl}${queryString}`;

    const upstream = await fetch(targetUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      // GETのみ利用。必要に応じてPOST対応を拡張
    });

    const text = await upstream.text();
    const upstreamType = upstream.headers.get('content-type') || '';

    // CORS ヘッダ付与（同一オリジンでの利用が主だが明示しておく）
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (!upstream.ok) {
      if (upstreamType) res.setHeader('Content-Type', upstreamType);
      res.status(upstream.status).send(text);
      return;
    }

    // GAS 側の Content-Type を尊重して返却
    if (upstreamType) res.setHeader('Content-Type', upstreamType);
    res.status(200).send(text);
  } catch (error) {
    res.status(500).json({ error: 'Proxy fetch failed', detail: String(error) });
  }
}


