const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

export async function onRequest({ request, env }) {
  const { method } = request;

  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  if (method !== 'GET') {
    return jsonResponse(
      { error: 'Method not allowed' },
      405,
    );
  }

  const requestUrl = new URL(request.url);
  const targetUrl = new URL('https://bustime.mta.info/api/siri/stop-monitoring.json');
  const requestParams = requestUrl.searchParams;
  const targetParams = new URLSearchParams();

  const stopCode = requestParams.get('stopCode')?.trim();
  const maxVisits = requestParams.get('maxVisits')?.trim();

  for (const [key, value] of requestParams.entries()) {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      continue;
    }

    switch (key) {
      case 'stopCode':
        targetParams.set('MonitoringRef', trimmedValue);
        break;
      case 'maxVisits':
        targetParams.set('MaximumStopVisits', trimmedValue);
        break;
      case 'key':
        // Ignore user-supplied API keys in production; the Worker injects its own secret.
        break;
      default:
        targetParams.append(key, trimmedValue);
        break;
    }
  }

  if (!targetParams.has('MonitoringRef') && stopCode) {
    targetParams.set('MonitoringRef', stopCode);
  }

  if (!targetParams.has('MaximumStopVisits') && maxVisits) {
    targetParams.set('MaximumStopVisits', maxVisits);
  }

  if (!targetParams.has('OperatorRef')) {
    targetParams.set('OperatorRef', 'MTA');
  }

  if (!targetParams.has('version')) {
    targetParams.set('version', '2');
  }

  if (env?.MTA_API_KEY) {
    targetParams.set('key', env.MTA_API_KEY);
  }

  targetUrl.search = targetParams.toString();

  let upstreamResponse;
  try {
    upstreamResponse = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'mta-selected-transport-proxy/1.0',
      },
    });
  } catch (error) {
    return jsonResponse(
      {
        error: 'Upstream request failed',
        detail: error instanceof Error ? error.message : String(error),
      },
      502,
    );
  }

  const responseHeaders = new Headers(upstreamResponse.headers);
  responseHeaders.set('Access-Control-Allow-Origin', '*');
  responseHeaders.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
  responseHeaders.set('Access-Control-Allow-Headers', '*');
  responseHeaders.set('Cache-Control', 's-maxage=15');

  const sanitizedUrl = new URL(targetUrl);
  sanitizedUrl.searchParams.set('key', '••••');
  responseHeaders.set('x-mta-proxy-request-url', sanitizedUrl.toString());
  responseHeaders.set('x-mta-proxy-status', String(upstreamResponse.status));

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}
