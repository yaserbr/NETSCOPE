# NETSCOPE

NETSCOPE is a web-based network analyzer that measures internet speed, calculates quality metrics, and generates an AI-powered diagnosis to help users understand connection issues.

## Features

- Internet speed test UI (Ping, Download, Upload)
- Advanced metrics:
  - Jitter
  - Latency Under Load
  - Latency Ratio
  - Network Stability
  - Congestion Score
  - Bufferbloat grade
- AI network diagnosis via OpenAI
- ISP lookup by IP
- Nearest cellular tower lookup (OpenCellID)
- Built-in rate limiting for `/api` routes

## Tech Stack

- Node.js
- Express
- OpenAI API
- Bootstrap (frontend)

## Project Structure

```text
NETSCOPE/
  app.js
  server.js
  package.json
  public/
    index.html
    css/styles.css
    js/main.js
```

## Prerequisites

- Node.js 18+ (recommended)
- npm
- OpenAI API key
- OpenCellID API key (for nearest tower feature)

## Installation

```bash
npm install
```

## Environment Variables

Create a `.env` file in the project root and set:

```env
APP_KEY=your_app_key
OPENAI_API_KEY=your_openai_api_key
OPENCELL_API_KEY=your_opencell_api_key
```

Notes:
- `APP_KEY` is required for server startup.
- Requests can include `x-app-key` header for API authorization.

## Running Locally

Development:

```bash
npm run dev
```

Production:

```bash
npm start
```

Server runs on:

```text
http://localhost:3000
```

## API Endpoints

- `POST /api/analyze-ai`  
  Accepts network metrics and returns AI diagnosis + calculated metrics.

- `POST /api/nearest-tower`  
  Accepts coordinates and ISP, returns nearest tower and distance.

- `POST /api/isp`  
  Accepts IP address, returns normalized ISP and geo details.

## Security and Limits

- Rate limit on `/api`: 30 requests per minute.
- CORS is restricted to configured origins in `app.js`.

## License

ISC
