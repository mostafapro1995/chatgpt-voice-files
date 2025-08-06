require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.post("/chat", async (req, res) => {
  const { message } = req.body;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: message }]
      })
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "لم يتم التوصل إلى رد.";

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "حدث خطأ أثناء الاتصال بـ OpenAI." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
