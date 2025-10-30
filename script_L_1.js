// ✅ 変更点: MIN_SAFE_CALORIES 定数と、そのチェックロジックを削除しました。

document.getElementById('goal-form').addEventListener('submit', function(e) {
    e.preventDefault();

    // 1. フォームデータの取得と型変換 (parseFloatを徹底)
    const currentWeight = parseFloat(document.getElementById('current_weight').value);
    const targetWeight = parseFloat(document.getElementById('target_weight').value);
    const targetDateValue = document.getElementById('target_date').value;
    const activityLevel = document.getElementById('activity_level').value;

    const targetDate = new Date(targetDateValue);
    const today = new Date();
    
    // 目標達成までの期間 (日数) を計算
    const diffTime = targetDate.getTime() - today.getTime();
    let daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // 厳密なチェック
    if (currentWeight <= 0 || targetWeight <= 0 || targetDateValue === "" || currentWeight <= targetWeight || daysRemaining <= 0) {
        let alertMessage = "入力値を確認してください。\n";
        if (currentWeight <= targetWeight) {
            alertMessage += "・目標体重は現在の体重より低い必要があります。\n";
        }
        if (daysRemaining <= 0) {
            alertMessage += "・目標達成日は未来の日付である必要があります。\n";
        }
        alert(alertMessage);
        document.getElementById('result-area').style.display = 'none';
        return;
    }

    // 2. カロリー計算ロジック
    
    // 基礎代謝 (BMR) の計算 (簡易版: 体重ベースで仮計算)
    const BMR = (22 * currentWeight) + 500; 

    // 1日の総消費カロリー (TDEE) の計算
    const TDEE = BMR * parseFloat(activityLevel);
    
    // 減量目標 (kg)
    const weightLoss = currentWeight - targetWeight; 

    // 減量に必要な総カロリー赤字 (1kg = 7200 kcalとして計算)
    const totalCalorieDeficit = weightLoss * 7200; 

    // 1日あたりのカロリー赤字
    const dailyCalorieDeficit = totalCalorieDeficit / daysRemaining;

    // 推奨 1日摂取カロリーの計算 (下限なし)
    let dailyIntakeTarget = TDEE - dailyCalorieDeficit;

    // 3. 結果の表示 (警告ロジック削除)
    const goalMessageElement = document.getElementById('goal-message');
    const intakeCalorieElement = document.getElementById('intake-calorie');

    // 常に成功メッセージを表示
    goalMessageElement.textContent = "✅ 目標達成のための推奨カロリーです。頑張りましょう！";
    goalMessageElement.style.color = "green";

    // 計算結果の表示
    document.getElementById('days-remaining').textContent = daysRemaining;
    document.getElementById('weight-loss').textContent = weightLoss.toFixed(1);
    
    // 計算結果をそのまま表示
    intakeCalorieElement.textContent = Math.round(dailyIntakeTarget);
    
    document.getElementById('result-area').style.display = 'block';

    // 4. データ保存 (LocalStorageに保存)
    // TDEEも計算しているので、運動目標設定のためTDEEも保存します
    localStorage.setItem('userGoal', JSON.stringify({
        dailyIntakeTarget: Math.round(dailyIntakeTarget),
        TDEE: Math.round(TDEE) 
    }));
    // 現在の体重も保存
    localStorage.setItem('currentWeight', currentWeight); 
});

// 初期体重をLocalStorageから読み込む（なければ65.0）
const storedWeight = localStorage.getItem('currentWeight') || '65.0';
document.getElementById('current_weight').value = storedWeight;