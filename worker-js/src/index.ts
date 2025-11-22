export interface Env {
  // Add bindings here, e.g.:
  // DIAGRAMS: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Log the request
    console.log(`${new Date().toISOString()} - [${path}]`);

    // Route handler
    switch (true) {
      // Root health check endpoint
      case method === 'GET' && path === '/':
        return new Response('DAAD Worker (JS) - Ready to visualize!', {
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        });

      // Detailed health endpoint
      case method === 'GET' && path === '/api/health':
        const healthResponse = {
          status: 'healthy',
          service: 'daad-worker-js',
          version: '0.1.0',
          runtime: 'Cloudflare Workers (JavaScript)'
        };
        return new Response(JSON.stringify(healthResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });

      // POST diagram endpoint
      case method === 'POST' && path === '/api/diagram':
        const body = await request.text();
        const diagramResponse = {
          success: true,
          message: 'Diagram received',
          data_length: body.length
        };
        return new Response(JSON.stringify(diagramResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });

      // Worker version endpoint
      case method === 'GET' && path === '/worker-version':
        return new Response('0.1.0', {
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        });

      // 404 for unknown routes
      default:
        const errorResponse = {
          error: 'Not Found',
          path: path,
          method: method
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
    }
  }
};
