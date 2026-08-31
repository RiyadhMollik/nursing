import { NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://127.0.0.1:8000";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function proxy(req, { params }) {
  const path = (params?.path || []).join("/");
  const url = new URL(req.url);
  const search = url.search || "";
  // Django's APPEND_SLASH requires a trailing slash on API paths
  const slash = path && !path.endsWith("/") ? "/" : "";
  const target = `${BACKEND}/api/${path}${slash}${search}`;

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.set("Host", new URL(BACKEND).host);

  const init = {
    method: req.method,
    headers,
    redirect: "manual",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
  }

  try {
    let upstream = await fetch(target, init);
    // Follow same-origin redirects from Django (e.g. trailing-slash 301)
    let hops = 0;
    while (upstream.status >= 300 && upstream.status < 400 && hops < 5) {
      const loc = upstream.headers.get("location");
      if (!loc) break;
      const nextUrl = loc.startsWith("http") ? loc : `${BACKEND}${loc}`;
      upstream = await fetch(nextUrl, init);
      hops++;
    }
    const resHeaders = new Headers(upstream.headers);
    resHeaders.delete("content-encoding");
    return new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: resHeaders,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Backend unreachable", detail: String(e) },
      { status: 502 }
    );
  }
}

export {
  proxy as GET,
  proxy as POST,
  proxy as PUT,
  proxy as PATCH,
  proxy as DELETE,
  proxy as OPTIONS,
  proxy as HEAD,
};
