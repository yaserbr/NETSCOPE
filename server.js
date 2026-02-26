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
    const { ping, download, upload, connection } = req.body;
    if (!ping || !download || !upload) {
      return res.status(400).json({
        error: "بيانات ناقصة",
      });
    }

    const prompt = `
نتائج فحص الشبكة:

نوع الاتصال: ${connection || "غير محدد"}
Ping: ${ping} ms
Download: ${download} Mbps
Upload: ${upload} Mbps

قم بتحليل الأداء بشكل نسبي.

قيّم كل من:
- زمن الاستجابة (Ping)
- سرعة التحميل
- سرعة الرفع

بناءً على المستوى العام (ممتاز - جيد - متوسط - ضعيف)
مع مراعاة نوع الاتصال.

حدد المشكلة الرئيسية إن وجدت يعني لو كان فيه مشكلة أو تأخير ، ثم حدد الموقع المحتمل للمشكلة
(مزود الخدمة - السيرفر - المودم - الواي فاي - المسافة عن الراوتر - ضغط الشبكة - البرج - لا توجد مشكلة)

اكتب الرد بهذا التنسيق فقط:

التقييم العام: (ممتاز / جيد / متوسط / ضعيف)

المشكلة الرئيسية: (Ping / Download / Upload / لا توجد مشكلة)

الموقع المحتمل: (اسم واضح واحد)

الأسباب المحتملة:
- سبب مختصر
- سبب مختصر
- سبب مختصر

الحلول المقترحة:
- حل عملي
- حل عملي
- حل عملي

الشروط:
- لا تستخدم حدود رقمية ثابتة
- لا تكتب شرح إضافي
- كل نقطة سطر واحد فقط
- لغة بسيطة مباشرة
- لو ماكان فيه مشكلة واضحة ، حدد "لا توجد مشكلة" وركز على تحسين الأداء بشكل عام
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