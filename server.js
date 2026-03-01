require("dotenv").config();

const app = require("./app");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/api/analyze-ai", async (req, res) => {
  try {
    const { ping, jitter, download, upload, latencyUnderLoad, connection } = req.body;

    // تحقق من البيانات
    if (
      ping === undefined ||
      jitter === undefined ||
      download === undefined ||
      upload === undefined ||
      latencyUnderLoad === undefined ||
      !connection
    ) {
      return res.status(400).json({
        analysis: "بيانات ناقصة",
      });
    }

    console.log("Received from client:", req.body);

    const prompt = `نتائج فحص الشبكة:

نوع الاتصال: ${connection}
Ping: ${Number(ping).toFixed(1)} ms
Jitter: ${Number(jitter).toFixed(1)} ms
Download: ${Number(download).toFixed(1)} Mbps
Upload: ${Number(upload).toFixed(1)} Mbps
Latency Under Load: ${Number(latencyUnderLoad).toFixed(1)} ms

قم بتحليل احترافي دقيق ومتوازن.

مهم جدًا:
- قارن جميع المؤشرات ببعضها قبل تحديد المشكلة الرئيسية.
- لا تعتبر أي قيمة مشكلة إذا كانت ضمن النطاق الطبيعي.
- إذا كان Latency Under Load أعلى من Ping الطبيعي بأكثر من 70ms فهناك ضغط داخلي محتمل.
- إذا كانت السرعة عالية لكن يوجد تذبذب أو فرق كبير تحت الضغط فالشبكة غير مستقرة.
- لا تستخدم مصطلحات تقنية معقدة في النتيجة.
- استخدم وصفًا مفهومًا للمستخدم العادي.

خذ بعين الاعتبار نوع الاتصال:

إذا WiFi:
- ركز على التداخل أو المسافة أو ضغط الشبكة الداخلية.

إذا Ethernet:
- استبعد مشاكل الإشارة.
- ركز على مزود الخدمة أو السيرفر عند وجود تأخير.

إذا Cellular:
- ركز على ازدحام البرج أو ضعف التغطية أو تغير الإشارة.

اكتب النتيجة بهذا التنسيق فقط:

التقييم العام: (ممتاز / جيد جدا / متوسط / ضعيف)
لو الشبكة ضعيفة، حدد المشكلة الرئيسية والموقع المحتمل والأسباب والحلول بشكل مختصر وواضح.
ولو الشبكة جيدة، اذكر أن كل شيء طبيعي ولا توجد مشكلة واضحة.

المشكلة الرئيسية: (تأخير مرتفع / تذبذب في الشبكة / ضغط داخلي على الشبكة / ضعف سرعة التحميل / ضعف سرعة الرفع / لا توجد مشكلة واضحة)

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
- كل سطر قصير وواضح
- لغة عربية بسيطة مباشرة`;

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



app.post("/api/isp", async (req, res) => {
  try {
    const { ip } = req.body;

    if (!ip) {
      return res.json({ error: "No IP provided" });
    }

    const response = await fetch(`https://ipinfo.io/${ip}/json`);
    const data = await response.json();

    // ===== ISP Name Normalization =====
    function normalizeISPName(name) {
      if (!name) return null;

      const lower = name.toLowerCase();

      if (lower.includes("saudi telecom") || lower.includes("stc"))
        return "STC";

      if (lower.includes("mobily") || lower.includes("etihad"))
        return "Mobily";

      if (lower.includes("zain"))
        return "Zain";

      if (lower.includes("salem") || lower.includes("solutions"))
        return "STC Solutions";

      return name; // fallback لو شركة غير معروفة
    }

    const cleanName = normalizeISPName(data.org);

    res.json({
      ip: data.ip,
      isp: cleanName,
      city: data.city,
      country: data.country
    });;

  } catch (err) {
    console.error("ISP Lookup Error:", err);
    res.status(500).json({ error: "ISP lookup failed" });
  }
});



const PORT = 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});