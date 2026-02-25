document.addEventListener("DOMContentLoaded", () => {
  console.log("MAIN.JS VERSION 2026-02-25 (AI MODE)");

  // ================= CONFIG =================

  const maxSpeed = 1000;

  let lastPing = 0;
  let lastDown = 0;
  let lastUp = 0;

  // ================= STATUS =================

  function showStatus(msg) {
    const el = document.getElementById("statusText");
    if (el) el.textContent = msg;
  }

  // ================= GAUGE =================

  function updateGauge(speed) {
    if (!speed || speed < 0) speed = 0;
    if (speed > maxSpeed) speed = maxSpeed;

    const percent = speed / maxSpeed;
    const dashOffset = 330 * (1 - percent);

    const gauge = document.getElementById("gaugeProgress");
    const gaugeText = document.getElementById("gaugeText");

    if (!gauge || !gaugeText) return;

    gauge.style.strokeDashoffset = dashOffset;
    gaugeText.textContent = speed.toFixed(1);

    if (speed < 50) gauge.style.stroke = "#f44336";
    else if (speed < 150) gauge.style.stroke = "#ff9800";
    else gauge.style.stroke = "#4caf50";
  }

  // ================= AI =================

  async function requestAIAnalysis(ping, down, up) {
    showStatus("Analyzing with AI... 🤖");

    try {
      const res = await fetch("/api/analyze-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ping,
          download: down,
          upload: up,
        }),
      });

      const data = await res.json();

      showAIResult(data.analysis);

      showStatus("Analysis completed ✅");

    } catch (err) {
      console.error("AI Error:", err);

      showStatus("AI analysis failed ❌");
    }
  }

  function showAIResult(text) {
    const box = document.getElementById("resultBox");
    const output = document.getElementById("aiResult");

    if (output) output.textContent = text;

    if (box) box.classList.remove("d-none");
  }

  // ================= RESULTS =================

  function showResults(ping, down, up) {

    function safeSet(id, value) {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    }

    safeSet("pingValue", ping.toFixed(0));
    safeSet("downloadValue", down.toFixed(1));
    safeSet("uploadValue", up.toFixed(1));

    safeSet("peak", down.toFixed(1));
    safeSet("final", down.toFixed(1));
  }

  // ================= SPEED TEST =================

  async function startSpeedTest() {

    showStatus("Testing... ⏳");

    try {

      // -------- Ping --------

      const pingStart = performance.now();

      await fetch("https://speed.cloudflare.com/cdn-cgi/trace", {
        cache: "no-store",
      });

      const ping = performance.now() - pingStart;

      lastPing = ping;


      // -------- Download --------

      const downStart = performance.now();

      const res = await fetch(
        "https://speed.cloudflare.com/__down?bytes=20000000&nocache=" +
        Date.now()
      );

      const reader = res.body.getReader();

      let total = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
      }

      const downTime = (performance.now() - downStart) / 1000;

      const downMbps = (total * 8) / downTime / 1e6;

      lastDown = downMbps;

      updateGauge(downMbps);


      // -------- Upload --------

      const size = 10 * 1024 * 1024;

      const buffer = new Uint8Array(size);

      const upStart = performance.now();

      await fetch("https://speed.cloudflare.com/__up", {
        method: "POST",
        body: buffer,
      });

      const upTime = (performance.now() - upStart) / 1000;

      const upMbps = (size * 8) / upTime / 1e6;

      lastUp = upMbps;


      // -------- Finish --------

      showResults(lastPing, lastDown, lastUp);

      await requestAIAnalysis(
        lastPing,
        lastDown,
        lastUp
      );

    } catch (err) {

      console.error("Speed Test Error:", err);

      showStatus("Test failed ❌");
    }
  }

  window.startSpeedTest = startSpeedTest;
});