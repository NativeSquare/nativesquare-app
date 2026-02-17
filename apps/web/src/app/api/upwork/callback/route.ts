import { NextRequest, NextResponse } from "next/server";

/**
 * Upwork OAuth2 Callback Endpoint
 *
 * This route handles the OAuth2 Authorization Code Grant callback from Upwork.
 *
 * Flow:
 * 1. User is redirected to Upwork's authorization URL to grant access
 * 2. Upwork redirects back here with an authorization `code` (and optional `state`)
 * 3. We exchange the `code` for an access_token + refresh_token
 * 4. We store the tokens and redirect the user back into the app
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

  // Handle error response from Upwork
  if (error) {
    const errorDescription = searchParams.get("error_description") ?? "Unknown error";
    console.error("[Upwork OAuth] Authorization error:", error, errorDescription);
    // TODO: Redirect to a proper error page in the app
    return NextResponse.redirect(
      new URL(`/dashboard?upwork_error=${encodeURIComponent(errorDescription)}`, request.url),
    );
  }

  // Validate the authorization code is present
  if (!code) {
    console.error("[Upwork OAuth] Missing authorization code in callback");
    return NextResponse.json(
      { error: "Missing authorization code" },
      { status: 400 },
    );
  }

  // TODO: Validate the `state` parameter against what was stored in the session
  // to prevent CSRF attacks. For now, we just log it.
  if (state) {
    console.log("[Upwork OAuth] Received state:", state);
  }

  try {
    // Exchange the authorization code for access + refresh tokens
    const clientId = process.env.UPWORK_CLIENT_ID;
    const clientSecret = process.env.UPWORK_CLIENT_SECRET;
    const redirectUri = process.env.UPWORK_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      console.error("[Upwork OAuth] Missing environment variables: UPWORK_CLIENT_ID, UPWORK_CLIENT_SECRET, or UPWORK_REDIRECT_URI");
      return NextResponse.json(
        { error: "Server misconfiguration — missing Upwork OAuth credentials" },
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
      console.error("[Upwork OAuth] Token exchange failed:", tokenResponse.status, errorBody);
      return NextResponse.json(
        { error: "Failed to exchange authorization code for tokens" },
        { status: 502 },
      );
    }

    const tokenData = await tokenResponse.json();

    // tokenData should contain:
    // - access_token: string
    // - refresh_token: string
    // - token_type: "Bearer"
    // - expires_in: number (seconds)
    console.log("[Upwork OAuth] Token exchange successful. Token type:", tokenData.token_type);

    // TODO: Store the access_token and refresh_token securely.
    // Options include:
    //   - Saving to the Convex backend (via a mutation) linked to the current user
    //   - Storing in an encrypted HTTP-only cookie
    //   - Persisting in a server-side session store
    //
    // Example Convex mutation call:
    //   await convexClient.mutation(api.upwork.storeTokens, {
    //     accessToken: tokenData.access_token,
    //     refreshToken: tokenData.refresh_token,
    //     expiresIn: tokenData.expires_in,
    //   });

    // Redirect the user back to the dashboard with a success indicator
    return NextResponse.redirect(
      new URL("/dashboard?upwork_connected=true", request.url),
    );
  } catch (err) {
    console.error("[Upwork OAuth] Unexpected error during token exchange:", err);
    return NextResponse.json(
      { error: "Internal server error during Upwork OAuth callback" },
      { status: 500 },
    );
  }
}
