import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy endpoint for Judge0 code execution.
 *
 * This allows the browser to call Judge0 through the Next.js backend,
 * avoiding CORS issues and hiding the Judge0 server IP from the client.
 *
 * All requests are forwarded to the private Judge0 URL configured in
 * the server-side JUDGE0_URL environment variable.
 */

const JUDGE0_URL = process.env.JUDGE0_URL || "";

export async function POST(req: NextRequest) {
  if (!JUDGE0_URL) {
    return NextResponse.json(
      { error: "Judge0 is not configured on the server" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();

    // Forward the submission request to Judge0
    // The client will send the same payload they would normally send to Judge0
    const judge0Res = await fetch(
      `${JUDGE0_URL}/submissions?base64_encoded=true&wait=true`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!judge0Res.ok) {
      const text = await judge0Res.text();
      return NextResponse.json(
        { error: `Judge0 request failed: ${text}` },
        { status: judge0Res.status }
      );
    }

    const data = await judge0Res.json();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Proxy error: ${message}` },
      { status: 500 }
    );
  }
}
