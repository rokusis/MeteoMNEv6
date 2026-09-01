export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/status") {
      return Response.json({ status: "ok", app: env.APP_NAME ?? "MeteoMNEv6", time: new Date().toISOString() });
    }
    return Response.json({ status: "ok", message: "MeteoMNEv6 skeleton radi", path: url.pathname });
  },
};
