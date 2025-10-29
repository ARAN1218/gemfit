

// 1. DOM要素の取得
const form = document.getElementById('goal-form');
const currentWeightInput = document.getElementById('current_weight');
const targetWeightInput = document.getElementById('target_weight');
const targetDateInput = document.getElementById('target_date');
const activityLevelSelect = document.getElementById('activity_level');
const resultArea = document.getElementById('result-area');
const messageElement = document.getElementById('goal-message');

// ローカルストレージから最新の体重を取得し、初期値として設定
function setInitialWeight() {
    const records = JSON.parse(localStorage.getItem('weightRecords')) || [];
    if (records.length > 0) {
        // 最新のレコードを取得
        const latestWeight = records[records.length - 1].weight;
        currentWeightInput.value = latestWeight;
    }
}

// 2. カロリー計算ロジック
// 7200kcalは脂肪1kgを燃焼させるのに必要な消費カロリーのおおよその値
const KCAL_PER_KG = 7200; 

/**
 * BMR (基礎代謝) の簡易計算 (女性の成人を想定 - より正確には性別・身長・年齢が必要)
 * 男性: (13.397 x 体重kg) + (4.799 x 身長cm) - (5.677 x 年齢) + 88.362
 * 女性: (9.247 x 体重kg) + (3.098 x 身長cm) - (4.330 x 年齢) + 447.593
 * * 💡 今回は体重と簡易定数で計算し、ユーザー入力の負担を減らします。
 */
function calculateBMR(weight) {
    // 簡易版: 体重から大まかに計算 (例: 体重×24時間×1.0kcal/kg/h) 
    // 実際には身長・年齢・性別が必要ですが、今回はデモとして簡易的に
    return Math.round(weight * 24); // 基礎代謝はおおよそ体重の24倍
}

function calculateTargetCalories(currentWeight, targetWeight, days, activityLevel) {
    const weightToLose = currentWeight - targetWeight;
    if (weightToLose <= 0) {
        return null; // 減量目標ではない、または目標体重が現在の体重以上
    }
    
    // 1. 基礎代謝 (BMR) と総消費カロリー (TDEE) を計算
    const bmr = calculateBMR(currentWeight);
    const tdee = Math.round(bmr * activityLevel);

    // 2. 目標達成に必要な総カロリー赤字 (合計)
    const totalCalorieDeficit = weightToLose * KCAL_PER_KG;

    // 3. 1日あたりの平均カロリー赤字
    const dailyCalorieDeficit = totalCalorieDeficit / days;
    
    // 4. 推奨 1日摂取カロリー
    const recommendedIntake = Math.round(tdee - dailyCalorieDeficit);

    // 1日あたりの純粋な運動消費カロリー目標 (例: TDEEとBMRの差分)
    const exerciseTarget = tdee - bmr; 
    
    // ⚠ 安全性チェック: 極端なカロリー制限を防ぐ
    const MIN_INTAKE = 1200; 
    if (recommendedIntake < MIN_INTAKE) {
        messageElement.textContent = `⚠ 安全のため、1日の摂取カロリーは最低 ${MIN_INTAKE} kcalに設定されました。期間を見直しましょう。`;
        messageElement.style.color = 'red';
        
        return {
            tdee: tdee,
            intake: MIN_INTAKE,
            weightLoss: weightToLose.toFixed(1)
        };
    }


    return {
        tdee: tdee,
        intake: recommendedIntake,
        weightLoss: weightToLose.toFixed(1)
    };
}


// 3. フォーム送信時の処理
form.addEventListener('submit', function(event) {
    event.preventDefault();

    const currentWeight = parseFloat(currentWeightInput.value);
    const targetWeight = parseFloat(targetWeightInput.value);
    const targetDateStr = targetDateInput.value;
    const activityLevel = parseFloat(activityLevelSelect.value);

    const today = new Date();
    const targetDate = new Date(targetDateStr);
    
    // 日付の検証
    if (targetDate <= today) {
        messageElement.textContent = '❌ 目標達成日は今日以降の日付に設定してください。';
        messageElement.style.color = 'red';
        resultArea.style.display = 'none';
        return;
    }
    
    // 体重の検証
    if (targetWeight >= currentWeight) {
        messageElement.textContent = '❌ 目標体重は現在の体重より低く設定してください。';
        messageElement.style.color = 'red';
        resultArea.style.display = 'none';
        return;
    }

    // 日数の計算
    const timeDiff = targetDate.getTime() - today.getTime();
    const days = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));


    // カロリー計算
    const result = calculateTargetCalories(currentWeight, targetWeight, days, activityLevel);

    if (result) {
        // 4. 結果表示
        document.getElementById('days-remaining').textContent = days;
        document.getElementById('weight-loss').textContent = result.weightLoss;
        document.getElementById('tdee').textContent = result.tdee;
        document.getElementById('intake-calorie').textContent = result.intake;
        
        resultArea.style.display = 'block';
        messageElement.textContent = '目標カロリーが設定されました！食事記録に反映させましょう。';
        messageElement.style.color = 'green';
        
        // 5. ローカルストレージに目標データを保存 (後のページ連携用)
        localStorage.setItem('userGoal', JSON.stringify({
            currentWeight: currentWeight,
            targetWeight: targetWeight,
            targetDate: targetDateStr,
            dailyIntakeTarget: result.intake,
            dailyTDEE: result.tdee,
            activityLevel: activityLevel,
        }));

    } else {
        messageElement.textContent = '❌ 計算エラーが発生しました。入力値を確認してください。';
        messageElement.style.color = 'red';
        resultArea.style.display = 'none';
    }
});


// ページロード時に実行
setInitialWeight();