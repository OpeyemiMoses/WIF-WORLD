import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import {
  getWalletOnboarding,
  updateWalletOnboarding,
} from "@/lib/server/store";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet") ?? "";
  if (!wallet || !isAddress(wallet)) {
    return NextResponse.json(
      { error: "Valid EVM wallet address required" },
      { status: 400 }
    );
  }
  const onboarding = getWalletOnboarding(wallet);
  return NextResponse.json({ onboarding });
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

    const patch: {
      currentStep?: number;
      completed?: boolean;
      skipped?: boolean;
      selectedStartTileId?: number | null;
    } = {};

    if (typeof body.currentStep === "number") {
      patch.currentStep = Math.max(1, Math.min(7, Math.floor(body.currentStep)));
    }
    if (typeof body.completed === "boolean") {
      patch.completed = body.completed;
    }
    if (typeof body.skipped === "boolean") {
      patch.skipped = body.skipped;
    }
    if (
      typeof body.selectedStartTileId === "number" ||
      body.selectedStartTileId === null
    ) {
      patch.selectedStartTileId = body.selectedStartTileId;
    }

    const onboarding = updateWalletOnboarding(wallet, patch);
    return NextResponse.json({ onboarding });
  } catch {
    return NextResponse.json(
      { error: "Invalid onboarding payload" },
      { status: 400 }
    );
  }
}
