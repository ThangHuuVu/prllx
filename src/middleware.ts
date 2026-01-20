import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getScene } from "@/lib/kv";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Only apply to embed routes
  if (!pathname.startsWith("/embed/")) {
    return NextResponse.next();
  }

  // Extract scene ID from path
  const sceneId = pathname.split("/")[2];
  if (!sceneId) {
    return NextResponse.next();
  }

  try {
    const scene = await getScene(sceneId);

    if (!scene) {
      return NextResponse.next();
    }

    // Build CSP frame-ancestors directive
    let frameAncestors: string;
    if (scene.allowedDomains === null) {
      // null = allow all
      frameAncestors = "frame-ancestors *";
    } else if (scene.allowedDomains.length === 0) {
      // empty array = same origin only
      frameAncestors = "frame-ancestors 'self'";
    } else {
      // specific domains
      const domains = scene.allowedDomains
        .map((d) => (d.startsWith("http") ? d : `https://${d}`))
        .join(" ");
      frameAncestors = `frame-ancestors 'self' ${domains}`;
    }

    // Clone response and add CSP header
    const response = NextResponse.next();
    response.headers.set("Content-Security-Policy", frameAncestors);

    return response;
  } catch (error) {
    console.error("Middleware error:", error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: "/embed/:id*",
};
