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

نوع الاتصال: ${connection}
Ping: ${Number(ping).toFixed(1)} ms
Jitter: ${Number(jitter).toFixed(1)} ms
Download: ${Number(download).toFixed(1)} Mbps
Upload: ${Number(upload).toFixed(1)} Mbps

قم بتحليل احترافي دقيق ومتوازن.

مهم جدًا:
- قارن المؤشرات ببعضها قبل تحديد المشكلة الرئيسية.
- لا تعتبر أي قيمة مشكلة إذا كانت ضمن النطاق الطبيعي.
- لا تستخدم مصطلحات تقنية معقدة مثل Jitter في النتيجة.
- استخدم وصفًا مفهومًا للمستخدم العادي.

تفسير المؤشرات:
- Ping المرتفع = تأخير في الاستجابة.
- Jitter المرتفع = تذبذب أو عدم استقرار في الاتصال.
- السرعات المنخفضة = ضعف في الأداء.
- السرعة العالية مع تذبذب = شبكة سريعة لكن غير مستقرة.

تفسير حسب نوع الاتصال:

إذا WiFi:
- ركز على التداخل أو المسافة أو ضغط الشبكة الداخلية.

إذا Ethernet:
- استبعد مشاكل الإشارة.
- ركز على مزود الخدمة أو السيرفر عند وجود تأخير.

إذا Cellular:
- ركز على ازدحام البرج أو ضعف التغطية أو تغير الإشارة.

اكتب النتيجة بهذا التنسيق فقط:

التقييم العام: (ممتاز / جيد / متوسط / ضعيف)

المشكلة الرئيسية: (تأخير مرتفع / تذبذب في الشبكة / ضعف سرعة التحميل / ضعف سرعة الرفع / لا توجد مشكلة واضحة)

الموقع المحتمل: (واحد فقط من:
مزود الخدمة - السيرفر - المودم - الواي فاي - المسافة عن الراوتر - ضغط الشبكة - البرج - لا توجد مشكلة)

الأسباب المحتملة:
- سبب مختصر مباشر
- سبب مختصر مباشر
- سبب مختصر مباشر

الحلول المقترحة:
- حل عملي واضح
- حل عملي واضح
- حل عملي واضح

الشروط:
- لا تكتب شرح إضافي
- لا تبالغ في التشخيص
- كل نقطة سطر واحد فقط
- استخدم لغة عربية بسيطة وواضحة
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