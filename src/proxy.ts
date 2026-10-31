import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { frameAncestorsDirective } from "@/lib/domains";
import { getScene, isSafeSceneId } from "@/lib/kv";
import { limitSceneRead } from "@/lib/rate-limit";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isSceneRead(pathname) || !isReadMethod(request.method)) {
    return NextResponse.next();
  }

  const limit = limitSceneRead(request.headers);
  if (!limit.ok) {
    const headers = { "Retry-After": String(limit.retryAfter) };
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers },
      );
    }
    return new NextResponse("Too many requests", { status: 429, headers });
  }

  if (!pathname.startsWith("/embed/")) {
    return NextResponse.next();
  }

  const sceneId = pathname.split("/")[2];
  if (!sceneId || !isSafeSceneId(sceneId)) {
    return NextResponse.next();
  }

  try {
    const scene = await getScene(sceneId);
    if (!scene) {
      return NextResponse.next();
    }

    const response = NextResponse.next();
    response.headers.set(
      "Content-Security-Policy",
      frameAncestorsDirective(scene.allowedDomains),
    );
    return response;
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.next();
  }
}

function isSceneRead(pathname: string): boolean {
  return (
    pathname.startsWith("/embed/") ||
    pathname.startsWith("/s/") ||
    pathname.startsWith("/api/scenes/")
  );
}

function isReadMethod(method: string): boolean {
  return method === "GET" || method === "HEAD";
}

export const config = {
  matcher: ["/embed/:id*", "/s/:id*", "/api/scenes/:id*"],
};
