import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");

  if (!rawUrl) {
    return new Response("Missing url parameter", { status: 400 });
  }

  const url = rawUrl.trim().replace(/[\u200B-\u200D\uFEFF]/g, "");

  // Ensure it's a valid HKLII URL
  if (!url.match(/^https?:\/\/(www\.)?hklii\.hk\//)) {
    return new Response("Only HKLII URLs are allowed", { status: 403 });
  }

  // Extract the path from the URL (e.g. /en/cases/hkcfi/2005/1126)
  const pathMatch = url.match(/hklii\.hk(\/.*)/);
  if (!pathMatch) {
    return new Response("Could not parse URL path", { status: 400 });
  }
  const casePath = pathMatch[1]; // e.g. /en/cases/hkcfi/2005/1126

  try {
    // Fetch the HKLII SPA shell HTML
    const normalizedUrl = url.replace(
      /^https?:\/\/hklii\.hk\//,
      "https://www.hklii.hk/"
    );

    const response = await fetch(normalizedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      return new Response(`Failed to fetch: ${response.status}`, {
        status: response.status,
      });
    }

    let html = await response.text();

    // Inject a script BEFORE anything else that:
    // 1. Sets window.location.pathname to the correct HKLII path (so Vue Router matches the route)
    // 2. Stubs history methods after Vue Router initializes to prevent cross-origin errors
    const injection = `<script>
// Set the correct path for Vue Router before it initializes
try { history.replaceState(null, '', '${casePath}'); } catch(e) {}

// After Vue Router reads the path and does its initial replaceState, stub to prevent errors
var _origReplace = history.replaceState.bind(history);
var _origPush = history.pushState.bind(history);
var _callCount = 0;
history.replaceState = function() {
  _callCount++;
  // Allow Vue Router's initial replaceState, then block subsequent ones
  if (_callCount <= 2) {
    try { return _origReplace.apply(history, arguments); } catch(e) {}
  }
};
history.pushState = function() {
  try { return _origPush.apply(history, arguments); } catch(e) {}
};
</script>`;

    html = html.replace("<head>", `<head>${injection}`);

    // Remove X-Frame-Options if present in the HTML (it's in HTTP headers, but just in case)
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(
      `Proxy error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 }
    );
  }
}
