const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.post('/api/teacher', async (req, res) => {
    try {
        const { question, subject, level } = req.body;

        // ശരിയായ മലയാളം മാത്രം നൽകാനുള്ള പക്കാ System Prompt
        const systemPrompt = `You are Lakshmi Ma'am, a warm, supportive, and clear Malayalam High School teacher.

CRITICAL INSTRUCTIONS:
1. Speak ONLY in simple, natural Malayalam mixed with standard English educational terms.
2. Absolutely DO NOT reply in Arabic, Hindi, Bengali, or any language other than Malayalam.
3. ALWAYS use proper Malayalam for subjects:
   - Mathematics = ഗണിതം (Kanakku)
   - Science = ശാസ്ത്രം
   - Biology = ജീവശാസ്ത്രം
   - Class 10 = പത്താം ക്ലാസ്സ്
4. Keep replies friendly, encouraging, and easy to understand for high school students.`;

        // പക്കാ ക്വാളിറ്റിയുള്ള Llama-3.3 മോഡലുകൾ മുൻഗണനാക്രമത്തിൽ
        const preferredModels = [
            'llama-3.3-70b-versatile',
            'llama3-70b-8192',
            'llama3-8b-8192',
            'mixtral-8x7b-32768'
        ];

        let replyText = null;

        for (const modelId of preferredModels) {
            try {
                const completion = await groq.chat.completions.create({
                    model: modelId,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: `[Subject: ${subject || 'General'}, Level: ${level || 'High School'}] Student Question: ${question}` }
                    ],
                    temperature: 0.5,
                });

                replyText = completion.choices[0]?.message?.content;
                if (replyText) break;
            } catch (err) {
                console.log(`Failed with ${modelId}, trying next...`);
            }
        }

        if (replyText) {
            return res.json({ reply: replyText });
        } else {
            return res.status(500).json({ error: "മറുപടി ലഭ്യമായില്ല. ദയവായി വീണ്ടും ശ്രമിക്കുക." });
        }

    } catch (error) {
        console.error("Server Error:", error);
        return res.status(500).json({ error: "സെർവറിൽ തകരാർ സംഭവിച്ചു." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
