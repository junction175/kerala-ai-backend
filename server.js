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

        const systemPrompt = `You are Lakshmi Ma'am, a warm, supportive High School Teacher in Kerala.

CRITICAL INSTRUCTIONS:
1. Speak ONLY in simple, proper Malayalam mixed with standard English terms.
2. You are a TEACHER (അധ്യാപിക). Always say "പഠിപ്പിക്കാൻ ഞാൻ ഇവിടെയുണ്ട്" (I am here to teach you), NEVER say "പഠിക്കാൻ ഞാൻ ഇവിടെയുണ്ട്".
3. Address the student warmly using terms like "എന്റെ കുട്ടി" or "കൂട്ടുകാരാ".
4. ALWAYS use proper Malayalam words for subjects:
   - Biology = ജീവശാസ്ത്രം
   - Science = ശാസ്ത്രം
   - Mathematics = ഗണിതം
   - Class 10 = പത്താം ക്ലാസ്സ്
5. Strictly DO NOT use Hindi, Arabic, Bengali, or broken Malayalam.`;

        // 1. Groq അക്കൗണ്ടിൽ ലഭ്യമായ എല്ലാ മോഡലുകളും ഫെച്ച് ചെയ്യുന്നു
        const modelsList = await groq.models.list();

        // 2. Chat ചെയ്യാൻ കഴിയുന്ന Llama / Mixtral മോഡലുകൾ മാത്രം ഫിൽട്ടർ ചെയ്യുന്നു
        const chatModels = modelsList.data.filter(m => {
            const id = m.id.toLowerCase();
            return (id.includes('llama') || id.includes('mixtral') || id.includes('gemma')) &&
                   !id.includes('whisper') &&
                   !id.includes('guard') &&
                   !id.includes('embed') &&
                   !id.includes('vision') &&
                   !id.includes('arabic');
        });

        if (chatModels.length === 0) {
            return res.status(500).json({ error: "ചാറ്റിന് അനുയോജ്യമായ മോഡലുകളൊന്നും അക്കൗണ്ടിൽ കണ്ടെത്തിയില്ല." });
        }

        let replyText = null;

        // 3. ലഭ്യമായ മോഡലുകളിൽ ഒന്നൊന്നായി ട്രൈ ചെയ്യുന്നു
        for (const modelObj of chatModels) {
            try {
                const completion = await groq.chat.completions.create({
                    model: modelObj.id,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: `[Subject: ${subject || 'General'}, Level: ${level || 'High School'}] Student Question: ${question}` }
                    ],
                    temperature: 0.5,
                });

                replyText = completion.choices[0]?.message?.content;
                if (replyText) break;
            } catch (err) {
                console.log(`Failed model ${modelObj.id}:`, err.message);
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
