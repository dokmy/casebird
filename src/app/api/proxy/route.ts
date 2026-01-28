import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");

  if (!rawUrl) {
    return new Response("Missing url parameter", { status: 400 });
  }

  // Clean and normalize the URL
  let url = rawUrl.trim();

  // Log for debugging
  console.log("Proxy received URL:", JSON.stringify(url), "Length:", url.length);

  // Ensure it's a valid HKLII URL (with or without www)
  const isValidHKLII = url.match(/^https?:\/\/(www\.)?hklii\.hk\//);
  if (!isValidHKLII) {
    console.log("Invalid URL rejected:", url);
    return new Response("Only HKLII URLs are allowed", { status: 403 });
  }

  // Normalize to www version
  url = url.replace(/^https?:\/\/hklii\.hk\//, "https://www.hklii.hk/");

  try {
    console.log("Proxy fetching URL:", url);

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      redirect: "follow", // Explicitly follow redirects
    });

    console.log("Proxy response status:", response.status, "Final URL:", response.url);

    if (!response.ok) {
      console.log("Proxy fetch failed:", response.status, response.statusText);
      return new Response(`Failed to fetch: ${response.status}`, {
        status: response.status,
      });
    }

    let html = await response.text();

    // Rewrite relative URLs to absolute
    html = html.replace(
      /(href|src)=["']\/(?!\/)/g,
      '$1="https://www.hklii.hk/'
    );

    // Add base tag to handle remaining relative URLs
    // Also inject script to neutralize history manipulation (Vue Router tries to use replaceState)
    const headInjection = `
      <base href="https://www.hklii.hk/" target="_blank">
      <script>
        // Neutralize history manipulation to prevent cross-origin errors in iframe
        (function() {
          var noop = function() { return true; };
          if (window.history) {
            window.history.pushState = noop;
            window.history.replaceState = noop;
          }
        })();
      </script>
    `;
    html = html.replace("<head>", `<head>${headInjection}`);

    // Add some custom styles for better readability
    const customStyles = `
      <style>
        body {
          max-width: 100% !important;
          padding: 20px !important;
          font-size: 14px !important;
          line-height: 1.6 !important;
        }
        .judgment-body {
          max-width: 100% !important;
        }
      </style>
    `;
    html = html.replace("</head>", `${customStyles}</head>`);

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // Remove X-Frame-Options to allow embedding
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
