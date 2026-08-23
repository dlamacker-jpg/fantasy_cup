// POST /api/reset-password — Commissioner resets an owner's password
// Body: { "commissionerId": "863922541440425984", "targetOwnerId": "xxx" }
// Deletes the stored credential so the owner can re-register on next login

import { OWNERS, json, handleCors } from './_shared.js';

const COMMISSIONER_ID = '863922541440425984'; // Demar

export async function onRequestOptions() {
  return handleCors();
}

export async function onRequestPost({ request, env }) {
  try {
    const { commissionerId, targetOwnerId } = await request.json();

    if (commissionerId !== COMMISSIONER_ID) {
      return json({ error: 'Only the commissioner can reset passwords' }, 403);
    }
    if (!targetOwnerId || !OWNERS[targetOwnerId]) {
      return json({ error: 'Invalid target owner' }, 400);
    }

    const kv = env.POWERUPS_KV;
    await kv.delete(`cred:${targetOwnerId}`);

    return json({
      success: true,
      message: `Password reset for ${OWNERS[targetOwnerId].character}. They can set a new one on next login.`,
    });
  } catch (err) {
    return json({ error: 'Invalid request' }, 400);
  }
}
