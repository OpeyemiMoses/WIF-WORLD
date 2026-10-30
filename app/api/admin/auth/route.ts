import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { isAuthorizedAdminAddress } from "@/lib/chain/robinhood";
import {
  buildAdminChallengeMessage,
  consumeAdminNonceAndCreateSession,
  issueAdminNonce,
  revokeAdminSessionToken,
  verifyAdminSessionToken,
} from "@/lib/server/store";

const SESSION_COOKIE = "wif_admin_session";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet") ?? "";
  const action = req.nextUrl.searchParams.get("action") ?? "status";

  if (!wallet || !isAuthorizedAdminAddress(wallet)) {
    return NextResponse.json(
      { authorized: false, authenticated: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  if (action === "challenge") {
    const nonceRecord = issueAdminNonce(wallet);
    if (!nonceRecord) {
      return NextResponse.json(
        { authorized: false, error: "Unauthorized wallet" },
        { status: 403 }
      );
    }
    const message = buildAdminChallengeMessage(wallet, nonceRecord.nonce);
    return NextResponse.json({
      authorized: true,
      nonce: nonceRecord.nonce,
      message,
      expiresAt: nonceRecord.expiresAt,
    });
  }

  // Check active session cookie
  const token =
    req.cookies.get(SESSION_COOKIE)?.value ||
    req.headers.get("x-admin-session");
  const session = verifyAdminSessionToken(token, wallet);

  return NextResponse.json({
    authorized: true,
    authenticated: Boolean(session),
    walletAddress: session?.walletAddress ?? wallet.toLowerCase(),
    expiresAt: session?.expiresAt ?? null,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const wallet = typeof body.wallet === "string" ? body.wallet : "";
    const nonce = typeof body.nonce === "string" ? body.nonce : "";
    const signature =
      typeof body.signature === "string"
        ? (body.signature as `0x${string}`)
        : null;

    if (!wallet || !isAuthorizedAdminAddress(wallet)) {
      return NextResponse.json(
        { error: "Unauthorized: wallet is not the designated Treasury Admin" },
        { status: 403 }
      );
    }

    if (!nonce || !signature) {
      return NextResponse.json(
        { error: "Missing nonce or cryptographic signature" },
        { status: 400 }
      );
    }

    const expectedMessage = buildAdminChallengeMessage(wallet, nonce);
    const isValidSig = await verifyMessage({
      address: wallet as `0x${string}`,
      message: expectedMessage,
      signature,
    });

    if (!isValidSig) {
      return NextResponse.json(
        { error: "Cryptographic signature verification failed" },
        { status: 401 }
      );
    }

    const session = consumeAdminNonceAndCreateSession(wallet, nonce);
    if (!session) {
      return NextResponse.json(
        { error: "Nonce expired, invalid, or already consumed" },
        { status: 401 }
      );
    }

    const res = NextResponse.json({
      authenticated: true,
      walletAddress: session.walletAddress,
      expiresAt: session.expiresAt,
      sessionToken: session.token,
    });

    res.cookies.set(SESSION_COOKIE, session.token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 12 * 60 * 60,
    });

    return res;
  } catch {
    return NextResponse.json(
      { error: "Failed to verify admin signature" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const token =
    req.cookies.get(SESSION_COOKIE)?.value ||
    req.headers.get("x-admin-session");
  revokeAdminSessionToken(token);

  const res = NextResponse.json({ authenticated: false });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
