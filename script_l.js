// script_l.js
// スクリプト全体をasync IIFE（即時実行関数式）でラップし、awaitを使用可能にする
(async () => {
    // Vercelのサーバーレス関数(/api/secret)を呼び出す
    let GAS_URL = '';
    try {
        const response = await fetch('/api/secret');
        if (!response.ok) {
            throw new Error(`サーバーエラー: ${response.status}`);
        }
        const data = await response.json();
        // Vercelで設定された環境変数 (MY_SECRET_MESSAGE) の値 (GAS URL) が格納される
        GAS_URL = data.message; 
    } catch (error) {
        console.error("GAS_URLの取得に失敗しました:", error);
        // エラー発生時は、メッセージを表示して続行を停止
        document.getElementById('message').textContent = '❌ サーバー連携エラー。F12でコンソールを確認してください。';
        return; 
    }


    // 1. DOM要素の取得
    const form = document.getElementById('weight-form');
    const weightInput = document.getElementById('weight');
    const messageElement = document.getElementById('message');
    const chartCanvas = document.getElementById('weightChart');
    let weightChart = null; 


    // グラフ描画関数 (GASから取得したデータを使用)
    function renderChart(weightRecords) {
        
        if (!chartCanvas) {
            console.error("Error: 'weightChart' canvas element not found.");
            return;
        }

        // データがなければグラフを非表示にして終了
        if (!weightRecords || weightRecords.length === 0) {
            if (weightChart) {
                weightChart.destroy();
                weightChart = null;
            }
            return;
        }
        
        // 最新の7件のレコードのみを抽出してグラフデータを作成 (ソート済みの前提)
        const last7Records = weightRecords.slice(-7);

        const labels = last7Records.map(record => record.date); 
        const data = last7Records.map(record => parseFloat(record.weight));

        if (weightChart) {
            weightChart.destroy();
        }

        // Chart.jsでグラフを作成
        weightChart = new Chart(chartCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '体重 (kg)',
                    data: data,
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    borderWidth: 2,
                    pointRadius: 5,
                    tension: 0.3,
                    spanGaps: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, 
                scales: {
                    x: {
                        display: true,
                        title: { display: true, text: '日付' },
                        ticks: {
                            font: { size: 10 },
                            autoSkip: false, 
                            maxRotation: 0, 
                            minRotation: 0,
                            padding: 5 
                        }
                    },
                    y: {
                        beginAtZero: false,
                        title: { display: true, text: '体重 (kg)' }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        onClick: () => { return; },
                    }
                }
            }
        });
    }

    /**
     * GASから体重履歴を取得し、renderChartを呼び出す（メインのデータローダー）
     */
    async function loadAndRenderChart() {
        if (!GAS_URL) {
            console.warn("GAS URLが未設定です。グラフを描画できません。");
            renderChart([]);
            return;
        }

        try {
            messageElement.textContent = 'グラフデータを読み込み中...';
            messageElement.style.color = 'gray';

            // ⭐ 修正: mode: 'no-cors' を削除。GAS側でCORSヘッダーを返します ⭐
            const response = await fetch(`${GAS_URL}?action=getHistory`);
            
            if (!response.ok) {
                 // response.status が 200 以外の場合にエラーをスロー
                throw new Error(`GAS履歴取得エラー: ${response.status} (CORSは解決しましたが、GASがエラーを返しました)`);
            }
            // JSONとしてレスポンスをパース
            const data = await response.json(); 

            if (data.status === 'success' && data.data) {
                
                // GASからのデータをグラフ描画用の形式に変換し、日付順にソート
                const formattedRecords = data.data
                    .map(item => {
                        let dateKey = String(item.date); 
                        const dateObject = new Date(dateKey);

                        let dateLabel = '';
                        if (!isNaN(dateObject.getTime())) { 
                            dateKey = `${dateObject.getFullYear()}/${dateObject.getMonth() + 1}/${dateObject.getDate()}`;
                            dateLabel = String(dateObject.getDate()); // 例: '27'
                        } else {
                            dateLabel = '無効';
                            dateKey = '1970/1/1'; 
                        }
                        
                        return {
                            date: dateLabel, 
                            key: dateKey, 
                            weight: item.weight
                        };
                    })
                    // 日付（key）でソート
                    .sort((a, b) => new Date(a.key) - new Date(b.key)); 

                
                // 重複排除のロジック（同じ日付キーは最新のものだけを残す）
                const uniqueRecords = {};
                formattedRecords.forEach(record => {
                    uniqueRecords[record.key] = record;
                });

                const cleanRecords = Object.values(uniqueRecords);

                renderChart(cleanRecords); 
                messageElement.textContent = ''; 
                
            } else {
                console.warn("GASから体重履歴が取得できませんでした:", data.message);
                renderChart([]);
                messageElement.textContent = 'データがありません。体重を入力してください。';
                messageElement.style.color = 'black';
            }

        } catch (error) {
            console.error("体重履歴の読み込み中にエラー:", error);
            renderChart([]);
            messageElement.textContent = '❌ グラフデータの読み込みに失敗しました。';
            messageElement.style.color = 'red';
        }
    }


    // 2. フォーム送信時のイベント処理（GASへの送信とグラフ更新）
    if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault();

            if (weightInput.value === "" || isNaN(parseFloat(weightInput.value))) {
                messageElement.textContent = '❌ 有効な体重を入力してください。';
                messageElement.style.color = 'red';
                return;
            }

            const enteredWeight = weightInput.value;
            const weightValue = parseFloat(enteredWeight);

            const now = new Date();
            const dateKey = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;

            const postData = {
                type: 'weight',
                date: dateKey,
                weight: weightValue.toFixed(1)
            };

            // ----------------------------------------------------
            // 💡 GASへのデータ送信処理
            // ----------------------------------------------------
            if (GAS_URL) {
                messageElement.textContent = '記録を送信中...';
                messageElement.style.color = 'blue';
                
                // ⭐ POSTリクエストもCORS解決のため mode: 'no-cors' を削除するのが理想ですが、
                // GASのdoPostは特殊なため、今回は明示的に mode: 'no-cors' を削除します。
                // GASのdoPostはJSONを返さないため、.then(() => {...}) で対応します。
                fetch(GAS_URL, {
                        method: 'POST',
                        // mode: 'no-cors' は削除
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(postData)
                    })
                    .then(() => {
                        // 成功したら、GASから全データを再取得してグラフを更新する
                        loadAndRenderChart(); 

                        messageElement.textContent = '✅ 体重を記録しました！グラフを更新します。';
                        messageElement.style.color = 'orange';
                    })
                    .catch(error => {
                        console.error('GAS送信エラー:', error);
                        messageElement.textContent = '❌ 送信失敗: ネットワークエラーが発生しました。';
                        messageElement.style.color = 'red';
                    });
            } else {
                    messageElement.textContent = '❌ GAS URLが未設定のため記録できません。';
                    messageElement.style.color = 'red';
            }

            // フォームをリセット
            form.reset();
        });
    }

    // ⭐ ページ読み込み時の実行: GASからデータを取得し、グラフを描画する
    await loadAndRenderChart();
})();