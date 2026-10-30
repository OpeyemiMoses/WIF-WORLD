import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import {
  addWalletNotifications,
  getWalletNotifications,
  markWalletNotificationsRead,
  NotificationCategory,
} from "@/lib/server/store";

const VALID_CATEGORIES = new Set<NotificationCategory>([
  "Settlement",
  "Resources",
  "Progression",
  "World",
  "Social",
]);

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet") ?? "";
  if (!wallet || !isAddress(wallet)) {
    return NextResponse.json(
      { error: "Valid EVM wallet address required", notifications: [] },
      { status: 400 }
    );
  }
  const notifications = getWalletNotifications(wallet);
  return NextResponse.json({ notifications });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const wallet = typeof body.wallet === "string" ? body.wallet : "";
    if (!wallet || !isAddress(wallet)) {
      return NextResponse.json(
        { error: "Valid EVM wallet address required" },
        { status: 400 }
      );
    }

    const rawItems = Array.isArray(body.items) ? body.items : [];
    const sanitized = rawItems
      .filter(
        (item: Record<string, unknown>) =>
          item &&
          typeof item.title === "string" &&
          typeof item.message === "string" &&
          VALID_CATEGORIES.has(item.category as NotificationCategory)
      )
      .map((item: Record<string, unknown>) => ({
        dedupeKey:
          typeof item.dedupeKey === "string" ? item.dedupeKey : undefined,
        category: item.category as NotificationCategory,
        title: String(item.title).slice(0, 140),
        message: String(item.message).slice(0, 320),
        href: typeof item.href === "string" ? item.href : undefined,
        createdAt:
          typeof item.createdAt === "number" ? item.createdAt : undefined,
      }));

    const notifications = addWalletNotifications(wallet, sanitized);
    return NextResponse.json({ notifications });
  } catch {
    return NextResponse.json(
      { error: "Invalid notification payload" },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const wallet = typeof body.wallet === "string" ? body.wallet : "";
    if (!wallet || !isAddress(wallet)) {
      return NextResponse.json(
        { error: "Valid EVM wallet address required" },
        { status: 400 }
      );
    }

    const notificationId =
      typeof body.notificationId === "string" ? body.notificationId : undefined;
    const markAll = Boolean(body.markAll);

    const notifications = markWalletNotificationsRead(
      wallet,
      notificationId,
      markAll
    );
    return NextResponse.json({ notifications });
  } catch {
    return NextResponse.json(
      { error: "Invalid notification update payload" },
      { status: 400 }
    );
  }
}

