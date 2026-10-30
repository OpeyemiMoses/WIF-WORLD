import { NextRequest, NextResponse } from "next/server";
import {
  appendAdminAuditEntry,
  getAdminAuditLog,
  getConfiguredWorldEvents,
  upsertConfiguredWorldEvent,
  verifyAdminSessionToken,
} from "@/lib/server/store";

const SESSION_COOKIE = "wif_admin_session";

function requireAdminSession(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet") ?? undefined;
  const token =
    req.cookies.get(SESSION_COOKIE)?.value ||
    req.headers.get("x-admin-session");
  return verifyAdminSessionToken(token, wallet);
}

export async function GET(req: NextRequest) {
  const session = requireAdminSession(req);
  if (!session) {
    return NextResponse.json(
      { error: "Forbidden — active Treasury Admin session required" },
      { status: 403 }
    );
  }

  return NextResponse.json({
    auditLog: getAdminAuditLog(),
    configuredEvents: getConfiguredWorldEvents(),
  });
}

export async function POST(req: NextRequest) {
  const session = requireAdminSession(req);
  if (!session) {
    return NextResponse.json(
      { error: "Forbidden — active Treasury Admin session required" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();

    if (body.kind === "configure_event" && body.eventMeta) {
      const m = body.eventMeta;
      const saved = upsertConfiguredWorldEvent(
        {
          eventId: Number(m.eventId) || 1,
          title: String(m.title || "The Great Bridge"),
          subtitle: String(
            m.subtitle || "Spanning the Northern River Strait"
          ),
          story: String(m.story || ""),
          targetRegionId: Number(m.targetRegionId ?? 1),
          targetRegionName: String(m.targetRegionName || "The Wild Frontier"),
          targetTileId: Number(m.targetTileId ?? 3),
          targetWifDisplay: String(m.targetWifDisplay || "500"),
          requiredMaterials: {
            wood: Number(m.requiredMaterials?.wood ?? 1200),
            stone: Number(m.requiredMaterials?.stone ?? 900),
            food: Number(m.requiredMaterials?.food ?? 600),
          },
          unlockReward: String(
            m.unlockReward || "Unlocks Region 2: The Wild Frontier"
          ),
          active: Boolean(m.active ?? true),
          completed: Boolean(m.completed ?? false),
        },
        session.walletAddress,
        typeof body.txHash === "string" ? body.txHash : undefined
      );

      return NextResponse.json({
        configuredEvent: saved,
        auditLog: getAdminAuditLog(),
      });
    }

    const entry = appendAdminAuditEntry({
      walletAddress: session.walletAddress,
      action: String(body.action || "Admin Operation").slice(0, 140),
      category:
        body.category === "event" ||
        body.category === "world" ||
        body.category === "treasury" ||
        body.category === "settings"
          ? body.category
          : "settings",
      details: String(body.details || "").slice(0, 320),
      txHash: typeof body.txHash === "string" ? body.txHash : undefined,
    });

    return NextResponse.json({
      entry,
      auditLog: getAdminAuditLog(),
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid admin audit request" },
      { status: 400 }
    );
  }
}
