// Higgsfield game hosting runs on Cloudflare Workers Durable Objects: it instantiates a
// `GameServer` per game and forwards every request to its fetch(). NIGHTMARE BUSTERS is a
// single-player Unity WebGL game with no server logic, so we just serve the bundled static
// assets (index.html + Build/*.unityweb, decompressed in-browser) via the ASSETS binding.
import { DurableObject } from 'cloudflare:workers';

async function serve(env, request) {
  if (env && env.ASSETS && typeof env.ASSETS.fetch === 'function') {
    const res = await env.ASSETS.fetch(request);
    // Always revalidate the entry point so redeploys propagate instantly. The Build/* asset files
    // are content-hashed (nameFilesAsHashes), so they get new URLs each build and cache safely.
    const pathname = new URL(request.url).pathname;
    if (pathname === '/' || pathname === '' || pathname.endsWith('.html')) {
      const headers = new Headers(res.headers);
      headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
    }
    return res;
  }
  return new Response('NIGHTMARE BUSTERS — assets binding unavailable', { status: 500 });
}

export class GameServer extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.env = env;
  }
  async fetch(request) {
    return serve(this.env, request);
  }
}

export default {
  async fetch(request, env) {
    return serve(env, request);
  },
};
