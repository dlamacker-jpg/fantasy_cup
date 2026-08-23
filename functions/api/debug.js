// GET /api/debug — Shows what bindings are available (remove after debugging)
export async function onRequestGet(context) {
  const { env } = context;

  const bindings = Object.keys(env || {});
  const hasKV = !!env?.POWERUPS_KV;

  let kvTest = null;
  if (hasKV) {
    try {
      await env.POWERUPS_KV.put('_test', 'ok');
      const val = await env.POWERUPS_KV.get('_test');
      kvTest = val === 'ok' ? 'read/write works' : `unexpected value: ${val}`;
      await env.POWERUPS_KV.delete('_test');
    } catch (e) {
      kvTest = `error: ${e.message}`;
    }
  }

  return new Response(JSON.stringify({
    bindings,
    hasKV,
    kvTest,
    envType: typeof env,
  }, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
}
