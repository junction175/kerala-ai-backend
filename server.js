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

        // 1. Groq മോഡലുകൾ ഫെച്ച് ചെയ്യുന്നു
        const modelsList = await groq.models.list();

        // 2. Chat സപ്പോർട്ട് ചെയ്യാത്ത മോഡലുകളെ മാറ്റിനിർത്തുന്നു
        const chatModels = modelsList.data.filter(m => {
            const id = m.id.toLowerCase();
            return !id.includes('whisper') &&
                   !id.includes('guard') &&
                   !id.includes('embed') &&
                   !id.includes('vision');
        });

        if (chatModels.length === 0) {
            return res.status(500).json({ error: "ചാറ്റിന് അനുയോജ്യമായ മോഡലുകളൊന്നും അക്കൗണ്ടിൽ കണ്ടെത്തിയില്ല." });
        }

        // 3. ശരിയായ മലയാളം നൽകാൻ സുദൃഢമായ System Prompt
        const systemPrompt = `You are Lakshmi Ma'am, a warm, supportive, and highly clear Malayalam High School Science teacher.

STRICT LANGUAGE RULES:
1. Speak natural, proper Malayalam mixed with standard English educational terms.
2. ALWAYS use pure Malayalam words for subjects and terms:
   - Biology = ജീവശാസ്ത്രം (Do NOT use Bainya or other languages)
   - Class 10 = പത്താം ക്ലാസ്സ്
   - Life Processes = ജീവൽപ്രക്രിയകൾ (Life Processes)
   - Control and Coordination = നിയന്ത്രണവും ഏകോപനവും
   - Heredity and Evolution = പാരമ്പര്യവും പരിണാമവും
3. Avoid Hindi/Bengali transliterations or strange broken phrases like "Om Namaskar", "Bainya", or "Jiwananm".
4. Address the student in a friendly, respectful teacher tone using natural Malayalam.`;

        let replyText = null;
        let lastError = null;

        // 4. മോഡലുകൾ ട്രൈ ചെയ്യുന്നു
        for (const modelObj of chatModels) {
            try {
                const completion = await groq.chat.completions.create({
                    model: modelObj.id,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: `[Subject: ${subject || 'General'}, Level: ${level || 'High School'}] User Question: ${question}` }
                    ],
                    temperature: 0.6,
                });

                replyText = completion.choices[0]?.message?.content;
                if (replyText) break; 
            } catch (err) {
                lastError = err;
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
