// script_l.js

(async () => {
    // クライアントからはVercelのプロキシ(API)にアクセスしてCORSを回避
    const API_BASE = '/api/gas';


    // 1. DOM要素の取得
    const form = document.getElementById('weight-form');
    const weightInput = document.getElementById('weight');
    const messageElement = document.getElementById('message');
    const chartCanvas = document.getElementById('weightChart');
    let weightChart = null; 


    // グラフ描画関数 (簡略化)
    function renderChart(weightRecords) {
        if (!chartCanvas) { return; }
        if (!weightRecords || weightRecords.length === 0) {
            if (weightChart) { weightChart.destroy(); weightChart = null; }
            return;
        }
        
        const last7Records = weightRecords.slice(-7);
        const labels = last7Records.map(record => record.date); 
        const data = last7Records.map(record => parseFloat(record.weight));

        if (weightChart) { weightChart.destroy(); }

        // Chart.jsでグラフを作成 (詳細は省略)
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
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    /**
     * GASから体重履歴を取得し、renderChartを呼び出す
     */
    async function loadAndRenderChart() {

        try {
            messageElement.textContent = 'グラフデータを読み込み中...';
            messageElement.style.color = 'gray';

            // GETリクエストで履歴を取得（サーバープロキシ経由）
            const response = await fetch(`${API_BASE}?action=getHistory`);
            
            if (!response.ok) { throw new Error(`GAS履歴取得エラー: ${response.status}`); }
            
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                const text = await response.text();
                throw new Error(`Unexpected response (non-JSON): ${text.slice(0, 120)}...`);
            }
            const data = await response.json(); 

            if (data.status === 'success' && data.data) {
                // ... データ処理と重複排除ロジック ...
                const formattedRecords = data.data
                    .map(item => {
                        let dateKey = String(item.date); 
                        const dateObject = new Date(dateKey);
                        let dateLabel = !isNaN(dateObject.getTime()) ? String(dateObject.getDate()) : '無効';
                        if (!isNaN(dateObject.getTime())) { 
                            dateKey = `${dateObject.getFullYear()}/${dateObject.getMonth() + 1}/${dateObject.getDate()}`;
                        } else {
                            dateKey = '1970/1/1'; 
                        }
                        return { date: dateLabel, key: dateKey, weight: item.weight };
                    })
                    .sort((a, b) => new Date(a.key) - new Date(b.key)); 

                const uniqueRecords = {};
                formattedRecords.forEach(record => { uniqueRecords[record.key] = record; });
                const cleanRecords = Object.values(uniqueRecords);

                renderChart(cleanRecords); 
                messageElement.textContent = ''; 
                
            } else {
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


    // 2. フォーム送信時のイベント処理
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

            // ⭐ GETリクエストで記録データ送信 ⭐
            const recordUrl = `${API_BASE}?action=recordWeight&date=${dateKey}&weight=${weightValue.toFixed(1)}`;

            if (true) {
                messageElement.textContent = '記録を送信中...';
                messageElement.style.color = 'blue';
                
                fetch(recordUrl)
                    .then(async (response) => {
                        if (!response.ok) { throw new Error(`GASエラー: ${response.status}`); }
                        const ct = response.headers.get('content-type') || '';
                        if (!ct.includes('application/json')) {
                            const t = await response.text();
                            throw new Error(`Unexpected response (non-JSON): ${t.slice(0, 120)}...`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        if (data.status === 'success') {
                            loadAndRenderChart(); 
                            messageElement.textContent = '✅ 体重を記録しました！グラフを更新します。';
                            messageElement.style.color = 'orange';
                        } else {
                            throw new Error(data.message || '記録失敗');
                        }
                    })
                    .catch(error => {
                        console.error('GAS送信エラー:', error);
                        messageElement.textContent = `❌ 送信失敗: ${error.message}`;
                        messageElement.style.color = 'red';
                    });
            } else {
                    messageElement.textContent = '❌ GAS URLが未設定のため記録できません。';
                    messageElement.style.color = 'red';
            }

            form.reset();
        });
    }

    // ⭐ ページ読み込み時の実行
    await loadAndRenderChart();
})();