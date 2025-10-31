// script_1.js
// 食事記録ページ (index_1.html) 用のスクリプト

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
    } catch (error) {
        console.error("GAS_URLの取得に失敗しました:", error);
        return;
    }

    // ===============================================
    // 2. DOM要素の取得
    // ===============================================
    const foodInput = document.getElementById('food-input');
    const searchButton = document.getElementById('search-button');
    const calorieResultDiv = document.getElementById('calorie-result');
    
    const mealForm = document.getElementById('meal-form');
    const mealDateInput = document.getElementById('meal-date');
    const recordedCalorieInput = document.getElementById('recorded-calorie');
    const mealNameInput = document.getElementById('meal-name');
    const recordMealButton = document.getElementById('record-meal-button');
    const mealMessageElement = document.getElementById('meal-message');

    // 初期日付の設定
    const today = new Date();
    const dateKey = `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`;
    mealDateInput.value = dateKey;

    // ===============================================
    // 3. カロリー検索のイベント処理 (Gemini API利用)
    // ===============================================
    if (searchButton) {
        searchButton.addEventListener('click', async () => {
            const foodName = foodInput.value.trim();
            if (!foodName) {
                calorieResultDiv.innerHTML = '<p style="color:red;">食事名を入力してください。</p>';
                return;
            }

            searchButton.disabled = true;
            calorieResultDiv.innerHTML = `<p style="color:blue;">「${foodName}」の情報を検索中...</p>`;
            
            // フォームの値をリセット
            recordedCalorieInput.value = '';
            mealNameInput.value = '';

            try {
                // VercelのAPI Routeを呼び出し
                const response = await fetch('/api/search-calorie', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ foodName })
                });

                const data = await response.json();

                if (response.ok && data.status === 'success') {
                    const result = data.data;
                    const calories = parseFloat(result.calories);
                    
                    // 検索結果の表示
                    calorieResultDiv.innerHTML = `
                        <div style="padding: 10px; background-color: #e6f7ff; border: 1px solid #007bff;">
                            <h4>✅ ${foodName} の推定栄養情報</h4>
                            <p><strong>カロリー:</strong> <span id="display-cal">${calories || '不明'}</span> kcal</p>
                            <ul style="list-style: none; padding-left: 10px; font-size: 0.9em;">
                                <li>P: ${result.protein || '不明'} g, F: ${result.fat || '不明'} g, C: ${result.carb || '不明'} g</li>
                            </ul>
                        </div>
                    `;
                    
                    // ⭐ 検索結果を記録フォームに自動入力 ⭐
                    if (!isNaN(calories) && calories > 0) {
                        recordedCalorieInput.value = calories.toFixed(0);
                        mealNameInput.value = foodName;
                        mealMessageElement.textContent = '✅ カロリーがセットされました。記録ボタンを押してください。';
                        mealMessageElement.style.color = 'orange';
                    } else {
                        mealMessageElement.textContent = '❌ 有効なカロリー値が取得できませんでした。手動で入力してください。';
                        mealMessageElement.style.color = 'red';
                    }

                } else {
                    const message = data.error || '不明なエラーが発生しました。';
                    calorieResultDiv.innerHTML = `<p style="color:red;">❌ 検索失敗: ${message}</p>`;
                }
            } catch (error) {
                console.error('カロリー検索エラー:', error);
                calorieResultDiv.innerHTML = '<p style="color:red;">❌ ネットワーク接続またはサーバーエラーです。</p>';
            } finally {
                searchButton.disabled = false;
            }
        });
    }

    // ===============================================
    // 4. 食事記録のイベント処理 (GASへのPOST)
    // ===============================================
    if (mealForm) {
        mealForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const recordedCalorie = recordedCalorieInput.value;
            const mealName = mealNameInput.value.trim();
            
            if (!recordedCalorie || isNaN(parseFloat(recordedCalorie)) || !mealName) {
                mealMessageElement.textContent = '❌ カロリーと食事名が正しく入力されていません。';
                mealMessageElement.style.color = 'red';
                return;
            }

            // データの準備
            const postData = {
                type: 'meal', 
                date: mealDateInput.value,
                calorie: parseFloat(recordedCalorie),
                mealName: mealName
            };

            recordMealButton.disabled = true;
            mealMessageElement.textContent = '記録を送信中...';
            mealMessageElement.style.color = 'blue';

            try {
                const response = await fetch(GAS_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(postData)
                });

                mealMessageElement.textContent = `✅ 「${mealName}」 (${recordedCalorie} kcal) を記録しました！`;
                mealMessageElement.style.color = 'green';
                
                // フォームをリセット
                foodInput.value = '';
                recordedCalorieInput.value = '';
                mealNameInput.value = '';

            } catch (error) {
                console.error('GAS送信エラー:', error);
                mealMessageElement.textContent = '❌ 送信失敗: ネットワークエラーが発生しました。';
                mealMessageElement.style.color = 'red';
            } finally {
                recordMealButton.disabled = false;
            }
        });
    }

})();