document.addEventListener("DOMContentLoaded", () => {

  const gaugeBox = document.getElementById("gaugeBox");
  const gaugeText = document.getElementById("gaugeText");
  const gaugeCircle = document.getElementById("gaugeProgress");

  let testCount = 0;

  function enableIdleAnimation() {
    gaugeBox.classList.add("idle");
    gaugeText.textContent = "READY";
    gaugeText.classList.add("idle-text");
  }

  function disableIdleAnimation() {
    gaugeBox.classList.remove("idle");
    gaugeText.classList.remove("idle-text");
    gaugeText.textContent = "0";
  }

  async function restartAnimation() {
    return new Promise(resolve => {

      gaugeCircle.style.transition = "none";

      gaugeBox.classList.add("restarting");
      gaugeText.textContent = "Recalibrating...";
      gaugeText.classList.add("restart-text");

      setTimeout(() => {
        gaugeBox.classList.remove("restarting");
        gaugeText.classList.remove("restart-text");
        gaugeText.textContent = "0";
        gaugeCircle.style.transition = "stroke-dashoffset 0.15s linear";
        resolve();
      }, 1200);
    });
  }

  enableIdleAnimation();

  const maxSpeed = 1000;

  let lastPing = 0;
  let lastDown = 0;
  let lastUp = 0;
  let latencyUnderLoad = 0;

  function showStatus(msg) {
    const el = document.getElementById("statusText");
    if (el) el.textContent = msg;
  }

  function updateGauge(speed) {
    if (!speed || speed < 0) speed = 0;
    if (speed > maxSpeed) speed = maxSpeed;

    const circumference = 534;
    const percent = speed / maxSpeed;
    const dashOffset = circumference * (1 - percent);

    gaugeCircle.style.strokeDashoffset = dashOffset;
    gaugeText.textContent = speed.toFixed(1);

    const hue = Math.min(120, percent * 120);
    gaugeCircle.style.stroke = `hsl(${hue},100%,50%)`;
  }
  function resetGaugeSmooth() {
    let current = parseFloat(gaugeText.textContent) || 0;

    const interval = setInterval(() => {
      current -= current * 0.08; // نزول تدريجي ناعم

      if (current <= 0.5) {
        current = 0;
        clearInterval(interval);
      }

      updateGauge(current);
    }, 30);
  }
  async function getPublicIP() {
    const res = await fetch(
      "https://speed.cloudflare.com/cdn-cgi/trace?nocache=" + Date.now(),
      { cache: "no-store" }
    );
    const text = await res.text();
    const ipLine = text.split("\n").find(line => line.startsWith("ip="));
    return ipLine ? ipLine.split("=")[1] : null;
  }

  async function fetchISPFromServer(ip) {
    try {
      const res = await fetch("/api/isp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip })
      });
      return await res.json();
    } catch (err) {
      console.error("ISP fetch error:", err);
      return null;
    }
  }

  function showISPInfo(data) {
    const el = document.getElementById("ispInfo");
    if (!el) return;

    if (!data || !data.isp) {
      el.textContent = "Unable to detect ISP";
      return;
    }

    el.textContent =
      `| ${data.isp} | ${data.city || "-"}, ${data.country || "-"} |`;
  }

  async function loadISPOnPageLoad() {
    try {
      const ip = await getPublicIP();
      if (!ip) throw new Error("No IP");

      const ispData = await fetchISPFromServer(ip);
      showISPInfo(ispData);
    } catch (err) {
      console.error("ISP load error:", err);
      showISPInfo(null);
    }
  }

  loadISPOnPageLoad();

  async function requestAIAnalysis(ping, down, up, jitter, latencyUnderLoad) {
    const selectedRadio = document.querySelector(
      'input[name="connection"]:checked'
    );

    const connectionType = selectedRadio
      ? selectedRadio.value
      : "wifi";

    const payload = {
      ping,
      jitter,
      download: down,
      upload: up,
      latencyUnderLoad,
      connection: connectionType,
    };

    showStatus("Analyzing with AI... 🤖");

    const res = await fetch("/api/analyze-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    showAIResult(data.analysis);
    showStatus("AI Analysis Complete ✅");
  }

  function showAIResult(text) {
    const box = document.getElementById("resultBox");
    const output = document.getElementById("aiResult");

    if (output) output.textContent = text;
    if (box) box.classList.remove("d-none");
  }

  function showResults(ping, down, up) {
    document.getElementById("pingValue").textContent = ping.toFixed(0);
    document.getElementById("downloadValue").textContent = down.toFixed(1);
    document.getElementById("uploadValue").textContent = up.toFixed(1);
  }

  async function measurePingAndJitter() {
    const samples = [];

    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      await fetch(
        "https://speed.cloudflare.com/cdn-cgi/trace?nocache=" + Date.now(),
        { cache: "no-store" }
      );
      const end = performance.now();
      samples.push(end - start);
    }

    const avgPing =
      samples.reduce((a, b) => a + b, 0) / samples.length;

    const jitter =
      Math.max(...samples) - Math.min(...samples);

    return { ping: avgPing, jitter };
  }

  async function startSpeedTest() {

    if (testCount === 0) {
      disableIdleAnimation();
    } else {
      await restartAnimation();
    }

    testCount++;

    showStatus("Testing... ⏳");

    try {

      const pingData = await measurePingAndJitter();
      lastPing = pingData.ping;
      const jitter = pingData.jitter;

      const downStart = performance.now();
      const res = await fetch(
        "https://speed.cloudflare.com/__down?bytes=500000000&nocache=" +
        Date.now()
      );

      const reader = res.body.getReader();
      let total = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        total += value.length;

        const elapsed = (performance.now() - downStart) / 1000;
        const liveMbps = (total * 8) / elapsed / 1e6;

        updateGauge(liveMbps);
      }

      const downTime = (performance.now() - downStart) / 1000;
      const downMbps = (total * 8) / downTime / 1e6;

      lastDown = downMbps;
      updateGauge(downMbps);

      const size = 25 * 1024 * 1024;
      const buffer = new Uint8Array(size);

      const upStart = performance.now();

      await fetch("https://speed.cloudflare.com/__up", {
        method: "POST",
        body: buffer,
      });

      const upTime = (performance.now() - upStart) / 1000;
      const upMbps = (size * 8) / upTime / 1e6;

      lastUp = upMbps;

      showResults(lastPing, lastDown, lastUp);

      await requestAIAnalysis(
        lastPing,
        lastDown,
        lastUp,
        jitter,
        latencyUnderLoad
      );

      showStatus("Test Complete ✅");

      // بعد 2 ثانية يرجع العداد للصفر
      setTimeout(() => {
        resetGaugeSmooth();
      }, 500);
    } catch (err) {
      console.error("Speed Test Error:", err);
      showStatus("Test failed ❌");
    }
  }

  window.startSpeedTest = startSpeedTest;
});