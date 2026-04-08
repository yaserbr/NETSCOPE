document.addEventListener("DOMContentLoaded", () => {
  const notice = document.getElementById("locationNotice");
  const enableBtn = document.getElementById("enableLocationBtn");

  const setLocationNoticeVisible = (visible) => {
    if (!notice) return;
    notice.style.display = visible ? "flex" : "none";
  };

  if (!navigator.geolocation) {
    setLocationNoticeVisible(true);
  } else {
    setLocationNoticeVisible(false);
    navigator.permissions
      .query({ name: "geolocation" })
      .then((permission) => {
        if (permission.state === "granted" || permission.state === "prompt") {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setLocationNoticeVisible(false);
              detectNearestTowerGPS(position);
            },
            () => {
              setLocationNoticeVisible(true);
            }
          );
        } else {
          setLocationNoticeVisible(true);
        }
      })
      .catch(() => {
        setLocationNoticeVisible(true);
      });
  }

  enableBtn?.addEventListener("click", () => {
    if (!navigator.geolocation) {
      setLocationNoticeVisible(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationNoticeVisible(false);
        detectNearestTowerGPS(position);
      },
      () => {
        setLocationNoticeVisible(true);
      }
    );
  });

  const gaugeBox = document.getElementById("gaugeBox");
  const gaugeText = document.getElementById("gaugeText");
  const gaugeCircle = document.getElementById("gaugeProgress");
  const towerMapActions = document.getElementById("towerMapActions");
  const openTowerMapBtn = document.getElementById("openTowerMapBtn");
  const towerMapHint = document.getElementById("towerMapHint");
  const towerMapModal = document.getElementById("towerMapModal");
  const closeTowerMapBtn = document.getElementById("closeTowerMapBtn");
  const towerMapSummary = document.getElementById("towerMapSummary");
  const towerMapContainer = document.getElementById("towerMapContainer");
  const recenterTowerMapBtn = document.getElementById("recenterTowerMapBtn");
  const openExternalMapLink = document.getElementById("openExternalMapLink");

  const towerMapState = {
    map: null,
    userMarker: null,
    towerMarker: null,
    pathLine: null,
    leafletScriptPromise: null,
    leafletStyleReady: false,
  };
  let isTestRunning = false;

  function setGaugeStartState(loading) {
    isTestRunning = loading;
    if (!gaugeBox) return;
    gaugeBox.classList.toggle("testing", loading);
    gaugeBox.setAttribute("aria-disabled", loading ? "true" : "false");
  }

  function showTowerMapActions(visible) {
    if (!towerMapActions) return;
    towerMapActions.classList.toggle("d-none", !visible);
  }

  function getCurrentTowerMapData() {
    const data = window.nearestTowerData;
    if (!data) return null;

    const userLat = Number(data.user?.lat);
    const userLon = Number(data.user?.lon);
    const towerLat = Number(data.tower?.lat);
    const towerLon = Number(data.tower?.lon);

    if (
      !Number.isFinite(userLat) ||
      !Number.isFinite(userLon) ||
      !Number.isFinite(towerLat) ||
      !Number.isFinite(towerLon)
    ) {
      return null;
    }

    const distanceKm = Number(data.distanceKm);

    return {
      userLat,
      userLon,
      towerLat,
      towerLon,
      distanceKm: Number.isFinite(distanceKm) ? distanceKm : null,
    };
  }

  function setExternalMapLinkAvailability(mapData) {
    if (!openExternalMapLink) return;

    if (!mapData) {
      openExternalMapLink.href = "#";
      openExternalMapLink.classList.add("disabled-link");
      openExternalMapLink.setAttribute("aria-disabled", "true");
      return;
    }

    const origin = `${mapData.userLat},${mapData.userLon}`;
    const destination = `${mapData.towerLat},${mapData.towerLon}`;
    openExternalMapLink.href =
      `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}` +
      `&destination=${encodeURIComponent(destination)}&travelmode=driving`;
    openExternalMapLink.classList.remove("disabled-link");
    openExternalMapLink.setAttribute("aria-disabled", "false");
  }

  function updateTowerMapUI() {
    const mapData = getCurrentTowerMapData();
    const hasMapData = Boolean(mapData);

    if (openTowerMapBtn) {
      openTowerMapBtn.disabled = !hasMapData;
    }

    if (recenterTowerMapBtn) {
      recenterTowerMapBtn.disabled = !hasMapData || !towerMapState.map;
    }

    setExternalMapLinkAvailability(mapData);

    if (!hasMapData) {
      if (towerMapHint) {
        towerMapHint.textContent =
          "Location or tower data is not ready yet. Run location detection to enable the map.";
      }
      if (towerMapSummary) {
        towerMapSummary.textContent =
          "Map will be available after we detect your nearest tower.";
      }
      return;
    }

    const distanceLabel =
      mapData.distanceKm !== null ? `${mapData.distanceKm.toFixed(2)} km` : "Unavailable";

    if (towerMapHint) {
      towerMapHint.textContent = `Distance to nearest tower: ${distanceLabel}.`;
    }
    if (towerMapSummary) {
      towerMapSummary.textContent = `Nearest tower is ${distanceLabel} from your current location.`;
    }
  }

  function ensureLeafletLoaded() {
    if (window.L) {
      return Promise.resolve(window.L);
    }

    if (!towerMapState.leafletStyleReady) {
      const existingStyle = document.getElementById("leafletStylesheet");
      if (!existingStyle) {
        const link = document.createElement("link");
        link.id = "leafletStylesheet";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        link.crossOrigin = "";
        document.head.appendChild(link);
      }
      towerMapState.leafletStyleReady = true;
    }

    if (!towerMapState.leafletScriptPromise) {
      towerMapState.leafletScriptPromise = new Promise((resolve, reject) => {
        const existingScript = document.getElementById("leafletScript");
        if (existingScript) {
          existingScript.addEventListener("load", () => resolve(window.L), { once: true });
          existingScript.addEventListener("error", () => reject(new Error("Leaflet failed to load")), { once: true });
          return;
        }

        const script = document.createElement("script");
        script.id = "leafletScript";
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.defer = true;
        script.crossOrigin = "";
        script.onload = () => resolve(window.L);
        script.onerror = () => reject(new Error("Leaflet failed to load"));
        document.body.appendChild(script);
      });
    }

    return towerMapState.leafletScriptPromise.then((leaflet) => {
      if (!leaflet) {
        throw new Error("Leaflet is unavailable");
      }
      return leaflet;
    });
  }

  async function ensureTowerMapInstance() {
    const L = await ensureLeafletLoaded();
    if (!towerMapContainer) return null;

    if (!towerMapState.map) {
      towerMapState.map = L.map(towerMapContainer, {
        preferCanvas: true,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(towerMapState.map);
    }

    return towerMapState.map;
  }

  function renderTowerMap() {
    if (!towerMapState.map || !window.L) return;

    const mapData = getCurrentTowerMapData();
    if (!mapData) {
      updateTowerMapUI();
      return;
    }

    const L = window.L;
    const userLatLng = [mapData.userLat, mapData.userLon];
    const towerLatLng = [mapData.towerLat, mapData.towerLon];
    const userIcon = L.divIcon({
      className: "",
      html: '<div class="tower-map-pin pin-you"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      popupAnchor: [0, -10],
    });
    const towerIcon = L.divIcon({
      className: "",
      html: '<div class="tower-map-pin pin-tower"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      popupAnchor: [0, -10],
    });

    if (!towerMapState.userMarker) {
      towerMapState.userMarker = L.marker(userLatLng, { icon: userIcon }).addTo(towerMapState.map);
      towerMapState.userMarker.bindPopup('<p class="tower-map-popup">Your location</p>');
    } else {
      towerMapState.userMarker.setLatLng(userLatLng);
      towerMapState.userMarker.setPopupContent('<p class="tower-map-popup">Your location</p>');
    }

    if (!towerMapState.towerMarker) {
      towerMapState.towerMarker = L.marker(towerLatLng, { icon: towerIcon }).addTo(towerMapState.map);
      towerMapState.towerMarker.bindPopup('<p class="tower-map-popup">Nearest tower</p>');
    } else {
      towerMapState.towerMarker.setLatLng(towerLatLng);
      towerMapState.towerMarker.setPopupContent('<p class="tower-map-popup">Nearest tower</p>');
    }

    if (!towerMapState.pathLine) {
      towerMapState.pathLine = L.polyline([userLatLng, towerLatLng], {
        color: "#ffd56a",
        weight: 3,
        opacity: 0.85,
        dashArray: "8 8",
      }).addTo(towerMapState.map);
    } else {
      towerMapState.pathLine.setLatLngs([userLatLng, towerLatLng]);
    }

    const bounds = L.latLngBounds([userLatLng, towerLatLng]);
    towerMapState.map.fitBounds(bounds, { padding: [45, 45], maxZoom: 15 });
    updateTowerMapUI();
  }

  async function openTowerMapModal() {
    const mapData = getCurrentTowerMapData();
    if (!mapData) {
      updateTowerMapUI();
      return;
    }

    if (towerMapModal) {
      towerMapModal.classList.add("show");
      towerMapModal.setAttribute("aria-hidden", "false");
    }
    document.body.style.overflow = "hidden";

    try {
      await ensureTowerMapInstance();
      renderTowerMap();
      window.setTimeout(() => {
        towerMapState.map?.invalidateSize();
      }, 120);
    } catch (error) {
      console.error("Map initialization error:", error);
      if (towerMapSummary) {
        towerMapSummary.textContent = "Unable to load map now. Please try again.";
      }
    }
  }

  function closeTowerMapModal() {
    if (towerMapModal) {
      towerMapModal.classList.remove("show");
      towerMapModal.setAttribute("aria-hidden", "true");
    }
    document.body.style.overflow = "";
  }

  function recenterTowerMap() {
    if (!towerMapState.map || !window.L) return;

    const mapData = getCurrentTowerMapData();
    if (!mapData) return;

    const bounds = window.L.latLngBounds(
      [mapData.userLat, mapData.userLon],
      [mapData.towerLat, mapData.towerLon]
    );
    towerMapState.map.fitBounds(bounds, { padding: [45, 45], maxZoom: 15 });
  }

  function getBrowserPosition() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.warn("Geolocation unsupported in browser");
        return resolve(null);
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("Browser location obtained:", position.coords.latitude, position.coords.longitude);
          resolve(position);
        },
        (error) => {
          console.warn("Browser location failed:", error);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  }

  async function ensureTowerDistance() {
    if (window.towerDistance !== null && getCurrentTowerMapData()) {
      return window.towerDistance;
    }

    const position = await getBrowserPosition();
    if (!position) {
      console.warn("Cannot determine tower distance without browser location");
      window.towerDistance = null;
      return null;
    }

    return await detectNearestTowerGPS(position);
  }

  function setGaugePhase(phase) {
    if (!gaugeBox) return;
    gaugeBox.classList.remove("phase-ping", "phase-download", "phase-upload");
    if (phase) gaugeBox.classList.add(phase);
  }

  function activateGaugeLoading() {
    if (!gaugeBox) return;
    gaugeBox.classList.add("loading");
  }

  function deactivateGaugeLoading() {
    if (!gaugeBox) return;
    gaugeBox.classList.remove("loading", "phase-ping", "phase-download", "phase-upload");
  }

  function enableIdleAnimation() {
    gaugeCircle.style.strokeDasharray = "120 40";
    gaugeCircle.style.strokeDashoffset = "0";
    gaugeBox.classList.add("idle");
    gaugeText.textContent = "READY";
    gaugeText.classList.add("idle-text");
  }

  function disableIdleAnimation() {
    gaugeBox.classList.remove("idle");
    gaugeText.classList.remove("idle-text");
    gaugeText.textContent = "0";
  }

  async function playPreSpin() {
    return new Promise(resolve => {

      const circumference = 534;
      const duration = 600; // مدة الصعود
      const durationBack = 400; // مدة النزول

      // أوقف أي idle
      gaugeBox.classList.remove("idle");

      // أوقف الانتقال المؤقت
      gaugeCircle.style.transition = "none";

      let start = null;

      // ===== 1️⃣ صعود إلى 100% =====
      function animateForward(timestamp) {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        const percent = Math.min(progress / duration, 1);

        gaugeCircle.style.strokeDashoffset =
          circumference * (1 - percent);

        if (percent < 1) {
          requestAnimationFrame(animateForward);
        } else {
          start = null;
          requestAnimationFrame(animateBackward);
        }
      }

      // ===== 2️⃣ رجوع إلى 0 =====
      function animateBackward(timestamp) {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        const percent = Math.min(progress / durationBack, 1);

        gaugeCircle.style.strokeDashoffset =
          circumference * percent;

        if (percent < 1) {
          requestAnimationFrame(animateBackward);
        } else {

          // إعادة التهيئة للقياس الحقيقي
          gaugeCircle.style.strokeDashoffset = circumference;
          gaugeCircle.style.transition =
            "stroke-dashoffset 0.15s linear";

          resolve();
        }
      }

      requestAnimationFrame(animateForward);

    });
  }

  enableIdleAnimation();

  const maxSpeed = 1000;

  let lastPing = 0;
  let lastDown = 0;
  let lastUp = 0;
  let latencyUnderLoad = 0;
  window.towerDistance = null;
  window.nearestTowerData = null;
  showTowerMapActions(false);
  updateTowerMapUI();

  function showStatus(msg) {
    const el = document.getElementById("statusText");
    if (!el) return;
    if (el._statusFadeTimer) clearTimeout(el._statusFadeTimer);
    el.classList.add("status-fade");
    el._statusFadeTimer = setTimeout(() => {
      el.textContent = msg;
      el.classList.remove("status-fade");
      el._statusFadeTimer = null;
    }, 140);
  }

  function evaluateMetric(value, type) {
    const raw = String(value).trim();
    const num = Number(raw);

    if (type === "ping") {
      if (num < 20) return { label: "Good", className: "good" };
      if (num <= 50) return { label: "Warning", className: "warning" };
      return { label: "Bad", className: "bad" };
    }

    if (type === "jitter") {
      if (num <= 10) return { label: "Good", className: "good" };
      if (num <= 20) return { label: "Warning", className: "warning" };
      return { label: "Bad", className: "bad" };
    }

    if (type === "latencyUnderLoad") {
      if (num <= 40) return { label: "Good", className: "good" };
      if (num <= 80) return { label: "Warning", className: "warning" };
      return { label: "Bad", className: "bad" };
    }

    if (type === "latencyRatio") {
      if (num < 2) return { label: "Good", className: "good" };
      if (num <= 3) return { label: "Warning", className: "warning" };
      return { label: "Bad", className: "bad" };
    }

    if (type === "networkStability") {
      if (num > 80) return { label: "Good", className: "good" };
      if (num >= 60) return { label: "Warning", className: "warning" };
      return { label: "Bad", className: "bad" };
    }

    if (type === "congestionScore") {
      if (num <= 20) return { label: "Good", className: "good" };
      if (num <= 50) return { label: "Warning", className: "warning" };
      return { label: "Bad", className: "bad" };
    }

    if (type === "bufferbloatGrade") {
      if (/^[AB]$/i.test(raw)) return { label: "Good", className: "good" };
      if (/^C$/i.test(raw)) return { label: "Warning", className: "warning" };
      if (/^[DF]$/i.test(raw)) return { label: "Bad", className: "bad" };
      return { label: "N/A", className: "warning" };
    }

    if (type === "towerDistance") {
      if (!raw || isNaN(num)) return { label: "N/A", className: "warning" };
      if (num < 1) return { label: "Good", className: "good" };
      if (num <= 3) return { label: "Warning", className: "warning" };
      return { label: "Bad", className: "bad" };
    }

    return { label: "N/A", className: "warning" };
  }

  function calculateNetworkStability(ping, jitter, latencyUnderLoad) {
    const p = Number(ping) || 0;
    const j = Number(jitter) || 0;
    const l = Number(latencyUnderLoad) || 0;
    const jitterFactor = Math.max(0, 1 - j / 40);
    const latencyDiff = Math.abs(l - p);
    const latencyFactor = Math.max(0, 1 - latencyDiff / 80);
    const stability = (jitterFactor * 0.55 + latencyFactor * 0.45) * 100;
    return Math.round(Math.min(100, Math.max(0, stability)));
  }

  function updateMetric(id, type, rawValue, formattedValue) {
    const valueEl = document.getElementById(`${id}Value`);
    const statusEl = document.getElementById(`${id}Status`);
    if (!valueEl || !statusEl) return;

    valueEl.textContent = formattedValue;
    const evaluation = evaluateMetric(rawValue, type);
    valueEl.classList.remove("good", "warning", "bad", "value-good", "value-medium", "value-bad");
    const valueClass = evaluation.className === "good"
      ? "value-good"
      : evaluation.className === "warning"
      ? "value-medium"
      : "value-bad";
    valueEl.classList.add(valueClass);
    statusEl.textContent = "";
    statusEl.className = "status";
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

    if (gaugeBox) {
      gaugeBox.classList.remove("speed-low", "speed-med", "speed-high");
      if (percent >= 0.65) {
        gaugeBox.classList.add("speed-high");
      } else if (percent >= 0.25) {
        gaugeBox.classList.add("speed-med");
      } else {
        gaugeBox.classList.add("speed-low");
      }
    }
  }

  function resetGaugeSmooth() {
    let current = parseFloat(gaugeText.textContent) || 0;

    const interval = setInterval(() => {
      current -= current * 0.08;
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
      ` ${data.isp} | ${data.city || "-"}, ${data.country || "-"}`;
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

  async function detectNearestTowerGPS(position) {

    if (!position) {
      console.warn("detectNearestTowerGPS called without position");
      window.towerDistance = null;
      window.nearestTowerData = null;
      showTowerMapActions(false);
      updateTowerMapUI();
      return null;
    }

    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

    try {
      const ispText = document.getElementById("ispInfo")?.textContent || "";
      const ispName = ispText.split("|")[0]?.trim();

      console.log("Sending tower lookup request with coords:", { lat, lon, ispName });

      const res = await fetch("/api/nearest-tower", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          lat,
          lon,
          isp: ispName
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Tower lookup failed");
      }

      console.log("Nearest tower response:", data);

      const distance = Number(data?.distance);
      const towerLat = Number(data?.nearestTower?.lat);
      const towerLon = Number(data?.nearestTower?.lon);

      window.towerDistance =
        Number.isFinite(distance) && distance >= 0 ? distance : null;

      if (Number.isFinite(towerLat) && Number.isFinite(towerLon)) {
        window.nearestTowerData = {
          user: { lat, lon },
          tower: {
            lat: towerLat,
            lon: towerLon,
          },
          distanceKm: window.towerDistance,
          updatedAt: Date.now(),
        };
      } else {
        window.nearestTowerData = null;
      }

      console.log("towerDistance set:", window.towerDistance);
      showTowerMapActions(Boolean(window.nearestTowerData));
      updateTowerMapUI();
      return window.towerDistance;

    } catch (err) {
      console.error("Tower API error:", err);
      window.towerDistance = null;
      window.nearestTowerData = null;
      showTowerMapActions(false);
      updateTowerMapUI();
      return null;
    }
  }

  // تشغيلها عند تحميل الصفحة

  async function requestAIAnalysis(ping, down, up, jitter, latencyUnderLoad) {

    const selectedRadio = document.querySelector(
      'input[name="connection"]:checked'
    );

    const connectionType = selectedRadio
      ? selectedRadio.value
      : "wifi";

    const ispText = document.getElementById("ispInfo")?.textContent || "";
    const ispName = ispText.split("|")[0]?.trim() || null;


    await ensureTowerDistance();

    const payload = {
      ping,
      jitter,
      download: down,
      upload: up,
      latencyUnderLoad,
      connection: connectionType,
      towerDistance: window.towerDistance || null
    };

    showStatus("Analyzing results...");

    const res = await fetch("/api/analyze-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    showAIResult(data.analysis, data.contactISP, data.metrics);
    showStatus("AI Analysis Complete ✅");
  }


  function typeAiResultText(element, text) {
    if (!element) return;
    if (element.__typingTimer) clearTimeout(element.__typingTimer);

    element.textContent = "";
    let index = 0;

    function tick() {
      if (index >= text.length) {
        element.__typingTimer = null;
        return;
      }
      element.textContent += text[index++];
      const delay = 12 + (index % 8 === 0 ? 10 : 0);
      element.__typingTimer = setTimeout(tick, delay);
    }

    tick();
  }

  function showAIResult(text, contactISP, metrics) {

    const box = document.getElementById("resultBox");
    const output = document.getElementById("aiResult");

    const contactBox = document.getElementById("ispContactComponent");
    const nameEl = document.getElementById("ispContactName");
    const numberEl = document.getElementById("ispContactNumber");

    const metricsBox = document.getElementById("connectionDetailsComponent");

    if (output) typeAiResultText(output, text);
    if (box) {
      box.classList.remove("d-none");
      requestAnimationFrame(() => box.classList.add("result-visible"));
    }

    // ISP Contact
    if (contactISP && contactBox) {
      nameEl.textContent = contactISP.name;
      numberEl.textContent = contactISP.phone;
      contactBox.classList.remove("d-none");
    }

    // Connection Metrics
    if (metrics && metricsBox) {

      updateMetric("metricPing", "ping", metrics.ping, metrics.ping.toFixed(1) + " ms");
      updateMetric("metricJitter", "jitter", metrics.jitter, metrics.jitter.toFixed(1) + " ms");
      updateMetric("metricLoadLatency", "latencyUnderLoad", metrics.latencyUnderLoad, metrics.latencyUnderLoad.toFixed(1) + " ms");
      updateMetric("metricLatencyRatio", "latencyRatio", metrics.latencyRatio, metrics.latencyRatio.toFixed(2));
      const stabilityPercent = calculateNetworkStability(metrics.ping, metrics.jitter, metrics.latencyUnderLoad);
      updateMetric("metricStability", "networkStability", stabilityPercent, stabilityPercent.toFixed(0) + "%");
      const congestionPercent = Math.round((Number(metrics.congestionScore) / 5) * 100);
      updateMetric("metricCongestion", "congestionScore", congestionPercent, congestionPercent.toFixed(0) + "%");
      updateMetric("metricBufferbloat", "bufferbloatGrade", metrics.bufferbloatGrade, metrics.bufferbloatGrade);
      updateMetric(
        "metricTowerDistance",
        "towerDistance",
        metrics.towerDistance,
        metrics.towerDistance ? metrics.towerDistance.toFixed(2) + " km" : "N/A"
      );

      metricsBox.classList.remove("d-none");
      showTowerMapActions(true);
      updateTowerMapUI();
    } else if (metricsBox) {
      metricsBox.classList.add("d-none");
      showTowerMapActions(false);
      closeTowerMapModal();
    }

  }

  function animateValue(id, target, decimals = 0) {
    const el = document.getElementById(id);
    if (!el) return;

    const start = parseFloat(el.textContent) || 0;
    const end = Number(target) || 0;
    const duration = 420;
    const startTime = performance.now();

    function frame(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = start + (end - start) * eased;
      el.textContent = decimals === 0 ? Math.round(value) : value.toFixed(decimals);
      if (progress < 1) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  function showResults(ping, down, up) {
    animateValue("pingValue", ping, 0);
    animateValue("downloadValue", down, 1);
    animateValue("uploadValue", up, 1);
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
    if (isTestRunning) {
      return;
    }

    activateGaugeLoading();
    setGaugePhase("phase-ping");
    showStatus("Measuring latency...");
    disableIdleAnimation();
    await playPreSpin();


    // ===== مسح التحليل ورقم التواصل عند إعادة الاختبار =====
    const output = document.getElementById("aiResult");
    const resultBox = document.getElementById("resultBox");
    const contactBox = document.getElementById("ispContactComponent");

    if (output) output.textContent = "Waiting for analysis...";
    if (resultBox) {
      resultBox.classList.add("d-none");
      resultBox.classList.remove("result-visible");
    }
    if (contactBox) contactBox.classList.add("d-none");

    // إعادة ضبط كاملة قبل القياس
    gaugeCircle.style.strokeDasharray = "534";
    gaugeCircle.style.strokeDashoffset = "534";
    gaugeCircle.style.transition = "stroke-dashoffset 0.15s linear";

    setGaugeStartState(true);
    try {

      const pingData = await measurePingAndJitter();
      lastPing = pingData.ping;
      const jitter = pingData.jitter;

      showStatus("Testing download speed...");
      setGaugePhase("phase-download");
      const downStart = performance.now();
      const res = await fetch(
        "https://speed.cloudflare.com/__down?bytes=200000000&nocache=" +
        Date.now()
      );

      const reader = res.body.getReader();
      let total = 0;

      let loadPingSamples = [];
      let measuring = true;

      const interval = setInterval(async () => {
        if (!measuring) return;

        const start = performance.now();
        try {
          await fetch(
            "https://speed.cloudflare.com/cdn-cgi/trace?nocache=" + Date.now(),
            { cache: "no-store" }
          );
          const end = performance.now();
          loadPingSamples.push(end - start);
        } catch (e) { }
      }, 300);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        total += value.length;

        const elapsed = (performance.now() - downStart) / 1000;
        const liveMbps = (total * 8) / elapsed / 1e6;
        updateGauge(liveMbps);
      }

      measuring = false;
      clearInterval(interval);

      if (loadPingSamples.length > 0) {
        latencyUnderLoad =
          loadPingSamples.reduce((a, b) => a + b, 0) /
          loadPingSamples.length;
      }

      const downTime = (performance.now() - downStart) / 1000;
      const downMbps = (total * 8) / downTime / 1e6;

      lastDown = downMbps;
      updateGauge(downMbps);

      const size = 25 * 1024 * 1024;
      const buffer = new Uint8Array(size);

      showStatus("Testing upload speed...");
      setGaugePhase("phase-upload");
      const upStart = performance.now();
      await fetch("https://speed.cloudflare.com/__up", {
        method: "POST",
        body: buffer,
      });

      const upTime = (performance.now() - upStart) / 1000;
      const upMbps = (size * 8) / upTime / 1e6;

      lastUp = upMbps;

      showResults(lastPing, lastDown, lastUp);
      showStatus("Analyzing results...");

      await requestAIAnalysis(
        lastPing,
        lastDown,
        lastUp,
        jitter,
        latencyUnderLoad
      );

      showStatus("Test Complete ✅");

      setTimeout(() => {
        resetGaugeSmooth();
      }, 500);

    } catch (err) {
      console.error("Speed Test Error:", err);
      showStatus("Test failed ❌");
    } finally {
      deactivateGaugeLoading();
      setGaugeStartState(false);
    }
  }

  window.startSpeedTest = startSpeedTest;

  gaugeBox?.addEventListener("click", () => {
    startSpeedTest();
  });

  gaugeBox?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      startSpeedTest();
    }
  });

  openTowerMapBtn?.addEventListener("click", () => {
    openTowerMapModal();
  });

  closeTowerMapBtn?.addEventListener("click", () => {
    closeTowerMapModal();
  });

  towerMapModal?.addEventListener("click", (e) => {
    if (e.target === towerMapModal) {
      closeTowerMapModal();
    }
  });

  recenterTowerMapBtn?.addEventListener("click", () => {
    recenterTowerMap();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && towerMapModal?.classList.contains("show")) {
      closeTowerMapModal();
    }
  });

  // Info button modal logic
  const infoBtn = document.getElementById("infoBtn");
  const infoModal = document.getElementById("infoModal");

  if (infoBtn && infoModal) {
    infoModal.classList.remove("d-none");

    infoBtn.addEventListener("click", () => {
      infoModal.classList.add("show");
    });

    infoModal.addEventListener("click", (e) => {
      if (e.target === infoModal) {
        infoModal.classList.remove("show");
      }
    });
  }
});
