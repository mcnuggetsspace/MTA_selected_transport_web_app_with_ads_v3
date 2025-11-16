const express = require('express');
const path = require('path');
const { ProxyAgent } = require('undici');

const appConfig = require('./config/app.config.json');

const app = express();
const PORT = process.env.PORT || 3000;

const DEFAULT_STOP_CODE = String(
  appConfig?.busStopCode?.toString()?.trim() || '300432'
);
const DEFAULT_MAX_VISITS = String(
  Number.parseInt(appConfig?.maxStopVisits, 10) > 0
    ? Number.parseInt(appConfig.maxStopVisits, 10)
    : 10
);

app.use((req, res, next) => {
  res.set('Referrer-Policy', 'no-referrer');
  next();
});

app.use(express.static(path.join(__dirname)));

const proxyUrl =
  process.env.HTTPS_PROXY ||
  process.env.https_proxy ||
  process.env.HTTP_PROXY ||
  process.env.http_proxy ||
  "";

const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;

app.get('/api/stop-monitoring', async (req, res) => {
  const apiKey = req.get('x-api-key');
  if (!apiKey) {
    return res.status(400).json({
      error: 'Missing API key. Provide the key in the x-api-key header.',
    });
  }

  const stopCode = (req.query.stopCode || DEFAULT_STOP_CODE).trim();
  const maxVisits = (req.query.maxVisits || DEFAULT_MAX_VISITS).trim();

  const params = new URLSearchParams({
    key: apiKey,
    OperatorRef: 'MTA',
    MonitoringRef: stopCode,
    MaximumStopVisits: maxVisits,
    version: '2',
  });

  const targetUrl = `https://bustime.mta.info/api/siri/stop-monitoring.json?${params.toString()}`;
  const sanitizedUrl = new URL(targetUrl);
  sanitizedUrl.searchParams.set('key', '••••');

  try {
    const response = await fetch(targetUrl, {
      headers: {
        accept: 'application/json',
      },
      ...(dispatcher ? { dispatcher } : {}),
    });

    res.set('x-mta-proxy-request-url', sanitizedUrl.toString());
    res.set('x-mta-proxy-status', String(response.status));
    res.set('cache-control', 'no-store');

    if (!response.ok) {
      const bodyText = await response.text();
      return res.status(response.status).json({
        error: 'Request to the MTA BusTime API failed.',
        status: response.status,
        statusText: response.statusText,
        body: bodyText,
      });
    }

    const data = await response.text();
    res.type('application/json').send(data);
  } catch (error) {
    console.error('MTA BusTime proxy error:', error);
    res.status(502).json({
      error: 'Unable to reach the MTA BusTime API.',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

const shutdown = () => {
  dispatcher?.close?.();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
