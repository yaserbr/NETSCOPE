require("dotenv").config(); // لازم أول شيء

const app = require("./app");
const OpenAI = require("openai");

// تهيئة OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// AI Analyze Route
app.post("/api/analyze-ai", async (req, res) => {
  try {
    const { ping, download, upload } = req.body;

    if (!ping || !download || !upload) {
      return res.status(400).json({
        error: "بيانات ناقصة",
      });
    }

    const prompt = `
نتائج فحص الشبكة:

Ping: ${ping} ms
Download: ${download} Mbps
Upload: ${upload} Mbps

حلل البيانات وحدد مكان المشكلة بدقة إن أمكن:
(مزود الخدمة - السيرفر - المودم - الواي فاي - المسافة عن الراوتر - ضغط الشبكة - البرج - لا توجد مشكلة)

المطلوب تنسيق الرد بهذا الشكل فقط:

المشكلة الرئيسية: (اسم مختصر جدًاعن المشكلة donload - upload - ping - لا توجد مشكلة)

الأسباب المحتملة:
- سبب 1 (سطر واحد فقط)
- سبب 2 (سطر واحد فقط إذا وجد)
- سبب 3 (سطر واحد فقط إذا وجد)

الحلول المقترحة:
- حل 1 (سطر واحد)
- حل 2 (سطر واحد)
- حل 3 (سطر واحد)

الشروط:
- لا تكتب شرح إضافي
- لا تكتب فقرات طويلة
- لا تحط هاش او رموز غريبة
- كل نقطة لا تتجاوز سطر واحد
- اكتب بالعربي المبسط
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: prompt },
      ],
      max_tokens: 200,
    });

    const result =
      completion.choices[0].message.content;

    res.json({ analysis: result });

  } catch (err) {
    console.error("AI Error:", err);

    if (err.code === "insufficient_quota") {
      return res.json({
        analysis:
          "⚠️ خدمة الذكاء الاصطناعي غير متاحة حاليًا بسبب انتهاء الرصيد. حاول لاحقًا.",
      });
    }

    res.status(500).json({
      analysis: "حدث خطأ أثناء التحليل.",
    });
  }
});

// Keep Alive
app.use((req, res, next) => {
  res.set("Connection", "keep-alive");
  next();
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});