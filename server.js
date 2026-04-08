require("dotenv").config();

const app = require("./app");
const OpenAI = require("openai");
const rateLimit = require("express-rate-limit");

const APP_KEY = process.env.APP_KEY;

if (!APP_KEY) {
  throw new Error("APP_KEY is not set. Please configure environment variables.");
}

// ================= RATE LIMITER =================

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    error: "Too many requests, please try again later."
  }
});

app.use("/api", limiter);

// ================= AUTH MIDDLEWARE =================

app.use((req, res, next) => {
  const key = req.headers["x-app-key"];

  if (key !== undefined) {
    if (key !== APP_KEY) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    return next();
  }

  return next();
});

const ispContacts = {
  "STC": "900",
  "Mobily": "1100",
  "Zain": "959",
  "STC Solutions": "920014400"
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/api/analyze-ai", async (req, res) => {
  try {

const { ping, jitter, download, upload, latencyUnderLoad, connection, isp, towerDistance, wifiNetworks, connectedDevices, signalStrength } = req.body;

    const safeWifiNetworks = wifiNetworks ?? null;
    const safeDevices = connectedDevices ?? null;
    const safeSignal = signalStrength ?? null;
    const safeTowerDistance = towerDistance ?? 0;
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

    // ================= CALCULATIONS =================

    const latencyDifference = Number(latencyUnderLoad) - Number(ping);

    const latencyRatio =
      Number(ping) > 0 ? Number(latencyUnderLoad) / Number(ping) : 0;

    const stabilityIndex =
      Number(download) / (Number(jitter) + 1);

    const congestionScore =
      Number(ping) > 0 ? latencyDifference / Number(ping) : 0;

    // ================= BUFFERBLOAT =================

    let bufferbloatGrade;

    if (latencyDifference <= 5) bufferbloatGrade = "A";
    else if (latencyDifference <= 20) bufferbloatGrade = "B";
    else if (latencyDifference <= 50) bufferbloatGrade = "C";
    else bufferbloatGrade = "D";

    // ================= DEBUG LOG =================

    const aiVariables = {
      connection,
      ping,
      jitter,
      download,
      upload,
      latencyUnderLoad,
      latencyDifference,
      latencyRatio,
      stabilityIndex,
      congestionScore,
      bufferbloatGrade
    };

    console.log("\n===== NETSCOPE AI INPUT =====");
    console.table(aiVariables);

    // ================= AI PROMPT =================

    const prompt = `نتائج فحص الشبكة:

نوع الاتصال: ${connection}
Ping: ${Number(ping).toFixed(1)} ms
Jitter: ${Number(jitter).toFixed(1)} ms
Download: ${Number(download).toFixed(1)} Mbps
Upload: ${Number(upload).toFixed(1)} Mbps
Latency Under Load: ${Number(latencyUnderLoad).toFixed(1)} ms
Bufferbloat Grade: ${bufferbloatGrade}
Latency Increase: ${latencyDifference.toFixed(1)} ms
Latency Ratio: ${latencyRatio.toFixed(2)}
Network Stability: ${stabilityIndex.toFixed(2)}
Congestion Score: ${congestionScore.toFixed(2)}
المسافة التقريبية بين المستخدم والبرج: ${safeTowerDistance ? Number(safeTowerDistance).toFixed(2) : "غير متوفر"} km

عدد شبكات الواي فاي القريبة: ${safeWifiNetworks ?? "غير متوفر"}
عدد الأجهزة المتصلة: ${safeDevices ?? "غير متوفر"}
قوة الإشارة: ${safeSignal ?? "غير متوفر"}


مهم جداً:
قم بتحليل واقعي كأنك مهندس شبكات.
لا تذكر الأرقام كـ مشكلة (مثل: "Ping مرتفع").
اشرح السبب الحقيقي وراء المشكلة (مثل: ضغط مستخدمين، تداخل، بعد، ضعف تغطية).


قواعد تحليل ذكية:

1️⃣ إذا كان الاتصال  WiFi:
- إذا قوة الإشارة أقل من 50% → ركز على بعد المستخدم أو وجود جدران/عوائق
- إذا عدد الشبكات أكبر من 15 → ركز على التداخل بين الشبكات
- إذا عدد الأجهزة أكبر من 8 → ركز على ضغط الشبكة الداخلية
- لا تذكر مزود الخدمة إلا إذا الأدلة واضحة

2️⃣ إذا كان الاتصال Ethernet:
- تجاهل مشاكل التداخل والإشارة نهائياً
- ركز على مزود الخدمة أو السيرفر أو الضغط الخارجي فقط

3️⃣ إذا كان الاتصال Cellular:
- إذا المسافة عن البرج أكبر من 1 كم → ركز على بعد البرج وضعف التغطية
- إذا السرعة ضعيفة مع تذبذب → ركز على ازدحام البرج
- لا تذكر الواي فاي نهائياً

4️⃣ تحليل الضغط:
- إذا Latency Under Load أعلى بكثير من Ping → السبب ضغط أو Bufferbloat
- إذا Congestion Score مرتفع → السبب كثرة المستخدمين أو الأجهزة

5️⃣ تحليل التذبذب:
- إذا Jitter مرتفع → السبب عدم استقرار أو تداخل أو ضعف إشارة

6️⃣ تحليل السرعة:
- إذا السرعة منخفضة لكن Ping طبيعي → المشكلة غالباً من السيرفر أو مزود الخدمة

7️⃣ المسافة:
- إذا المسافة عن البرج أقل من 1 كم → لا تعتبرها مشكلة
- إذا أكبر من 1 كم → ممكن تكون سبب

8️⃣ أهم قاعدة:
لا تقل "المشكلة ارتفاع البنق"
قل السبب الحقيقي مثل:
- ضغط بسبب عدد الأجهزة
- تداخل شبكات
- ضعف تغطية
- ازدحام برج
- مشكلة من مزود الخدمة


تحديد موقع المشكلة (Root Cause):
اختر واحد فقط:
مزود الخدمة
السيرفر
المودم
الواي فاي
المسافة عن الراوتر
ضغط الشبكة
البرج
لا توجد مشكلة


اكتب النتيجة بهذا التنسيق فقط:


التقييم العام: (ممتاز / جيد جدا / متوسط / ضعيف)

المشكلة الرئيسية: (وصف واقعي مختصر مثل: ضغط بسبب كثرة الأجهزة أو تداخل شبكات)

الموقع المحتمل: (خيار واحد فقط)

الأسباب المحتملة:
- سبب حقيقي
- سبب حقيقي
- سبب حقيقي
- سبب حقيقي

الحلول المقترحة:
- حل عملي مباشر
- حل عملي مباشر
- حل عملي مباشر
- حل عملي مباشر


الشروط:

- لا تذكر الأرقام كمشكلة مباشرة
- اربط كل مشكلة بسبب منطقي واقعي
- لا تستخدم مصطلحات معقدة
- كل سطر قصير وواضح
- لا تكتب أي شيء خارج التنسيق
`;

    // ================= OPENAI =================

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 180,
    });

    const result = completion.choices[0].message.content;

    // ================= ISP CONTACT =================

    let contactISP = null;

    if (isp && ispContacts[isp]) {
      contactISP = {
        name: isp,
        phone: ispContacts[isp]
      };
    }

    const responsePayload = {
      analysis: result,
      contactISP,

      metrics: {
        ping,
        jitter,
        download,
        upload,
        latencyUnderLoad,
        latencyDifference,
        latencyRatio,
        stabilityIndex,
        congestionScore,
        bufferbloatGrade,
        towerDistance,
        wifiNetworks: safeWifiNetworks,
        connectedDevices: safeDevices,
        signalStrength: safeSignal
      }
    };

    console.log("\n===== SERVER RESPONSE =====");
    console.log(responsePayload);

    res.json(responsePayload);

  } catch (err) {

    console.error("AI Error:", err);

    if (err.code === "insufficient_quota") {
      return res.json({
        analysis: "⚠️ خدمة الذكاء الاصطناعي غير متاحة حاليًا بسبب انتهاء الرصيد.",
      });
    }

    res.status(500).json({
      analysis: "حدث خطأ أثناء التحليل.",
    });
  }
});

// ================= NEAREST TOWER =================

function getDistance(lat1, lon1, lat2, lon2) {

  const R = 6371;

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

app.post("/api/nearest-tower", async (req, res) => {
  try {

    const lat = Number(req.body.lat);
    const lon = Number(req.body.lon);
    const isp = req.body.isp;

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ error: "Missing coordinates" });
    }

    const apiKey = process.env.OPENCELL_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing OpenCell API key" });
    }

    const operatorMap = {
      STC: 1,
      Mobily: 3,
      Zain: 4
    };

    const targetMNC = operatorMap[isp];

    // إنشاء BBOX حول المستخدم
    const offset = 0.005;

    const latMin = lat - offset;
    const latMax = lat + offset;
    const lonMin = lon - offset;
    const lonMax = lon + offset;

    const url = `https://opencellid.org/cell/getInArea?key=${apiKey}&BBOX=${latMin},${lonMin},${latMax},${lonMax}&format=json`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data || !Array.isArray(data.cells) || data.cells.length === 0) {
      return res.status(400).json({ error: "No towers found" });
    }

    // فلترة الأبراج حسب المشغل
    // Keep only towers with valid coordinates.
    let towers = data.cells.filter((tower) =>
      Number.isFinite(Number(tower?.lat)) &&
      Number.isFinite(Number(tower?.lon))
    );

    if (targetMNC) {
      const filtered = towers.filter((tower) => tower.mnc === targetMNC);

      console.log("Filtering towers for operator:", isp);
      console.log("Filtered towers:", filtered.length);

      if (filtered.length > 0) {
        towers = filtered;
      }
    }

    if (towers.length === 0) {
      return res.status(404).json({ error: "No valid tower coordinates found" });
    }

    let nearestTower = null;
    let minDistance = Infinity;

    towers.forEach((tower) => {
      const towerLat = Number(tower.lat);
      const towerLon = Number(tower.lon);

      const distance = getDistance(
        lat,
        lon,
        towerLat,
        towerLon
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestTower = {
          ...tower,
          lat: towerLat,
          lon: towerLon
        };
      }
    });

    if (!nearestTower || !Number.isFinite(minDistance)) {
      return res.status(404).json({ error: "Unable to find nearest tower" });
    }

    res.json({
      nearestTower,
      distance: minDistance
    });

  } catch (err) {

    console.error("Tower API Error:", err);
    res.status(500).json({ error: "Tower lookup failed" });

  }
});

// ================= ISP LOOKUP =================

app.post("/api/isp", async (req, res) => {
  try {

    const { ip } = req.body;

    if (!ip) {
      return res.status(400).json({ error: "No IP provided" });
    }

    const response = await fetch(`https://ipinfo.io/${ip}/json`);
    const data = await response.json();

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

      return name;
    }

    const cleanName = normalizeISPName(data.org);

    res.json({
      ip: data.ip,
      isp: cleanName,
      city: data.city,
      country: data.country
    });

  } catch (err) {

    console.error("ISP Lookup Error:", err);
    res.status(500).json({ error: "ISP lookup failed" });

  }
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
