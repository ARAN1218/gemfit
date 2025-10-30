// script_l.js
// 体重記録用のスクリプト（安定版ベースライン）

(async () => {
    let GAS_URL = '';
    
    // ===============================================
    // 1. GAS URLの初期取得 (Vercel API経由)
    // ===============================================
    try {
        const response = await fetch('/api/secret');
        if (!response.ok) {
            throw new Error(`サーバーエラー: ${response.status}`);
        }
        const data = await response.json();
        GAS_URL = data.message;
        console.log("GAS URL取得成功:", GAS_URL);
    } catch (error) {
        console.error("GAS_URLの取得に失敗しました。Webサイトが動作しません:", error);
        document.getElementById('message').textContent = 'GAS連携エラー。F12でコンソールを確認してください。';
        return; 
    }

    // ===============================================
    // 2. DOM要素と初期設定
    // ===============================================
    const weightForm = document.getElementById('weight-form');
    const weightInput = document.getElementById('weight-input');
    const messageElement = document.getElementById('message');
    const historyArea = document.getElementById('history-area');
    
    // 食事登録ボタンのイベント（index_1.htmlへ遷移）
    const mealEntryButton = document.getElementById('meal-entry-button');
    if (mealEntryButton) {
        mealEntryButton.addEventListener('click', () => {
            window.location.href = 'index_1.html'; 
        });
    }

    // ===============================================
    // 3. 体重記録のイベント処理 (GASへのPOST)
    // ===============================================
    if (weightForm) {
        weightForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const weight = parseFloat(weightInput.value);
            if (isNaN(weight) || weight <= 0) {
                messageElement.textContent = '❌ 有効な体重を入力してください。';
                return;
            }
            
            const today = new Date();
            const dateKey = `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`;

            const postData = {
                type: 'weight', // 体重記録のタイプ
                date: dateKey,
                weight: weight
            };

            messageElement.textContent = '記録を送信中...';

            try {
                const response = await fetch(GAS_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(postData)
                });
                
                messageElement.textContent = `✅ ${dateKey} の体重 ${weight} kg を記録しました！`;
                // 記録成功後、履歴を再読み込み
                loadHistory();

            } catch (error) {
                console.error('GAS送信エラー:', error);
                messageElement.textContent = '❌ 送信失敗: ネットワークエラーが発生しました。';
            }
        });
    }
    
    // ===============================================
    // 4. 履歴の読み込み関数（GASからのGET）
    // ===============================================
    async function loadHistory() {
        if (!GAS_URL) return;
        historyArea.innerHTML = '<p>履歴を読み込み中...</p>';
        try {
            // GETリクエストで履歴を取得 (GAS側で getHistory 関数が呼ばれる想定)
            const response = await fetch(`${GAS_URL}?action=getHistory`);
            const data = await response.json();

            if (data.status === 'success' && data.data) {
                // データを表示
                historyArea.innerHTML = '<h4>直近の体重記録</h4>';
                data.data.forEach(record => {
                    historyArea.innerHTML += `<p>${record.date}: <strong>${record.weight} kg</strong></p>`;
                });
            } else {
                historyArea.innerHTML = '<p>履歴の取得に失敗しました。</p>';
            }

        } catch (error) {
            console.error('履歴読み込みエラー:', error);
            historyArea.innerHTML = '<p>履歴の読み込み中にエラーが発生しました。</p>';
        }
    }

    // 初回履歴読み込み
    loadHistory();

})();