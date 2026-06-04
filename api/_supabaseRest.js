import { extractBearerToken } from './_adminAuth.js';

export function getSupabaseRestConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return {
    anonKey,
    restUrl: url ? `${url.replace(/\/$/, '')}/rest/v1` : '',
    serviceRoleKey,
  };
}

export function getSupabaseRpcUrl() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  return url ? `${url.replace(/\/$/, '')}/rest/v1/rpc` : '';
}

function parseSupabaseResponse(text, response) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    if (response.ok) return text;
    return { message: text };
  }
}

export async function supabaseRestRequest(path, {
  body,
  method = 'GET',
  prefer = '',
  request,
  service = false,
} = {}) {
  const { anonKey, restUrl, serviceRoleKey } = getSupabaseRestConfig();
  if (!restUrl || !anonKey) {
    const error = new Error('Supabase is not configured');
    error.status = 503;
    throw error;
  }

  const bearerToken = service
    ? serviceRoleKey
    : extractBearerToken(request ?? { headers: {} }) || anonKey;

  if (service && !serviceRoleKey) {
    const error = new Error('Supabase service role key is not configured');
    error.status = 503;
    throw error;
  }

  const headers = {
    apikey: service ? serviceRoleKey : anonKey,
    Authorization: `Bearer ${bearerToken}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (prefer) headers.Prefer = prefer;

  const response = await fetch(`${restUrl}/${String(path).replace(/^\//, '')}`, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers,
    method,
  });

  const text = await response.text();
  const data = parseSupabaseResponse(text, response);
  if (!response.ok) {
    const error = new Error(data?.message || data?.hint || 'Supabase request failed');
    error.details = data;
    error.status = response.status;
    throw error;
  }

  return data;
}

export async function supabaseRpcRequest(functionName, {
  body,
  request,
  service = false,
} = {}) {
  return supabaseRestRequest(`rpc/${functionName}`, {
    body,
    method: 'POST',
    request,
    service,
  });
}
