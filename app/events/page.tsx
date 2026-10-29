"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Compass,
  ExternalLink,
  Flame,
  Info,
  Loader2,
  Lock,
  MapPin,
  Shield,
  Sparkles,
  X,
} from "lucide-react";
import { WifTokenEmblem } from "@/components/brand/WifWorldsLogo";
import { TransactionStatusCallout } from "@/components/build/BuildActionModal";
import { FeatureFooterStrip } from "@/components/layout/FeatureFooterStrip";
import {
  explorerAddressUrl,
  explorerTxUrl,
  ROBINHOOD_CHAIN_ID,
} from "@/lib/chain/robinhood";
import {
  useRobinhoodWallet,
  useWorldActionExecutor,
  useWorldData,
} from "@/lib/contract/useWorldState";
import { formatCoords } from "@/lib/game/worldData";
import {
  cn,
  formatCountdown,
  formatWif,
  parseWifInput,
  shortenAddress,
} from "@/lib/utils";

const PRESET_AMOUNTS = ["5", "10", "25", "50"];

export default function WorldEventsPage() {
  const [contributeModalOpen, setContributeModalOpen] = useState(false);
  const [amountInput, setAmountInput] = useState("10");

  const {
    address,
    isConnected,
    isWrongNetwork,
    switchToRobinhood,
    isSwitchingChain,
    wifBalance,
    ethBalance,
    wifAllowance,
    refetchBalances,
  } = useRobinhoodWallet();

  const {
    isContractDeployed,
    treasuryAddress,
    worldEvent,
    activities,
    isLoadingLogs,
    refreshAllWorldState,
  } = useWorldData(address);

  const handleFullRefresh = async () => {
    await Promise.all([refreshAllWorldState(), refetchBalances()]);
  };

  const {
    stage,
    txHash,
    errorMessage,
    stepLabel,
    resetTxState,
    approveExactWif,
    executeGameAction,
  } = useWorldActionExecutor(handleFullRefresh);

  const eventContributions = useMemo(
    () => activities.filter((a) => a.kind === "event"),
    [activities]
  );

  const progressRatio = useMemo(() => {
    if (worldEvent.targetAmount <= 0n) return 0;
    const ratio =
      Number((worldEvent.totalContributed * 10000n) / worldEvent.targetAmount) /
      10000;
    return Math.min(1, Math.max(0, ratio));
  }, [worldEvent.targetAmount, worldEvent.totalContributed]);

  const parsedAmount = useMemo(() => parseWifInput(amountInput), [amountInput]);
  const hasEnoughWif = Boolean(parsedAmount && wifBalance >= parsedAmount);
  const hasAllowance = Boolean(parsedAmount && wifAllowance >= parsedAmount);
  const isBusy =
    stage === "awaiting_wallet" ||
    stage === "submitted" ||
    stage === "pending" ||
    stage === "refreshing";

  const canSubmitContribution =
    isContractDeployed &&
    worldEvent.active &&
    !worldEvent.completed &&
    isConnected &&
    !isWrongNetwork &&
    Boolean(parsedAmount) &&
    hasEnoughWif &&
    ethBalance > 0n &&
    !isBusy;

  const handleContributeSubmit = async () => {
    if (!parsedAmount) return;
    if (isWrongNetwork) {
      await switchToRobinhood();
      return;
    }
    if (!canSubmitContribution) return;

    if (!hasAllowance) {
      await approveExactWif(parsedAmount);
      return;
    }

    await executeGameAction({
      action: "event",
      eventId: worldEvent.id,
      amount: parsedAmount,
    });
  };

  return (
    <main className="flex-1 flex flex-col bg-obsidian">
      <div className="mx-auto w-full max-w-[1440px] flex-1 px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* HERO ACTIVE EVENT BANNER — Matches Panel 4 Reference */}
        <section className="relative overflow-hidden rounded-3xl border border-white/[0.1] bg-[#111514] shadow-panel">
          {/* Citadel Artwork + Crimson Beacon Light Pillar on Right */}
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-right bg-no-repeat opacity-85"
            style={{
              backgroundImage: "url('/art/hero-kingdom.jpg')",
            }}
          />

          {/* Towering Crimson Beacon Beam Overlay */}
          <div
            className="pointer-events-none absolute right-[18%] sm:right-[22%] inset-y-0 w-16 sm:w-24 opacity-85"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(230,57,70,0.28) 32%, rgba(255,77,90,0.85) 50%, rgba(230,57,70,0.28) 68%, transparent 100%)",
              filter: "blur(3px)",
            }}
          />
          <div className="pointer-events-none absolute right-[21%] sm:right-[24.6%] inset-y-0 w-1.5 bg-gradient-to-t from-amber-200 via-crimson-accent to-transparent opacity-90" />

          {/* Dark Left Gradient Overlay for Crisp Readability */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, #0E1211 0%, rgba(14,18,17,0.95) 44%, rgba(14,18,17,0.58) 74%, rgba(14,18,17,0.28) 100%)",
            }}
          />

          <div className="relative z-10 p-6 sm:p-10 lg:p-12 max-w-2xl space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-crimson/40 bg-crimson-muted/60 px-3 py-1 text-xs font-semibold text-crimson-accent">
                <span className="h-2 w-2 rounded-full bg-crimson-accent animate-pulse" />
                {worldEvent.completed
                  ? "Event Completed"
                  : isContractDeployed && worldEvent.active
                  ? "Active Event"
                  : "Regional Objective (Awaiting Deploy)"}
              </span>

              <Link
                href="/world"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-obsidian/75 px-3 py-1 text-xs font-medium text-ink-secondary hover:text-white transition-colors"
              >
                <MapPin className="h-3.5 w-3.5 text-crimson-accent" />
                <span>
                  Northern Mountain • Tile {formatCoords(worldEvent.targetTileId)}
                </span>
              </Link>
            </div>

            <div className="space-y-2.5">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-ink-primary">
                {worldEvent.title}
              </h1>
              <p className="text-sm sm:text-base leading-relaxed text-ink-secondary max-w-xl">
                The community is raising the Northern Beacon at Heartlands{" "}
                <span className="font-mono text-ink-primary">(3, 0)</span>.
                Reaching <span className="font-semibold text-ink-primary">100%</span>{" "}
                automatically unlocks{" "}
                <span className="font-semibold text-crimson-accent">
                  Region 1: The Wild Frontier (49 new tiles)
                </span>{" "}
                onchain for every builder.
              </p>
            </div>

            {/* Verified Progress Bar */}
            <div className="space-y-2.5 max-w-lg pt-1">
              <div className="h-3 w-full overflow-hidden rounded-full bg-white/[0.09] p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-crimson via-crimson-accent to-amber-300 transition-all duration-500"
                  style={{
                    width: `${Math.max(
                      progressRatio > 0 ? 3 : 0,
                      Math.round(progressRatio * 100)
                    )}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-xs sm:text-sm">
                <div className="inline-flex items-center gap-2 font-mono font-bold text-ink-primary">
                  <WifTokenEmblem className="w-4 h-4" />
                  <span>
                    {formatWif(worldEvent.totalContributed, 0)} /{" "}
                    {formatWif(worldEvent.targetAmount, 0)} $WIF
                  </span>
                </div>
                <span className="text-ink-muted font-medium">
                  {worldEvent.completed
                    ? "100% Complete"
                    : worldEvent.deadline > 0
                    ? formatCountdown(worldEvent.deadline)
                    : isContractDeployed
                    ? `${Math.round(progressRatio * 100)}% Funded`
                    : "0% (Genesis State)"}
                </span>
              </div>
            </div>

            {/* Primary Contribute Action */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  resetTxState();
                  setContributeModalOpen(true);
                }}
                disabled={worldEvent.completed}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-crimson-accent to-crimson px-7 py-3.5 text-sm font-bold text-white shadow-crimson hover:brightness-110 disabled:opacity-50 transition-all"
              >
                <Flame className="h-4 w-4" />
                <span>
                  {worldEvent.completed ? "Objective Completed" : "Contribute"}
                </span>
              </button>

              {treasuryAddress && (
                <a
                  href={explorerAddressUrl(treasuryAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-obsidian/70 px-4 py-3.5 text-xs font-medium text-ink-secondary hover:text-white transition-colors"
                >
                  <span>Treasury: {shortenAddress(treasuryAddress)}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        </section>

        {/* BOTTOM TWO-COLUMN SECTION: Recent Contributors + Planned World Phases */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left (7 cols): Verified Onchain Contributors */}
          <div className="lg:col-span-7 rounded-2xl border border-white/[0.08] bg-[#121615] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-ink-primary">
                  Recent Contributors
                </h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  Verified directly from EventContribution contract logs on
                  Robinhood Chain
                </p>
              </div>
              <span className="rounded-lg border border-white/[0.07] bg-obsidian px-2.5 py-1 font-mono text-xs text-ink-secondary">
                {eventContributions.length} verified
              </span>
            </div>

            {isLoadingLogs ? (
              <div className="flex items-center justify-center gap-2 py-12 text-xs text-ink-muted">
                <Loader2 className="h-4 w-4 animate-spin text-crimson-accent" />
                <span>Reading verified event logs from Robinhood Chain...</span>
              </div>
            ) : eventContributions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/[0.09] bg-obsidian/50 p-8 text-center space-y-2">
                <Flame className="mx-auto h-7 w-7 text-crimson-accent/70" />
                <div className="text-sm font-semibold text-ink-primary">
                  No verified contributions recorded yet
                </div>
                <p className="text-xs text-ink-muted max-w-md mx-auto leading-relaxed">
                  {isContractDeployed
                    ? "Be the first builder to contribute $WIF toward the Northern Beacon. Every confirmed contribution appears here with a Blockscout transaction link."
                    : "Once WIFWorlds.sol is deployed to Robinhood Chain, real player $WIF contributions and Blockscout transaction links appear here."}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.06]">
                {eventContributions.slice(0, 12).map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 py-3.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-crimson/35 bg-crimson/15 font-mono text-[11px] font-bold text-crimson-accent">
                        {item.player.slice(2, 4).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/profile/${item.player}`}
                          className="font-mono text-xs sm:text-sm font-semibold text-ink-primary hover:text-crimson-accent transition-colors"
                        >
                          {shortenAddress(item.player, 5)}
                        </Link>
                        <div className="font-mono text-[11px] text-ink-dim">
                          Block #{item.blockNumber.toString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <span className="font-mono text-xs sm:text-sm font-bold text-emerald-400">
                        +{formatWif(item.wifAmount, 2)} $WIF
                      </span>
                      <a
                        href={explorerTxUrl(item.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-crimson-accent hover:underline"
                      >
                        <span>View Tx</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Right (5 cols): Future Regional Objectives Roadmap */}
          <div className="lg:col-span-5 rounded-2xl border border-white/[0.08] bg-[#121615] p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-ink-primary">
                Upcoming Events
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Planned regional world phases following the Northern Beacon
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  icon: Compass,
                  title: "Eastern Frontier Expansion",
                  region: "Eastern Ironreach",
                  phase: "Phase II Roadmap",
                  description:
                    "Open high-ridge supply bridges connecting eastern mountain outposts to the central crucible.",
                },
                {
                  icon: Shield,
                  title: "Storm Preparation",
                  region: "Western Mistcoast",
                  phase: "Phase III Roadmap",
                  description:
                    "Coordinate coastal bastion reinforcements with established Settlement wardens across the archipelago.",
                },
                {
                  icon: Sparkles,
                  title: "Ember Crucible Awakening",
                  region: "Central Landmark (3, 3)",
                  phase: "Seasonal Milestone",
                  description:
                    "Unite regional Signal Beacons across the 7 × 7 realm to illuminate the central sanctuary.",
                },
              ].map((ev) => {
                const Icon = ev.icon;
                return (
                  <div
                    key={ev.title}
                    className="rounded-xl border border-white/[0.07] bg-obsidian/70 p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-[#181D1B] text-crimson-accent">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-ink-primary">
                            {ev.title}
                          </h3>
                          <p className="text-[11px] text-ink-muted">
                            {ev.region}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full border border-white/[0.08] bg-[#161A19] px-2.5 py-0.5 text-[10px] font-semibold text-ink-muted">
                        {ev.phase}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-ink-secondary">
                      {ev.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* Contribution Modal */}
      {contributeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/[0.1] bg-[#111514] p-6 shadow-panel space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-crimson-accent">
                  Community Construction
                </span>
                <h2 className="text-xl font-bold text-ink-primary mt-0.5">
                  Contribute to {worldEvent.title}
                </h2>
              </div>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => setContributeModalOpen(false)}
                className="rounded-lg p-1.5 text-ink-muted hover:bg-white/[0.06] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-secondary font-semibold">
                  Contribution Amount ($WIF)
                </span>
                <span className="font-mono text-ink-muted">
                  Balance: {isConnected ? formatWif(wifBalance, 2) : "—"} $WIF
                </span>
              </div>

              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={amountInput}
                  onChange={(e) => {
                    setAmountInput(e.target.value);
                    resetTxState();
                  }}
                  placeholder="50"
                  className="w-full rounded-xl border border-white/[0.12] bg-obsidian px-4 py-3.5 pr-20 font-mono text-lg font-bold text-ink-primary focus:border-crimson-accent focus:outline-none"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 font-mono text-xs font-bold text-ink-secondary">
                  <WifTokenEmblem className="w-4 h-4" />
                  $WIF
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {PRESET_AMOUNTS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setAmountInput(preset);
                      resetTxState();
                    }}
                    className={cn(
                      "rounded-lg border py-1.5 font-mono text-xs font-semibold transition-colors",
                      amountInput === preset
                        ? "border-crimson-accent bg-crimson/20 text-crimson-accent"
                        : "border-white/[0.08] bg-obsidian/70 text-ink-secondary hover:text-white"
                    )}
                  >
                    {preset} $WIF
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/[0.07] bg-obsidian/70 p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-ink-muted">Target Tile</span>
                <span className="font-mono text-ink-primary">
                  Northern Spire {formatCoords(worldEvent.targetTileId)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Network</span>
                <span className="text-ink-primary">
                  Robinhood Chain ({ROBINHOOD_CHAIN_ID})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Gas Fee</span>
                <span className="text-ink-secondary">Paid separately in ETH</span>
              </div>
            </div>

            <TransactionStatusCallout
              stage={stage}
              txHash={txHash}
              errorMessage={errorMessage}
              stepLabel={stepLabel}
              onRetry={resetTxState}
            />

            {!isContractDeployed ? (
              <button
                type="button"
                disabled
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#1B201E] py-3.5 text-sm font-semibold text-ink-muted cursor-not-allowed"
              >
                <Lock className="h-4 w-4" />
                <span>Awaiting WIFWorlds Contract Deployment</span>
              </button>
            ) : !isConnected ? (
              <div className="rounded-xl border border-white/[0.08] bg-obsidian p-3 text-center text-xs text-ink-secondary">
                Connect your wallet in the top navigation bar to contribute $WIF.
              </div>
            ) : isWrongNetwork ? (
              <button
                type="button"
                onClick={switchToRobinhood}
                disabled={isSwitchingChain}
                className="w-full rounded-xl bg-gradient-to-b from-crimson-accent to-crimson py-3.5 text-sm font-bold text-white shadow-crimson"
              >
                {isSwitchingChain ? "Switching..." : "Switch to Robinhood Chain"}
              </button>
            ) : (
              <button
                type="button"
                disabled={!canSubmitContribution}
                onClick={handleContributeSubmit}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all",
                  canSubmitContribution
                    ? "bg-gradient-to-b from-crimson-accent to-crimson text-white shadow-crimson hover:brightness-110"
                    : "border border-white/[0.08] bg-[#1B201E] text-ink-muted cursor-not-allowed"
                )}
              >
                {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>
                  {!parsedAmount
                    ? "Enter Valid $WIF Amount"
                    : !hasEnoughWif
                    ? "Insufficient $WIF Balance"
                    : ethBalance === 0n
                    ? "Insufficient ETH for Gas"
                    : !hasAllowance
                    ? `Step 1: Approve ${amountInput} $WIF`
                    : `Confirm ${amountInput} $WIF Contribution`}
                </span>
              </button>
            )}

            <div className="flex items-start gap-2 text-[11px] text-ink-dim">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-ink-muted" />
              <span>
                Contributions are recorded onchain and advance the Beacon progress
                only after transaction confirmation.
              </span>
            </div>
          </div>
        </div>
      )}

      <FeatureFooterStrip />
    </main>
  );
}

