import { api } from "@packages/backend/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { NextRequest, NextResponse } from "next/server";

/**
 * Upwork OAuth2 Callback Endpoint
 *
 * Callback URL: /api/upwork/callback
 * Set UPWORK_REDIRECT_URI to your app origin + this path (e.g. https://yourapp.com/api/upwork/callback).
 *
 * Flow:
 * 1. User is redirected to Upwork's authorization URL to grant access
 * 2. Upwork redirects back here with an authorization `code` (and optional `state`)
 * 3. We exchange the `code` for an access_token + refresh_token
 * 4. We store the tokens in Convex (via storeTokens mutation) and redirect the user back
 *
 * Upwork OAuth2 endpoints:
 * - Authorization: https://www.upwork.com/ab/account-security/oauth2/authorize
 * - Token exchange: https://www.upwork.com/api/v3/oauth2/token
 *
 * @see https://developer.upwork.com/
 * @see https://support.upwork.com/hc/en-us/articles/115015933448
 */

const UPWORK_TOKEN_URL = "https://www.upwork.com/api/v3/oauth2/token";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Debug: log full URL received (code is one-time use; helps see if param was stripped)
  const fullUrl = request.url;
  const receivedParams = Object.fromEntries(
    Array.from(searchParams.entries()).filter(([k]) => k !== "code"),
  );
  if (!code) {
    console.error(
      "[Upwork OAuth] Callback without code. Full URL:",
      fullUrl,
      "Query params (excluding code):",
      receivedParams,
    );
  }

  // Handle error response from Upwork
  if (error) {
    const errorDescription =
      searchParams.get("error_description") ?? "Unknown error";
    console.error(
      "[Upwork OAuth] Authorization error:",
      error,
      errorDescription,
    );
    return NextResponse.redirect(
      new URL(
        `/dashboard/upwork?upwork_error=${encodeURIComponent(errorDescription)}`,
        request.url,
      ),
    );
  }

  if (!code) {
    const upworkError = searchParams.get("error");
    const upworkErrorDesc = searchParams.get("error_description");
    return NextResponse.json(
      {
        error: "Missing authorization code",
        receivedParams: receivedParams,
        upworkError: upworkError ?? undefined,
        upworkErrorDescription: upworkErrorDesc ?? undefined,
        hint:
          "Upwork did not include the authorization code. Check server logs for the full callback URL. Common causes: (1) Redirect URI must match exactly in Upwork Developer Portal (e.g. " +
          (process.env.UPWORK_REDIRECT_URI ?? "UPWORK_REDIRECT_URI") +
          "). (2) A proxy/WAF may be stripping the 'code' query parameter.",
      },
      { status: 400 },
    );
  }

  if (!state) {
    console.error("[Upwork OAuth] Missing state in callback");
    return NextResponse.json(
      { error: "Missing state parameter" },
      { status: 400 },
    );
  }

  try {
    const clientId = process.env.UPWORK_CLIENT_ID;
    const clientSecret = process.env.UPWORK_CLIENT_SECRET;
    const redirectUri = process.env.UPWORK_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      console.error(
        "[Upwork OAuth] Missing env: UPWORK_CLIENT_ID, UPWORK_CLIENT_SECRET, or UPWORK_REDIRECT_URI",
      );
      return NextResponse.json(
        {
          error:
            "Server misconfiguration — missing Upwork OAuth credentials",
        },
        { status: 500 },
      );
    }

    const tokenResponse = await fetch(UPWORK_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error(
        "[Upwork OAuth] Token exchange failed:",
        tokenResponse.status,
        errorBody,
      );
      return NextResponse.redirect(
        new URL(
          `/dashboard/upwork?upwork_error=${encodeURIComponent("Token exchange failed")}`,
          request.url,
        ),
      );
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      console.error("[Upwork OAuth] NEXT_PUBLIC_CONVEX_URL not set");
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 },
      );
    }

    const convex = new ConvexHttpClient(convexUrl);
    await convex.mutation(api.upwork.storeTokens, {
      state,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
    });

    return NextResponse.redirect(
      new URL("/dashboard/upwork?upwork_connected=true", request.url),
    );
  } catch (err) {
    console.error("[Upwork OAuth] Error:", err);
    return NextResponse.redirect(
      new URL(
        `/dashboard/upwork?upwork_error=${encodeURIComponent(err instanceof Error ? err.message : "Unknown error")}`,
        request.url,
      ),
    );
  }
}
