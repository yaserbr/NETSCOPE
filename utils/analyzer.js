function analyze(data) {

  const {
    download = 0,
    upload = 0,
    ping = 0,
    jitter = 0,
    loss = 0
  } = data;

  // Base score
  let score = 100;

  let status = "Excellent";
  let type = "normal";
  let severity = "low";
  let problem = "No issues detected";
  let details = "Your internet connection is stable.";
  let tips = [];

  /* =========================
     Packet Loss
  ========================= */

  if (loss > 5) {
    score -= 40;

    type = "network";
    severity = "high";
    status = "Poor";

    problem = "High Packet Loss";
    details = "Data packets are being lost during transmission.";

    tips.push(
      "Check network cables",
      "Restart router",
      "Contact ISP"
    );
  }

  /* =========================
     High Latency
  ========================= */

  if (ping > 200) {
    score -= 25;

    type = "latency";
    severity = "medium";
    status = "Poor";

    problem = "High Latency";
    details = "Your connection has high delay.";

    tips.push(
      "Use wired connection",
      "Close background apps",
      "Change DNS"
    );
  }
/* =========================
   Server Bottleneck
========================= */

if(download < 50 && ping < 50){

  score -= 25;

  type = "server";
  severity = "medium";

  problem = "Server Bottleneck";
  details = "Test server cannot handle full speed.";

  tips.push(
    "Upgrade server resources",
    "Use CDN",
    "Check hosting bandwidth"
  );
}

  /* =========================
     Low Speed (ISP)
  ========================= */

  if (download < 10 && ping < 100) {
    score -= 30;

    type = "isp";
    severity = "medium";
    status = "Poor";

    problem = "Low Internet Speed";
    details = "Your internet speed is lower than expected.";

    tips.push(
      "Restart modem",
      "Check service plan",
      "Contact ISP"
    );
  }
  /* =========================
   Congestion
========================= */

if(ping > 120 && download < 40){

  score -= 20;

  type = "congestion";
  severity = "medium";

  problem = "Network Congestion";
  details = "Network is congested.";

  tips.push(
    "Test at off-peak hours",
    "Restart router",
    "Change ISP"
  );
}


  /* =========================
     Weak WiFi
  ========================= */

  if (download < 25 && ping < 60) {
    score -= 20;

    type = "wifi";
    severity = "medium";
    status = "Average";

    problem = "Weak WiFi Signal";
    details = "Wireless signal strength is low.";

    tips.push(
      "Move closer to router",
      "Change WiFi channel",
      "Use 5GHz network"
    );
  }

  /* =========================
     Jitter
  ========================= */

  if (jitter > 30) {
    score -= 15;

    type = "stability";
    severity = "medium";
    status = "Average";

    problem = "Unstable Connection";
    details = "Connection has high variation in latency.";

    tips.push(
      "Reduce connected devices",
      "Restart router"
    );
  }

  /* =========================
     Normalize score
  ========================= */

  if (score < 0) score = 0;

  if (score >= 85) status = "Excellent";
  else if (score >= 70) status = "Good";
  else if (score >= 50) status = "Average";
  else status = "Poor";

  return {
    status,
    score,
    type,
    severity,
    problem,
    details,
    tips
  };
}

module.exports = analyze;
