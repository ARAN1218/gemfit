// api/sheet.js (Google Sheets API 経由で読み書きするサーバーレス関数)

const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = '体重記録'; // 必要に応じて変更

async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
    scopes: SCOPES,
  });
  const client = await auth.getClient();
  return client;
}

export default async function handler(req, res) {
  try {
    const authClient = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    if (req.method === 'GET') {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A2:B`,
      });
      const rows = response.data.values || [];
      const data = rows.map(row => ({ date: row[0], weight: row[1] }));
      res.status(200).json({ status: 'success', data });
      return;
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      if (!body.date || !body.weight) {
        res.status(400).json({ status: 'error', message: '日付または体重がありません' });
        return;
      }

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:B`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: { values: [[body.date, body.weight]] },
      });

      res.status(200).json({ status: 'success', message: '記録完了' });
      return;
    }

    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    console.error('Google Sheets API Error:', error && error.message ? error.message : String(error));
    res.status(500).json({ status: 'error', message: 'サーバー側でエラーが発生しました', error: String(error && error.message ? error.message : error) });
  }
}


