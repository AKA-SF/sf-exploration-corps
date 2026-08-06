import { requireAdminAccess } from './_adminAuth.js';
import { summerClimateEditorialDraft } from '../src/content/editorial/summerClimateEditorialDraft.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  response.setHeader('Cache-Control', 'private, no-store');
  const user = await requireAdminAccess(request, response);
  if (!user) return;

  return response.status(200).json({ draft: summerClimateEditorialDraft });
}
