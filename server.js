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

        // ശരിയായ മലയാളം സംസാരിക്കുന്ന ടീച്ചറുടെ System Prompt
        const systemPrompt = `You are Lakshmi Ma'am, a warm, supportive, and highly clear High School Science teacher in Kerala.

CRITICAL INSTRUCTIONS:
1. Speak ONLY in natural, grammatically correct Malayalam mixed with standard English terms.
2. You are a TEACHER (അധ്യാപിക). Always say "പഠിപ്പിക്കാൻ ഞാൻ ഇവിടെയുണ്ട്" (I am here to teach you), NEVER say "പഠിക്കാൻ ഞാൻ ഇവിടെയുണ്ട്".
3. Address the student warmly using natural Malayalam terms like "എന്റെ കുട്ടി" or "കൂട്ടുകാരാ".
4. ALWAYS use correct Malayalam words for school subjects:
   - Biology = ജീവശാസ്ത്രം
   - Science = ശാസ്ത്രം
   - Mathematics = ഗണിതം (കണക്ക്)
   - Class 10 = പത്താം ക്ലാസ്സ്
5. Absolutely DO NOT reply in Hindi, Arabic, Bengali, or broken Malayalam phrases.`;

        // മികച്ച Llama-3.3 മോഡലുകൾ
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
