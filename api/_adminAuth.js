function getSupabaseApiConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  return { anonKey, url };
}

function extractBearerToken(request) {
  const header = request.headers.authorization || request.headers.Authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

export function hasAdminRole(user) {
  const appMetadata = user?.app_metadata ?? {};
  return appMetadata.role === 'admin' || appMetadata.roles?.includes?.('admin');
}

export async function requireAdminUser(request, response) {
  const { anonKey, url } = getSupabaseApiConfig();
  const token = extractBearerToken(request);

  if (!url || !anonKey) {
    response.status(503).json({ error: 'Supabase admin auth is not configured' });
    return null;
  }

  if (!token) {
    response.status(401).json({ error: 'Admin session is required' });
    return null;
  }

  const authResponse = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!authResponse.ok) {
    response.status(401).json({ error: 'Invalid admin session' });
    return null;
  }

  const user = await authResponse.json();
  if (!hasAdminRole(user)) {
    response.status(403).json({ error: 'Admin role is required' });
    return null;
  }

  return user;
}
