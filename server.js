require("dotenv").config();

const app = require("./app");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/api/analyze-ai", async (req, res) => {
  try {
    const { ping, jitter, download, upload, connection } = req.body;

    // تحقق من البيانات
    if (
      ping === undefined ||
      jitter === undefined ||
      download === undefined ||
      upload === undefined
    ) {
      return res.status(400).json({
        analysis: "بيانات ناقصة",
      });
    }

    console.log("Received from client:", req.body);

    const prompt = `
نتائج فحص الشبكة:

نوع الاتصال: ${connection || "غير محدد"}
Ping: ${Number(ping).toFixed(1)} ms
Jitter: ${Number(jitter).toFixed(1)} ms
Download: ${Number(download).toFixed(1)} Mbps
Upload: ${Number(upload).toFixed(1)} Mbps

قم بتحليل الأداء بشكل احترافي ومتوازن.

قواعد تقييم تقريبية:

- Ping أقل من 40 ms ممتاز، 40-80 جيد، 80-120 متوسط، أعلى من ذلك مرتفع.
- Jitter أقل من 10 ms مستقر، 10-25 مقبول، أعلى من 30 يدل على عدم استقرار.
- سرعة التحميل أقل من 12 Mbps تعتبر منخفضة للاستخدام الحديث.
- سرعة الرفع أقل من 5 Mbps تعتبر ضعيفة.

مهم جدًا:
- لا تعتبر أي قيمة مشكلة إذا كانت ضمن النطاق الطبيعي.
- لا تبحث عن مشكلة إذا كانت المؤشرات جيدة.
- المشكلة الرئيسية يجب أن تكون المؤشر الأسوأ فعليًا.
- إذا كانت جميع القيم جيدة اكتب "لا توجد مشكلة واضحة".

استخدم نوع الاتصال لتحديد الموقع المحتمل:
- WiFi → راوتر / تداخل / مسافة.
- Ethernet → مزود الخدمة أو السيرفر.
- Cellular → البرج / التغطية / ازدحام الشبكة.

اكتب الرد بهذا التنسيق فقط:

التقييم العام: (ممتاز / جيد جدا / متوسط / ضعيف)

المشكلة الرئيسية: (Ping / Download / Upload / لا توجد مشكلة)

الموقع المحتمل: (اسم واحد فقط أو لا يوجد)

الأسباب المحتملة:
- سبب مختصر
- سبب مختصر
- سبب مختصر

الحلول المقترحة:
- حل عملي واضح
- حل عملي واضح
- حل عملي واضح

الشروط:
- لا تكتب شرح إضافي
- لا تبالغ في التشخيص
- كل سطر مختصر وواضح
ضع في عين الاعتبار أن المستخدم قد لا يكون خبيرًا، لذا اجعل التوصيات بسيطة وسهلة الفهم.
- استخدم لغة عربية مباشرة
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 180,
    });

    const result = completion.choices[0].message.content;

    res.json({ analysis: result });

  } catch (err) {
    console.error("AI Error:", err);

    if (err.code === "insufficient_quota") {
      return res.json({
        analysis:
          "⚠️ خدمة الذكاء الاصطناعي غير متاحة حاليًا بسبب انتهاء الرصيد.",
      });
    }

    res.status(500).json({
      analysis: "حدث خطأ أثناء التحليل.",
    });
  }
});

app.use((req, res, next) => {
  res.set("Connection", "keep-alive");
  next();
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});