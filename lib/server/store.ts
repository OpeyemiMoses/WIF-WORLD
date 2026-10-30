import fs from "fs";
import path from "path";
import crypto from "crypto";
import { ADMIN_WALLET_ADDRESS, isAuthorizedAdminAddress } from "@/lib/chain/robinhood";

export type NotificationCategory =
  | "Settlement"
  | "Resources"
  | "Progression"
  | "World"
  | "Social";

export interface InGameNotification {
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

export interface WalletOnboardingRecord {
  walletAddress: string;
  currentStep: number; // 1..7
  completed: boolean;
  skipped: boolean;
  selectedStartTileId: number | null;
  startedAt: number;
  completedAt: number | null;
  updatedAt: number;
}

export interface AdminNonceRecord {
  nonce: string;
  walletAddress: string;
  issuedAt: number;
  expiresAt: number;
  used: boolean;
}

export interface AdminSessionRecord {
  token: string;
  walletAddress: string;
  issuedAt: number;
  expiresAt: number;
}

export interface AdminAuditEntry {
  id: string;
  walletAddress: string;
  action: string;
  category: "auth" | "event" | "world" | "treasury" | "settings";
  details: string;
  txHash?: string;
  timestamp: number;
}

export interface ConfiguredWorldEventMeta {
  eventId: number;
  title: string;
  subtitle: string;
  story: string;
  targetRegionId: number;
  targetRegionName: string;
  targetTileId: number;
  targetWifDisplay: string;
  requiredMaterials: {
    wood: number;
    stone: number;
    food: number;
  };
  unlockReward: string;
  active: boolean;
  completed: boolean;
  updatedAt: number;
}

interface PersistentStoreData {
  onboardingByWallet: Record<string, WalletOnboardingRecord>;
  notificationsByWallet: Record<string, InGameNotification[]>;
  adminNonces: Record<string, AdminNonceRecord>;
  adminSessions: Record<string, AdminSessionRecord>;
  adminAuditLog: AdminAuditEntry[];
  configuredEvents: Record<number, ConfiguredWorldEventMeta>;
}

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "wif-worlds-store.json");

const DEFAULT_GREAT_BRIDGE_EVENT: ConfiguredWorldEventMeta = {
  eventId: 1,
  title: "The Great Bridge",
  subtitle: "Spanning the Northern River Strait to The Wild Frontier",
  story:
    "For generations, the rushing torrents of the Northern Strait have divided The Heartlands from the untamed riches of The Wild Frontier. Pioneers across the realm are pooling $WIF and timber-stone engineering at Tile (3, 0) to raise The Great Bridge and open Region 2 for settlement.",
  targetRegionId: 1,
  targetRegionName: "The Wild Frontier",
  targetTileId: 3,
  targetWifDisplay: "500",
  requiredMaterials: {
    wood: 1200,
    stone: 900,
    food: 600,
  },
  unlockReward: "Permanently unlocks Region 2: The Wild Frontier (49 new tiles) & Bridge Pioneer Crest",
  active: true,
  completed: false,
  updatedAt: Date.now(),
};

function createEmptyStore(): PersistentStoreData {
  return {
    onboardingByWallet: {},
    notificationsByWallet: {},
    adminNonces: {},
    adminSessions: {},
    adminAuditLog: [],
    configuredEvents: {
      1: DEFAULT_GREAT_BRIDGE_EVENT,
    },
  };
}

function readStore(): PersistentStoreData {
  try {
    if (!fs.existsSync(STORE_FILE)) {
      return createEmptyStore();
    }
    const raw = fs.readFileSync(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<PersistentStoreData>;
    return {
      onboardingByWallet: parsed.onboardingByWallet ?? {},
      notificationsByWallet: parsed.notificationsByWallet ?? {},
      adminNonces: parsed.adminNonces ?? {},
      adminSessions: parsed.adminSessions ?? {},
      adminAuditLog: parsed.adminAuditLog ?? [],
      configuredEvents: {
        1: DEFAULT_GREAT_BRIDGE_EVENT,
        ...(parsed.configuredEvents ?? {}),
      },
    };
  } catch {
    return createEmptyStore();
  }
}

function writeStore(data: PersistentStoreData): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch {
    // Fallback if filesystem is read-only in serverless environments
  }
}

// ============================================================================
// 1. WALLET ONBOARDING STATE
// ============================================================================

export function getWalletOnboarding(address: string): WalletOnboardingRecord {
  const norm = address.trim().toLowerCase();
  const store = readStore();
  const existing = store.onboardingByWallet[norm];
  if (existing) return existing;

  const fresh: WalletOnboardingRecord = {
    walletAddress: norm,
    currentStep: 1,
    completed: false,
    skipped: false,
    selectedStartTileId: 31,
    startedAt: Date.now(),
    completedAt: null,
    updatedAt: Date.now(),
  };
  return fresh;
}

export function updateWalletOnboarding(
  address: string,
  patch: Partial<
    Pick<
      WalletOnboardingRecord,
      "currentStep" | "completed" | "skipped" | "selectedStartTileId"
    >
  >
): WalletOnboardingRecord {
  const norm = address.trim().toLowerCase();
  const store = readStore();
  const current = store.onboardingByWallet[norm] ?? getWalletOnboarding(norm);

  const updated: WalletOnboardingRecord = {
    ...current,
    ...patch,
    walletAddress: norm,
    completedAt:
      patch.completed && !current.completedAt
        ? Date.now()
        : current.completedAt,
    updatedAt: Date.now(),
  };

  store.onboardingByWallet[norm] = updated;
  writeStore(store);
  return updated;
}

// ============================================================================
// 2. WALLET-ISOLATED IN-GAME NOTIFICATIONS
// ============================================================================

export function getWalletNotifications(address: string): InGameNotification[] {
  const norm = address.trim().toLowerCase();
  const store = readStore();
  const list = store.notificationsByWallet[norm] ?? [];
  return [...list].sort((a, b) => b.createdAt - a.createdAt);
}

export function addWalletNotifications(
  address: string,
  items: Array<{
    dedupeKey?: string;
    category: NotificationCategory;
    title: string;
    message: string;
    href?: string;
    createdAt?: number;
  }>
): InGameNotification[] {
  const norm = address.trim().toLowerCase();
  const store = readStore();
  const existing = store.notificationsByWallet[norm] ?? [];
  const seenKeys = new Set(
    existing.map((n) => n.dedupeKey).filter(Boolean) as string[]
  );

  let changed = false;
  for (const item of items) {
    if (item.dedupeKey && seenKeys.has(item.dedupeKey)) {
      continue;
    }
    if (item.dedupeKey) {
      seenKeys.add(item.dedupeKey);
    }
    existing.unshift({
      id: `notif-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
      dedupeKey: item.dedupeKey,
      walletAddress: norm,
      category: item.category,
      title: item.title,
      message: item.message,
      href: item.href,
      read: false,
      createdAt: item.createdAt ?? Date.now(),
    });
    changed = true;
  }

  if (changed) {
    store.notificationsByWallet[norm] = existing.slice(0, 80);
    writeStore(store);
  }

  return [...(store.notificationsByWallet[norm] ?? [])].sort(
    (a, b) => b.createdAt - a.createdAt
  );
}

export function markWalletNotificationsRead(
  address: string,
  notificationId?: string,
  markAll?: boolean
): InGameNotification[] {
  const norm = address.trim().toLowerCase();
  const store = readStore();
  const existing = store.notificationsByWallet[norm] ?? [];

  const updated = existing.map((n) => {
    if (markAll || (notificationId && n.id === notificationId)) {
      return { ...n, read: true };
    }
    return n;
  });

  store.notificationsByWallet[norm] = updated;
  writeStore(store);
  return [...updated].sort((a, b) => b.createdAt - a.createdAt);
}

// ============================================================================
// 3. PRIVATE ADMIN CRYPTOGRAPHIC NONCE & SESSION MANAGEMENT
// ============================================================================

export function issueAdminNonce(address: string): AdminNonceRecord | null {
  if (!isAuthorizedAdminAddress(address)) {
    return null;
  }
  const norm = address.trim().toLowerCase();
  const store = readStore();

  // Clean expired nonces
  const now = Date.now();
  for (const [k, v] of Object.entries(store.adminNonces)) {
    if (v.expiresAt < now || v.used) {
      delete store.adminNonces[k];
    }
  }

  const nonce = crypto.randomBytes(16).toString("hex");
  const record: AdminNonceRecord = {
    nonce,
    walletAddress: norm,
    issuedAt: now,
    expiresAt: now + 10 * 60 * 1000, // 10 minutes
    used: false,
  };

  store.adminNonces[nonce] = record;
  writeStore(store);
  return record;
}

export function buildAdminChallengeMessage(address: string, nonce: string): string {
  return [
    "WIF WORLDS — Private Treasury Administration Login",
    `Treasury Admin Wallet: ${address.toLowerCase()}`,
    `One-Time Security Nonce: ${nonce}`,
    "Chain ID: 4663 (Robinhood Chain)",
    "By signing this challenge, you authenticate your active admin session. No gas or transaction is required.",
  ].join("\n");
}

export function consumeAdminNonceAndCreateSession(
  address: string,
  nonce: string
): AdminSessionRecord | null {
  if (!isAuthorizedAdminAddress(address)) {
    return null;
  }
  const norm = address.trim().toLowerCase();
  const store = readStore();
  const now = Date.now();

  const record = store.adminNonces[nonce];
  if (
    !record ||
    record.used ||
    record.expiresAt < now ||
    record.walletAddress !== norm
  ) {
    return null;
  }

  // Mark single-use nonce as consumed
  record.used = true;
  delete store.adminNonces[nonce];

  const token = crypto.randomBytes(32).toString("hex");
  const session: AdminSessionRecord = {
    token,
    walletAddress: norm,
    issuedAt: now,
    expiresAt: now + 12 * 60 * 60 * 1000, // 12 hours
  };

  store.adminSessions[token] = session;
  store.adminAuditLog.unshift({
    id: `audit-${now}-${crypto.randomBytes(3).toString("hex")}`,
    walletAddress: norm,
    action: "Treasury Admin Authenticated",
    category: "auth",
    details: `Verified cryptographic wallet signature for ${ADMIN_WALLET_ADDRESS}`,
    timestamp: now,
  });
  store.adminAuditLog = store.adminAuditLog.slice(0, 150);

  writeStore(store);
  return session;
}

export function verifyAdminSessionToken(
  token: string | undefined | null,
  expectedAddress?: string | null
): AdminSessionRecord | null {
  if (!token) return null;
  const store = readStore();
  const session = store.adminSessions[token];
  if (!session) return null;

  const now = Date.now();
  if (session.expiresAt < now) {
    delete store.adminSessions[token];
    writeStore(store);
    return null;
  }

  if (!isAuthorizedAdminAddress(session.walletAddress)) {
    return null;
  }

  if (
    expectedAddress &&
    expectedAddress.trim().toLowerCase() !== session.walletAddress
  ) {
    return null;
  }

  return session;
}

export function revokeAdminSessionToken(token: string | undefined | null): void {
  if (!token) return;
  const store = readStore();
  if (store.adminSessions[token]) {
    delete store.adminSessions[token];
    writeStore(store);
  }
}

export function getAdminAuditLog(): AdminAuditEntry[] {
  const store = readStore();
  return store.adminAuditLog;
}

export function appendAdminAuditEntry(entry: {
  walletAddress: string;
  action: string;
  category: AdminAuditEntry["category"];
  details: string;
  txHash?: string;
}): AdminAuditEntry {
  const store = readStore();
  const now = Date.now();
  const created: AdminAuditEntry = {
    id: `audit-${now}-${crypto.randomBytes(3).toString("hex")}`,
    walletAddress: entry.walletAddress.toLowerCase(),
    action: entry.action,
    category: entry.category,
    details: entry.details,
    txHash: entry.txHash,
    timestamp: now,
  };
  store.adminAuditLog.unshift(created);
  store.adminAuditLog = store.adminAuditLog.slice(0, 150);
  writeStore(store);
  return created;
}

export function getConfiguredWorldEvents(): ConfiguredWorldEventMeta[] {
  const store = readStore();
  return Object.values(store.configuredEvents).sort(
    (a, b) => a.eventId - b.eventId
  );
}

export function upsertConfiguredWorldEvent(
  meta: Omit<ConfiguredWorldEventMeta, "updatedAt">,
  adminWallet: string,
  txHash?: string
): ConfiguredWorldEventMeta {
  const store = readStore();
  const now = Date.now();
  const saved: ConfiguredWorldEventMeta = {
    ...meta,
    updatedAt: now,
  };
  store.configuredEvents[meta.eventId] = saved;
  store.adminAuditLog.unshift({
    id: `audit-${now}-${crypto.randomBytes(3).toString("hex")}`,
    walletAddress: adminWallet.toLowerCase(),
    action: `Configured World Event #${meta.eventId}: ${meta.title}`,
    category: "event",
    details: `Target: ${meta.targetWifDisplay} $WIF • Region: ${meta.targetRegionName} • Tile (${Math.floor(meta.targetTileId / 7)}, ${meta.targetTileId % 7})`,
    txHash,
    timestamp: now,
  });
  store.adminAuditLog = store.adminAuditLog.slice(0, 150);
  writeStore(store);
  return saved;
}
