"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Castle,
  CheckCheck,
  Flame,
  Sparkles,
  Trees,
  Users,
} from "lucide-react";
import { useRobinhoodWallet, useWorldData } from "@/lib/contract/useWorldState";
import { formatCoords, STRUCTURE_META } from "@/lib/game/worldData";
import { cn, formatWif, shortenAddress } from "@/lib/utils";

export type NotificationCategory =
  | "Settlement"
  | "Resources"
  | "Progression"
  | "World"
  | "Social";

export interface ClientNotificationItem {
  id: string;
  dedupeKey?: string;
  walletAddress: string;
  category: NotificationCategory;
  title: string;
  message: string;
  href?: string;
  read: boolean;
  createdAt: number;
}

const CATEGORIES: Array<"All" | NotificationCategory> = [
  "All",
  "Settlement",
  "Resources",
  "Progression",
  "World",
  "Social",
];

export function NotificationCenter() {
  const { address, isConnected } = useRobinhoodWallet();
  const { activities, playerStats, missions, worldEvent } = useWorldData(
    address,
    0
  );

  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<
    "All" | NotificationCategory
  >("All");
  const [notifications, setNotifications] = useState<ClientNotificationItem[]>(
    []
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const syncedKeysRef = useRef<Set<string>>(new Set());

  // Close dropdown on click outside
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  // Load wallet-isolated notifications when wallet changes
  const fetchNotifications = useCallback(async (walletAddr: string) => {
    try {
      const res = await fetch(
        `/api/notifications?wallet=${encodeURIComponent(walletAddr)}`
      );
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
      }
    } catch {
      // Ignore network errors
    }
  }, []);

  useEffect(() => {
    syncedKeysRef.current.clear();
    if (!isConnected || !address) {
      setNotifications([]);
      return;
    }
    fetchNotifications(address);
  }, [address, fetchNotifications, isConnected]);

  // Synchronize verified onchain events & progression into persistent wallet notifications
  useEffect(() => {
    if (!isConnected || !address) return;
    const norm = address.toLowerCase();

    const candidateItems: Array<{
      dedupeKey: string;
      category: NotificationCategory;
      title: string;
      message: string;
      href?: string;
      createdAt?: number;
    }> = [];

    // Welcome pioneer notification for connected wallet
    candidateItems.push({
      dedupeKey: `welcome:${norm}`,
      category: "Progression",
      title: "Pioneer Charter Registered",
      message:
        "Your wallet is linked to WIF WORLDS on Robinhood Chain. Claim a Heartlands tile to receive your starter material cache.",
      href: "/world",
    });

    // Warehouse capacity warning or production milestone
    const totalRes =
      playerStats.wood + playerStats.stone + playerStats.food;
    if (
      playerStats.tilesClaimed > 0 &&
      (playerStats.wood >= playerStats.storageCap ||
        playerStats.stone >= playerStats.storageCap ||
        playerStats.food >= playerStats.storageCap)
    ) {
      candidateItems.push({
        dedupeKey: `warehouse-cap:${norm}:${playerStats.storageCap}`,
        category: "Resources",
        title: "Settlement Warehouse Full",
        message: `One or more resources reached your storage cap (${playerStats.storageCap}). Upgrade a Settlement Hall or build a Workshop to expand capacity.`,
        href: "/world",
      });
    } else if (totalRes >= 300 && playerStats.tilesClaimed > 0) {
      candidateItems.push({
        dedupeKey: `resources-ready:${norm}`,
        category: "Resources",
        title: "Construction Materials Stockpiled",
        message: `Your warehouse holds ${Math.floor(playerStats.wood)}W, ${Math.floor(
          playerStats.stone
        )}S, and ${Math.floor(
          playerStats.food
        )}F — ready for structure construction or Hall upgrades.`,
        href: "/world",
      });
    }

    // Completed missions
    for (const m of missions) {
      if (m.completed) {
        candidateItems.push({
          dedupeKey: `mission:${norm}:${m.id}`,
          category: "Progression",
          title: `Mission Completed: ${m.title}`,
          message: `Unlocked: ${m.rewardLabel}`,
          href: "/missions",
        });
      }
    }

    // Active World Event notification
    if (worldEvent.active && !worldEvent.completed) {
      candidateItems.push({
        dedupeKey: `world-event-active:${worldEvent.id}`,
        category: "World",
        title: `Active World Event: ${worldEvent.title}`,
        message:
          "Contribute $WIF to The Great Bridge at Tile (3, 0) to help unlock Region 2: The Wild Frontier.",
        href: "/events",
      });
    } else if (worldEvent.completed) {
      candidateItems.push({
        dedupeKey: `world-event-complete:${worldEvent.id}`,
        category: "World",
        title: `${worldEvent.title} Completed!`,
        message:
          "The community completed the regional milestone! Region 2: The Wild Frontier is now unlocked.",
        href: "/events",
      });
    }

    // Verified blockchain activity notifications (yours + nearby neighbors)
    for (const act of activities.slice(0, 25)) {
      const isActorYou = act.player.toLowerCase() === norm;
      if (isActorYou) {
        if (act.kind === "claim") {
          candidateItems.push({
            dedupeKey: `tx:${act.id}`,
            category: "Settlement",
            title: `Land Claimed at ${formatCoords(act.tileId ?? 0)}`,
            message: `Your claim transaction was confirmed on Robinhood Chain.`,
            href: "/world",
            createdAt: act.timestamp,
          });
        } else if (act.kind === "settlement") {
          candidateItems.push({
            dedupeKey: `tx:${act.id}`,
            category: "Settlement",
            title: `Settlement Founded at ${formatCoords(act.tileId ?? 0)}`,
            message: `Your Settlement Hall (Lv. 1) now stands on The Living Map.`,
            href: "/world",
            createdAt: act.timestamp,
          });
        } else if (act.kind === "upgrade") {
          candidateItems.push({
            dedupeKey: `tx:${act.id}`,
            category: "Settlement",
            title: `Settlement Upgraded to Lv. ${act.newLevel}`,
            message: `Tile ${formatCoords(
              act.tileId ?? 0
            )} reached Level ${act.newLevel}.`,
            href: "/world",
            createdAt: act.timestamp,
          });
        } else if (act.kind === "structure") {
          const sName = act.structureType
            ? STRUCTURE_META[act.structureType].name
            : "Structure";
          candidateItems.push({
            dedupeKey: `tx:${act.id}`,
            category: "Resources",
            title: `${sName} Constructed`,
            message: `${sName} is now active at ${formatCoords(
              act.tileId ?? 0
            )}.`,
            href: "/world",
            createdAt: act.timestamp,
          });
        } else if (act.kind === "event") {
          candidateItems.push({
            dedupeKey: `tx:${act.id}`,
            category: "World",
            title: `World Event Contribution Confirmed`,
            message: `You contributed ${formatWif(
              act.wifAmount,
              2
            )} $WIF to ${worldEvent.title}.`,
            href: "/events",
            createdAt: act.timestamp,
          });
        }
      } else if (act.kind === "settlement" || act.kind === "event") {
        candidateItems.push({
          dedupeKey: `social:${act.id}`,
          category: "Social",
          title:
            act.kind === "settlement"
              ? "Neighbor Founded a Settlement"
              : "Community Event Contribution",
          message:
            act.kind === "settlement"
              ? `${shortenAddress(
                  act.player,
                  4
                )} founded a Settlement at ${formatCoords(act.tileId ?? 0)}.`
              : `${shortenAddress(act.player, 4)} contributed ${formatWif(
                  act.wifAmount,
                  0
                )} $WIF to ${worldEvent.title}.`,
          href: act.kind === "settlement" ? "/activity" : "/events",
          createdAt: act.timestamp,
        });
      }
    }

    const unsynced = candidateItems.filter(
      (c) => !syncedKeysRef.current.has(c.dedupeKey)
    );
    if (unsynced.length === 0) return;

    for (const u of unsynced) {
      syncedKeysRef.current.add(u.dedupeKey);
    }

    fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet: address,
        items: unsynced,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
        }
      })
      .catch(() => {});
  }, [activities, address, isConnected, missions, playerStats, worldEvent]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    if (selectedCategory === "All") return notifications;
    return notifications.filter((n) => n.category === selectedCategory);
  }, [notifications, selectedCategory]);

  const handleMarkRead = async (id: string) => {
    if (!address) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address, notificationId: id }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
        }
      }
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    if (!address) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address, markAll: true }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
        }
      }
    } catch {
      // ignore
    }
  };

  const getCategoryIcon = (cat: NotificationCategory) => {
    switch (cat) {
      case "Settlement":
        return <Castle className="h-3.5 w-3.5 text-[#2DD4BF]" />;
      case "Resources":
        return <Trees className="h-3.5 w-3.5 text-[#D99B52]" />;
      case "Progression":
        return <Sparkles className="h-3.5 w-3.5 text-amber-400" />;
      case "World":
        return <Flame className="h-3.5 w-3.5 text-crimson-accent" />;
      case "Social":
        return <Users className="h-3.5 w-3.5 text-sky-400" />;
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.1] bg-[#161918] text-ink-secondary hover:bg-[#1E2220] hover:text-white transition-colors"
        aria-label="In-Game Notifications"
        title="Realm Notifications"
      >
        <Bell className="h-4 w-4" />
        {isConnected && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-crimson-accent px-1 font-mono text-[10px] font-bold text-white shadow-[0_0_8px_#FF4D5A]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed sm:absolute right-3 sm:right-0 top-16 sm:top-auto sm:mt-2 w-[calc(100vw-24px)] sm:w-96 rounded-2xl border border-white/[0.12] bg-[#121615]/98 shadow-panel backdrop-blur-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Bell className="h-3.5 w-3.5 text-crimson-accent" />
                <span>Realm Dispatches</span>
                {isConnected && unreadCount > 0 && (
                  <span className="rounded-full bg-crimson/20 px-2 py-0.5 font-mono text-[10px] text-crimson-accent">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="text-[10px] text-ink-muted">
                Wallet-isolated alerts for your settlements & world events
              </div>
            </div>

            {isConnected && unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[10px] font-semibold text-ink-secondary hover:text-white transition-colors"
              >
                <CheckCheck className="h-3 w-3" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto border-b border-white/[0.06] bg-[#0D100F] px-3 py-2">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-colors",
                    active
                      ? "bg-crimson text-white"
                      : "text-ink-muted hover:text-white hover:bg-white/[0.04]"
                  )}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Notification Items List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-white/[0.06]">
            {!isConnected ? (
              <div className="p-6 text-center text-xs text-ink-muted">
                Connect your wallet to receive persistent notifications for your
                settlements, resource storage, missions, and world events.
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-ink-muted">
                No notifications in{" "}
                <span className="text-white font-semibold">
                  {selectedCategory}
                </span>{" "}
                yet.
              </div>
            ) : (
              filteredNotifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (!item.read) handleMarkRead(item.id);
                  }}
                  className={cn(
                    "p-3.5 transition-colors cursor-pointer",
                    item.read
                      ? "bg-transparent hover:bg-white/[0.02]"
                      : "bg-crimson/[0.06] hover:bg-crimson/[0.1]"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      {getCategoryIcon(item.category)}
                      <span>{item.title}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!item.read && (
                        <span className="h-2 w-2 rounded-full bg-crimson-accent" />
                      )}
                      <span className="font-mono text-[10px] text-ink-dim">
                        {new Date(item.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 text-[11px] text-ink-secondary leading-relaxed">
                    {item.message}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[10px]">
                    <span className="rounded bg-white/[0.05] px-1.5 py-0.5 font-mono text-ink-muted">
                      {item.category}
                    </span>
                    {item.href && (
                      <Link
                        href={item.href}
                        onClick={() => {
                          if (!item.read) handleMarkRead(item.id);
                          setOpen(false);
                        }}
                        className="font-semibold text-crimson-accent hover:underline"
                      >
                        Inspect →
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
