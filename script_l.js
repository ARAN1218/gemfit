// script_l.js
 // Vercelのサーバーレス関数(/api/secret)を呼び出す
const response = await fetch('/api/secret');
if (!response.ok) {
    throw new Error(`サーバーエラー: ${response.status}`);
}
const data = await response.json();
// 💡 【重要】GASで発行したウェブアプリのURLをここに貼り付けてください
const GAS_URL = data.message;

// 1. DOM要素の取得
const form = document.getElementById('weight-form');
const weightInput = document.getElementById('weight');
const messageElement = document.getElementById('message');
const chartCanvas = document.getElementById('weightChart');
let weightChart = null; // Chart.js インスタンスを保持する変数

// グラフ描画関数 (ローカルストレージのデータを使用)
function renderChart() {
    const weightRecords = JSON.parse(localStorage.getItem('weightRecords')) || [];
    
    if (!chartCanvas) {
        console.error("Error: 'weightChart' canvas element not found.");
        return; 
    }

    if (weightRecords.length === 0) {
        if (weightChart) {
             weightChart.destroy();
             weightChart = null;
        }
        return;
    }

    // 最新の7件のレコードのみを抽出してグラフデータを作成
    const last7Records = weightRecords.slice(-7);

    const labels = last7Records.map(record => record.date); // '10/20' 形式
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
                    // 凡例のクリックによる非表示機能を無効化
                    onClick: (e, legendItem, legend) => {
                        return; 
                    },
                }
            }
        }
    });
}


// 2. フォーム送信時のイベント処理（GASへの送信とローカル保存）
form.addEventListener('submit', function(event) {
    event.preventDefault(); 
    
    // エラーチェック
    if (weightInput.value === "" || isNaN(parseFloat(weightInput.value))) {
        messageElement.textContent = '❌ 有効な体重を入力してください。';
        messageElement.style.color = 'red';
        return;
    }
    
    const enteredWeight = weightInput.value;
    const weightValue = parseFloat(enteredWeight);
    
    // データの準備
    const now = new Date();
    // GASに送るためのキー（例: 2025/10/20）
    const dateKey = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
    
    // 送信するデータオブジェクト
    const postData = {
        date: dateKey,
        weight: weightValue.toFixed(1)
    };

    // ----------------------------------------------------
    // 💡 GASへのデータ送信処理
    // ----------------------------------------------------
    fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors', // クロスドメイン通信の設定
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData) // JSON形式でデータを送信
    })
    .then(response => {
        // ⭐ ローカルストレージを更新 (グラフ表示用)
        let weightRecords = JSON.parse(localStorage.getItem('weightRecords')) || [];
        
        let isUpdated = false;
        
        // 既存のレコードがあれば更新
        for (let i = 0; i < weightRecords.length; i++) {
            if (weightRecords[i].key === dateKey) {
                weightRecords[i].weight = postData.weight;
                isUpdated = true;
                break;
            }
        }
        
        // なければ新規追加
        if (!isUpdated) {
            // date: グラフのラベル用 (10/20)、key: 内部処理用 (2025/10/20)
            weightRecords.push({ date: `${now.getMonth() + 1}/${now.getDate()}`, key: dateKey, weight: postData.weight });
        }
        
        // 日付順にソートしてローカルストレージに保存
        weightRecords.sort((a, b) => new Date(a.key) - new Date(b.key));
        localStorage.setItem('weightRecords', JSON.stringify(weightRecords));

        renderChart(); // グラフを更新

        const message = isUpdated ? '✨ 体重を修正しました！' : '✅ 体重を記録しました！';
        messageElement.textContent = `${message} `;
        messageElement.style.color = 'orange';
    })
    .catch(error => {
        console.error('GAS送信エラー:', error);
        messageElement.textContent = '❌ 送信失敗: ネットワークエラーが発生しました。';
        messageElement.style.color = 'red';
    });
    
    // フォームをリセット
    form.reset();
});

// ページが読み込まれたらすぐに実行
renderChart();

