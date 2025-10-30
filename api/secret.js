// api/search-calorie.js

import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI(GEMINI_API_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { foodName } = req.body;

    if (!foodName) {
        return res.status(400).json({ error: '食事名が指定されていません。' });
    }

    try {
        const prompt = `
            ユーザーが入力した食事名: ${foodName}
            
            この食事の一般的なカロリー情報とPFC（タンパク質、脂質、炭水化物）を、
            以下のJSON形式のみで回答してください。
            回答にはJSON以外の余計なテキストを一切含めないでください。

            {
              "calories": (カロリー, kcal),
              "protein": (タンパク質, g),
              "fat": (脂質, g),
              "carb": (炭水化物, g)
            }
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        const text = response.text.trim();
        
        let calorieData;
        try {
            calorieData = JSON.parse(text);
        } catch (e) {
            console.error("AIが有効なJSONを返しませんでした:", text);
            return res.status(500).json({ error: 'AIがカロリー情報を解析できませんでした。' });
        }

        res.status(200).json({ 
            status: 'success', 
            data: calorieData 
        });

    } catch (error) {
        console.error('Gemini API 呼び出しエラー:', error);
        res.status(500).json({ error: 'Gemini API の呼び出し中にエラーが発生しました。' });
    }
}