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

    // 1. നിങ്ങളുടെ Groq അക്കൗണ്ടിലെ മോഡലുകൾ ഫെച്ച് ചെയ്യുന്നു
    const modelsList = await groq.models.list();
    
    // 2. Chat സപ്പോർട്ട് ചെയ്യാത്ത Whisper, Guard, Classification മോഡലുകളെ മാറ്റിനിർത്തുന്നു
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

    let replyText = null;
    let lastError = null;

    // 3. ഫിൽട്ടർ ചെയ്ത ചാറ്റ് മോഡലുകളിലേക്ക് ഒന്നൊന്നായി അയച്ചു നോക്കുന്നു
    for (const modelObj of chatModels) {
      try {
        console.log(`Trying model: ${modelObj.id}`);
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `You are Ma'am, an AI teacher teaching ${subject || 'General Studies'} for Class ${level || '+1'}. Teach step-by-step in clear Malayalam.`
            },
            {
              role: "user",
              content: question
            }
          ],
          model: modelObj.id,
        });

        replyText = completion.choices[0]?.message?.content;
        if (replyText) {
          console.log(`Success using model: ${modelObj.id}`);
          break;
        }
      } catch (err) {
        lastError = err.message;
        console.log(`Model ${modelObj.id} failed: ${err.message}`);
      }
    }

    if (replyText) {
      res.json({ reply: replyText });
    } else {
      res.status(500).json({ error: lastError || "റിക്വസ്റ്റ് പ്രോസസ്സ് ചെയ്യാൻ സാധിച്ചില്ല." });
    }

  } catch (e) {
    console.error("SERVER ERROR:", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.listen(3000, () => console.log('Kerala AI Teacher running at http://localhost:3000'));