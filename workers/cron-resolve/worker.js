// Cloudflare Cron Trigger Worker
// Fires every Thursday at 8:20 PM ET (00:20 UTC Friday) to auto-resolve
// pending power-up deployments for the current NFL week.
//
// Deploy separately:
//   cd workers/cron-resolve
//   npx wrangler deploy
//
// Environment variables needed:
//   APP_URL = https://fantasycup.pages.dev  (or your custom domain)
//   CRON_SECRET = a shared secret matching CRON_SECRET in Pages env

export default {
  async scheduled(event, env, ctx) {
    const appUrl = env.APP_URL || 'https://fantasycup.pages.dev';
    const cronSecret = env.CRON_SECRET || '';

    console.log(`[cron-resolve] Triggered at ${new Date().toISOString()}`);

    try {
      const res = await fetch(`${appUrl}/api/auto-resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Cron-Secret': cronSecret,
        },
      });

      const data = await res.json();
      console.log(`[cron-resolve] Response:`, JSON.stringify(data));

      if (data.alreadyResolved) {
        console.log(`[cron-resolve] Week already resolved — no action needed.`);
      } else if (data.noPending) {
        console.log(`[cron-resolve] No pending deployments — nothing to resolve.`);
      } else if (data.resolved) {
        console.log(`[cron-resolve] Successfully resolved week ${data.week}! ${data.order?.length || 0} deployments processed.`);
      } else {
        console.log(`[cron-resolve] Unexpected response:`, data);
      }
    } catch (err) {
      console.error(`[cron-resolve] Error:`, err.message);
    }
  },

  // Also support manual HTTP trigger for testing
  async fetch(request, env) {
    if (request.method === 'POST') {
      // Simulate the scheduled event
      await this.scheduled({}, env, {});
      return new Response(JSON.stringify({ triggered: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response('Cron resolve worker. POST to trigger manually.', { status: 200 });
  },
};
