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
        // 💡 【重要】GASで発行したウェブアプリのURLをここに貼り付けてください
        GAS_URL = data.message;
    } catch (error) {
        console.error("GAS_URLの取得に失敗しました:", error);
    }


    // 1. DOM要素の取得
    const form = document.getElementById('weight-form');
    const weightInput = document.getElementById('weight');
    const messageElement = document.getElementById('message');
    const chartCanvas = document.getElementById('weightChart');
    let weightChart = null; // Chart.js インスタンスを保持する変数


    // グラフ描画関数 (GASから取得したデータを使用)
    // weightRecords: { date: 'M/D', key: 'YYYY/M/D', weight: 60.5 } の配列
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

        const labels = last7Records.map(record => record.date); // '10/20' 形式
        const data = last7Records.map(record => parseFloat(record.weight));

        if (weightChart) {
            weightChart.destroy();
        }

        // Chart.jsでグラフを作成 (既存ロジックとほぼ同じ)
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
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: '体重 (kg)'
                        }
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

            // GASに履歴データ取得（action=getHistory）をリクエスト
            const response = await fetch(`${GAS_URL}?action=getHistory`);
            
            if (!response.ok) {
                throw new Error(`GAS履歴取得エラー: ${response.status}`);
            }
            const data = await response.json();

            if (data.status === 'success' && data.data) {
                
                // GASからのデータをグラフ描画用の形式に変換し、日付順にソート（GAS側でソートされていれば不要）
                const formattedRecords = data.data
                    .map(item => ({
                        date: item.date.split('/').slice(1).join('/'), // M/D形式に変換 (例: 10/20)
                        key: item.date,                                 // YYYY/M/D (キー用)
                        weight: item.weight
                    }))
                    // 日付（key）でソート
                    .sort((a, b) => new Date(a.key) - new Date(b.key)); 

                renderChart(formattedRecords);
                messageElement.textContent = ''; // 成功したらメッセージを消す
                
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
    // フォーム要素が存在することを確認
    if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault();
            
            // エラーチェックはそのまま維持

            if (weightInput.value === "" || isNaN(parseFloat(weightInput.value))) {
                messageElement.textContent = '❌ 有効な体重を入力してください。';
                messageElement.style.color = 'red';
                return;
            }

            const enteredWeight = weightInput.value;
            const weightValue = parseFloat(enteredWeight);

            // データの準備
            const now = new Date();
            const dateKey = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;

            const postData = {
                type: 'weight', // GAS側で体重記録と識別できるようにタイプを追加（もし必要であれば）
                date: dateKey,
                weight: weightValue.toFixed(1)
            };

            // ----------------------------------------------------
            // 💡 GASへのデータ送信処理
            // ----------------------------------------------------
            if (GAS_URL) {
                messageElement.textContent = '記録を送信中...';
                messageElement.style.color = 'blue';

                fetch(GAS_URL, {
                        method: 'POST',
                        mode: 'no-cors', // クロスドメイン通信の設定
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