function getSupabaseApiConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  return { anonKey, url };
}

export function extractBearerToken(request) {
  const header = request.headers.authorization || request.headers.Authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

async function getRequestUser(request) {
  const { anonKey, url } = getSupabaseApiConfig();
  const token = extractBearerToken(request);

  if (!url || !anonKey) {
    const error = new Error('Supabase auth is not configured');
    error.status = 503;
    throw error;
  }

  if (!token) {
    const error = new Error('Login session is required');
    error.status = 401;
    throw error;
  }

  const authResponse = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!authResponse.ok) {
    const error = new Error('Invalid login session');
    error.status = 401;
    throw error;
  }

  return authResponse.json();
}

export function hasAdminRole(user) {
  const appMetadata = user?.app_metadata ?? {};
  return appMetadata.role === 'admin' || appMetadata.roles?.includes?.('admin');
}

export async function getOptionalUser(request) {
  try {
    return await getRequestUser(request);
  } catch {
    return null;
  }
}

export async function requireAuthenticatedUser(request, response) {
  try {
    return await getRequestUser(request);
  } catch (error) {
    response.status(error.status || 401).json({ error: error.message || 'Login session is required' });
    return null;
  }
}

export async function requireAdminUser(request, response) {
  const user = await requireAuthenticatedUser(request, response);
  if (!user) return null;

  if (!hasAdminRole(user)) {
    response.status(403).json({ error: 'Admin role is required' });
    return null;
  }

  return user;
}
