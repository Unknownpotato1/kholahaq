/**
 * Repository layer — single API surface for the whole app.
 *
 * Two backends are supported transparently:
 *   1. Firebase Firestore (production) — when FIREBASE_PROJECT_ID is set
 *   2. Prisma + SQLite (sandbox/preview) — automatic fallback
 *
 * All public API returns plain TypeScript types (see src/types), so callers
 * don't care which backend is live.
 *
 * SECURITY: the `currentPasswordEnc` field is NEVER returned by any of the
 * public read methods below. Decryption happens only in the unlock route,
 * after payment verification.
 */
import { db as prisma } from "@/lib/db";
import { getFirestore, firebaseEnabled } from "@/lib/firebase-admin";
import { encryptPassword, decryptPassword } from "@/lib/crypto";
import type {
  Account,
  AccountInput,
  AccountPublic,
  Payment,
  PaymentInput,
  UnlockToken,
  UnlockTokenInput,
  AdminLog,
  AdminLogInput,
  Chat,
  Message,
} from "@/types";

// ---------- public-safe type (no currentPassword) ----------
export function toPublicAccount(a: Account): AccountPublic {
  return {
    id: a.id,
    username: a.username,
    previousPassword: a.previousPassword,
    price: a.price,
    category: a.category,
    notes: a.notes,
    status: a.status,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

// ============ FIRESTORE ADAPTER ============
const FS = {
  accounts: "accounts",
  payments: "payments",
  unlockTokens: "unlockTokens",
  admins: "admins",
  logs: "logs",
  chats: "chats",
  messages: "messages",
} as const;

function fsDate(d: Date | string | { seconds?: number; nanoseconds?: number }): Date {
  if (d instanceof Date) return d;
  if (typeof d === "string") return new Date(d);
  if (d && typeof d === "object" && typeof d.seconds === "number") {
    return new Date(d.seconds * 1000 + (d.nanoseconds || 0) / 1e6);
  }
  return new Date();
}

async function fsList<T>(
  col: string,
  opts?: { where?: [string, FirebaseFirestore.WhereFilterOp, unknown]; orderBy?: string; orderDir?: "asc" | "desc"; limit?: number }
): Promise<T[]> {
  const fs = getFirestore()!;
  let q: FirebaseFirestore.Query = fs.collection(col);
  if (opts?.where) q = q.where(opts.where[0], opts.where[1], opts.where[2]);
  if (opts?.orderBy) q = q.orderBy(opts.orderBy, opts.orderDir || "desc");
  if (opts?.limit) q = q.limit(opts.limit);
  const snap = await q.get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as T[];
}

// ============ ACCOUNT REPO ============
export const Accounts = {
  async create(input: AccountInput): Promise<Account> {
    const enc = encryptPassword(input.currentPassword);
    if (firebaseEnabled) {
      const fs = getFirestore()!;
      const ref = await fs.collection(FS.accounts).add({
        username: input.username,
        previousPassword: input.previousPassword,
        currentPasswordEnc: enc,
        price: input.price,
        category: input.category || "general",
        notes: input.notes || "",
        status: input.status || "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const a = (await ref.get()).data()!;
      return { id: ref.id, ...a, createdAt: fsDate(a.createdAt), updatedAt: fsDate(a.updatedAt) } as Account;
    }
    const row = await prisma.account.create({
      data: {
        username: input.username,
        previousPassword: input.previousPassword,
        currentPasswordEnc: enc,
        price: input.price,
        category: input.category || "general",
        notes: input.notes || "",
        status: input.status || "active",
      },
    });
    return row as unknown as Account;
  },

  async update(id: string, input: Partial<AccountInput>): Promise<Account | null> {
    const data: Record<string, unknown> = { ...input, updatedAt: new Date() };
    if (input.currentPassword) {
      data.currentPasswordEnc = encryptPassword(input.currentPassword);
      delete data.currentPassword;
    }
    if (firebaseEnabled) {
      const fs = getFirestore()!;
      await fs.collection(FS.accounts).doc(id).update(data);
      const a = (await fs.collection(FS.accounts).doc(id).get()).data()!;
      return { id, ...a, createdAt: fsDate(a.createdAt), updatedAt: fsDate(a.updatedAt) } as Account;
    }
    const row = await prisma.account.update({
      where: { id },
      data: data as never,
    });
    return row as unknown as Account;
  },

  async delete(id: string): Promise<void> {
    if (firebaseEnabled) {
      await getFirestore()!.collection(FS.accounts).doc(id).delete();
      return;
    }
    await prisma.account.delete({ where: { id } });
  },

  async getById(id: string): Promise<Account | null> {
    if (firebaseEnabled) {
      const snap = await getFirestore()!.collection(FS.accounts).doc(id).get();
      if (!snap.exists) return null;
      const a = snap.data()!;
      return { id: snap.id, ...a, createdAt: fsDate(a.createdAt), updatedAt: fsDate(a.updatedAt) } as Account;
    }
    const row = await prisma.account.findUnique({ where: { id } });
    return (row as unknown as Account) || null;
  },

  async getByUsername(username: string): Promise<Account | null> {
    if (firebaseEnabled) {
      const snap = await getFirestore()!
        .collection(FS.accounts)
        .where("username", "==", username)
        .limit(1)
        .get();
      if (snap.empty) return null;
      const d = snap.docs[0];
      const a = d.data();
      return { id: d.id, ...a, createdAt: fsDate(a.createdAt), updatedAt: fsDate(a.updatedAt) } as Account;
    }
    const row = await prisma.account.findUnique({ where: { username } });
    return (row as unknown as Account) || null;
  },

  async search(query: string, opts?: { limit?: number; page?: number }): Promise<{ items: Account[]; total: number }> {
    const limit = Math.min(opts?.limit ?? 20, 50);
    const page = Math.max(opts?.page ?? 1, 1);
    if (firebaseEnabled) {
      const q = (query || "").trim();
      const fs = getFirestore()!;
      let snap: FirebaseFirestore.QuerySnapshot;
      if (q) {
        // Firestore doesn't support native LIKE — use prefix range.
        // Single-field orderBy avoids needing a composite index.
        snap = await fs
          .collection(FS.accounts)
          .where("username", ">=", q)
          .where("username", "<=", q + "\uf8ff")
          .limit(limit)
          .get();
      } else {
        snap = await fs
          .collection(FS.accounts)
          .orderBy("updatedAt", "desc")
          .limit(limit)
          .get();
      }
      const items = snap.docs.map((d) => {
        const a = d.data();
        return { id: d.id, ...a, createdAt: fsDate(a.createdAt), updatedAt: fsDate(a.updatedAt) } as Account;
      });
      // Sort client-side by updatedAt desc for better UX.
      items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      return { items, total: items.length };
    }
    const where = query
      ? { username: { contains: query } }
      : {};
    const [items, total] = await Promise.all([
      prisma.account.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.account.count({ where }),
    ]);
    return { items: items as unknown as Account[], total };
  },

  async listRecent(limit = 6): Promise<Account[]> {
    if (firebaseEnabled) {
      return fsList<Account>(FS.accounts, { orderBy: "updatedAt", orderDir: "desc", limit });
    }
    const rows = await prisma.account.findMany({
      orderBy: { updatedAt: "desc" },
      take: limit,
    });
    return rows as unknown as Account[];
  },

  /** Decrypts the current password. Call this ONLY after payment verification. */
  async revealCurrentPassword(id: string): Promise<string | null> {
    let enc: string | null = null;
    if (firebaseEnabled) {
      const snap = await getFirestore()!.collection(FS.accounts).doc(id).get();
      if (!snap.exists) return null;
      enc = (snap.data() as { currentPasswordEnc?: string }).currentPasswordEnc || null;
    } else {
      const row = await prisma.account.findUnique({ where: { id } });
      enc = row?.currentPasswordEnc ?? null;
    }
    if (!enc) return null;
    return decryptPassword(enc);
  },
};

// ============ PAYMENT REPO ============
export const Payments = {
  async create(input: PaymentInput): Promise<Payment> {
    if (firebaseEnabled) {
      const fs = getFirestore()!;
      const ref = await fs.collection(FS.payments).add({ ...input, createdAt: new Date() });
      const a = (await ref.get()).data()!;
      return { id: ref.id, ...a, createdAt: fsDate(a.createdAt) } as Payment;
    }
    const row = await prisma.payment.create({
      data: {
        paymentId: input.paymentId,
        orderId: input.orderId,
        amount: input.amount,
        status: input.status,
        username: input.username,
        accountId: input.accountId,
      },
    });
    return row as unknown as Payment;
  },

  async updateStatus(id: string, status: string, paymentId?: string): Promise<void> {
    if (firebaseEnabled) {
      const data: Record<string, unknown> = { status };
      if (paymentId) data.paymentId = paymentId;
      await getFirestore()!.collection(FS.payments).doc(id).update(data);
      return;
    }
    await prisma.payment.update({
      where: { id },
      data: { status, paymentId },
    });
  },

  async getByOrderId(orderId: string): Promise<Payment | null> {
    if (firebaseEnabled) {
      const snap = await getFirestore()!
        .collection(FS.payments)
        .where("orderId", "==", orderId)
        .limit(1)
        .get();
      if (snap.empty) return null;
      const d = snap.docs[0];
      const a = d.data();
      return { id: d.id, ...a, createdAt: fsDate(a.createdAt) } as Payment;
    }
    const rows = await prisma.payment.findMany({ where: { orderId }, take: 1 });
    return (rows[0] as unknown as Payment) || null;
  },

  async list(limit = 50): Promise<Payment[]> {
    if (firebaseEnabled) {
      return fsList<Payment>(FS.payments, { orderBy: "createdAt", orderDir: "desc", limit });
    }
    const rows = await prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows as unknown as Payment[];
  },
};

// ============ UNLOCK TOKEN REPO ============
export const UnlockTokens = {
  async create(input: UnlockTokenInput): Promise<UnlockToken> {
    if (firebaseEnabled) {
      const fs = getFirestore()!;
      const ref = await fs.collection(FS.unlockTokens).add({ ...input, used: false, createdAt: new Date() });
      const a = (await ref.get()).data()!;
      return {
        id: ref.id,
        ...a,
        createdAt: fsDate(a.createdAt),
        expiresAt: fsDate(a.expiresAt),
      } as UnlockToken;
    }
    const row = await prisma.unlockToken.create({
      data: {
        token: input.token,
        accountId: input.accountId,
        paymentId: input.paymentId,
        expiresAt: input.expiresAt,
        used: false,
      },
    });
    return row as unknown as UnlockToken;
  },

  async getByToken(token: string): Promise<UnlockToken | null> {
    if (firebaseEnabled) {
      const snap = await getFirestore()!
        .collection(FS.unlockTokens)
        .where("token", "==", token)
        .limit(1)
        .get();
      if (snap.empty) return null;
      const d = snap.docs[0];
      const a = d.data();
      return {
        id: d.id,
        ...a,
        createdAt: fsDate(a.createdAt),
        expiresAt: fsDate(a.expiresAt),
      } as UnlockToken;
    }
    const row = await prisma.unlockToken.findUnique({ where: { token } });
    return (row as unknown as UnlockToken) || null;
  },

  async markUsed(id: string): Promise<void> {
    if (firebaseEnabled) {
      await getFirestore()!.collection(FS.unlockTokens).doc(id).update({ used: true });
      return;
    }
    await prisma.unlockToken.update({ where: { id }, data: { used: true } });
  },

  async list(limit = 50): Promise<UnlockToken[]> {
    if (firebaseEnabled) {
      return fsList<UnlockToken>(FS.unlockTokens, { orderBy: "createdAt", orderDir: "desc", limit });
    }
    const rows = await prisma.unlockToken.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { account: true },
    });
    return rows as unknown as UnlockToken[];
  },
};

// ============ LOG REPO ============
export const Logs = {
  async create(input: AdminLogInput): Promise<void> {
    if (firebaseEnabled) {
      await getFirestore()!.collection(FS.logs).add({ ...input, createdAt: new Date() });
      return;
    }
    await prisma.adminLog.create({
      data: {
        action: input.action,
        targetId: input.targetId,
        detail: input.detail,
        adminUid: input.adminUid,
      },
    });
  },

  async list(limit = 100): Promise<AdminLog[]> {
    if (firebaseEnabled) {
      return fsList<AdminLog>(FS.logs, { orderBy: "createdAt", orderDir: "desc", limit });
    }
    const rows = await prisma.adminLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows as unknown as AdminLog[];
  },
};

// ============ ADMIN HELPERS ============
export const Admins = {
  async isAdminUid(uid: string): Promise<boolean> {
    if (firebaseEnabled) {
      const snap = await getFirestore()!.collection(FS.admins).doc(uid).get();
      return snap.exists;
    }
    // Sandbox: accept any configured ADMIN_DEMO_UID, else accept any non-empty uid.
    const demo = process.env.ADMIN_DEMO_UID;
    if (demo) return uid === demo;
    return Boolean(uid);
  },
};

// ============ CHAT REPO ============
// Anonymous visitor ↔ admin conversations.
// A visitor's sessionId is generated client-side and stored in localStorage.
export const Chats = {
  async getOrCreateBySession(sessionId: string, displayName?: string): Promise<Chat> {
    if (firebaseEnabled) {
      const fs = getFirestore()!;
      const snap = await fs
        .collection(FS.chats)
        .where("sessionId", "==", sessionId)
        .limit(1)
        .get();
      if (!snap.empty) {
        const d = snap.docs[0]!;
        const a = d.data();
        return {
          id: d.id,
          ...a,
          lastMessageAt: fsDate(a.lastMessageAt),
          createdAt: fsDate(a.createdAt),
          lastReadAt: a.lastReadAt ? fsDate(a.lastReadAt) : null,
        } as Chat;
      }
      const ref = await fs.collection(FS.chats).add({
        sessionId,
        displayName: displayName || "Anonymous",
        lastMessageAt: new Date(),
        createdAt: new Date(),
      });
      const a = (await ref.get()).data()!;
      return {
        id: ref.id,
        ...a,
        lastMessageAt: fsDate(a.lastMessageAt),
        createdAt: fsDate(a.createdAt),
        lastReadAt: a.lastReadAt ? fsDate(a.lastReadAt) : null,
      } as Chat;
    }
    const existing = await prisma.chat.findUnique({ where: { sessionId } });
    if (existing) return existing as unknown as Chat;
    const row = await prisma.chat.create({
      data: { sessionId, displayName: displayName || "Anonymous" },
    });
    return row as unknown as Chat;
  },

  async getById(id: string): Promise<Chat | null> {
    if (firebaseEnabled) {
      const snap = await getFirestore()!.collection(FS.chats).doc(id).get();
      if (!snap.exists) return null;
      const a = snap.data()!;
      return {
        id: snap.id,
        ...a,
        lastMessageAt: fsDate(a.lastMessageAt),
        createdAt: fsDate(a.createdAt),
        lastReadAt: a.lastReadAt ? fsDate(a.lastReadAt) : null,
      } as Chat;
    }
    const row = await prisma.chat.findUnique({ where: { id } });
    return (row as unknown as Chat) || null;
  },

  async getBySession(sessionId: string): Promise<Chat | null> {
    if (firebaseEnabled) {
      const snap = await getFirestore()!
        .collection(FS.chats)
        .where("sessionId", "==", sessionId)
        .limit(1)
        .get();
      if (snap.empty) return null;
      const d = snap.docs[0]!;
      const a = d.data();
      return {
        id: d.id,
        ...a,
        lastMessageAt: fsDate(a.lastMessageAt),
        createdAt: fsDate(a.createdAt),
        lastReadAt: a.lastReadAt ? fsDate(a.lastReadAt) : null,
      } as Chat;
    }
    const row = await prisma.chat.findUnique({ where: { sessionId } });
    return (row as unknown as Chat) || null;
  },

  async touch(id: string): Promise<void> {
    if (firebaseEnabled) {
      await getFirestore()!.collection(FS.chats).doc(id).update({
        lastMessageAt: new Date(),
      });
      return;
    }
    await prisma.chat.update({
      where: { id },
      data: { lastMessageAt: new Date() },
    });
  },

  async list(limit = 100): Promise<Chat[]> {
    if (firebaseEnabled) {
      const fs = getFirestore()!;
      const snap = await fs
        .collection(FS.chats)
        .orderBy("lastMessageAt", "desc")
        .limit(limit)
        .get();
      return snap.docs.map((d) => {
        const a = d.data();
        return {
          id: d.id,
          ...a,
          lastMessageAt: fsDate(a.lastMessageAt),
          createdAt: fsDate(a.createdAt),
          lastReadAt: a.lastReadAt ? fsDate(a.lastReadAt) : null,
        } as Chat;
      });
    }
    const rows = await prisma.chat.findMany({
      orderBy: { lastMessageAt: "desc" },
      take: limit,
    });
    return rows as unknown as Chat[];
  },

  /** Mark a chat as read by storing the current timestamp. */
  async markRead(chatId: string): Promise<void> {
    if (firebaseEnabled) {
      await getFirestore()!.collection(FS.chats).doc(chatId).update({
        lastReadAt: new Date(),
      });
      return;
    }
    await prisma.chat.update({
      where: { id: chatId },
      data: { lastReadAt: new Date() },
    });
  },

  /** Update the visitor's display name. */
  async updateDisplayName(chatId: string, name: string): Promise<void> {
    if (firebaseEnabled) {
      await getFirestore()!.collection(FS.chats).doc(chatId).update({
        displayName: name,
      });
      return;
    }
    await prisma.chat.update({
      where: { id: chatId },
      data: { displayName: name },
    });
  },

  /** Permanently delete a chat and all its messages. */
  async delete(chatId: string): Promise<void> {
    if (firebaseEnabled) {
      const fs = getFirestore()!;
      // Delete all messages in this chat.
      const msgSnap = await fs
        .collection(FS.messages)
        .where("chatId", "==", chatId)
        .get();
      await Promise.all(msgSnap.docs.map((d) => d.ref.delete()));
      // Delete the chat doc.
      await fs.collection(FS.chats).doc(chatId).delete();
      return;
    }
    await prisma.chat.delete({ where: { id: chatId } });
  },
};

// ============ MESSAGE REPO ============
export const Messages = {
  async create(input: {
    chatId: string;
    sender: "user" | "admin";
    text?: string | null;
    imageUrl?: string | null;
    passwordReveal?: boolean;
  }): Promise<Message> {
    if (firebaseEnabled) {
      const fs = getFirestore()!;
      const ref = await fs.collection(FS.messages).add({
        ...input,
        passwordReveal: input.passwordReveal || false,
        createdAt: new Date(),
      });
      await Chats.touch(input.chatId);
      const a = (await ref.get()).data()!;
      return { id: ref.id, ...a, createdAt: fsDate(a.createdAt) } as Message;
    }
    const row = await prisma.message.create({
      data: {
        chatId: input.chatId,
        sender: input.sender,
        text: input.text || null,
        imageUrl: input.imageUrl || null,
        passwordReveal: input.passwordReveal || false,
      },
    });
    await Chats.touch(input.chatId);
    return row as unknown as Message;
  },

  async listByChat(chatId: string, limit = 200): Promise<Message[]> {
    if (firebaseEnabled) {
      const fs = getFirestore()!;
      // Query without orderBy to avoid needing a composite index.
      // Sort client-side instead.
      const snap = await fs
        .collection(FS.messages)
        .where("chatId", "==", chatId)
        .limit(limit)
        .get();
      const items = snap.docs.map((d) => {
        const a = d.data();
        return { id: d.id, ...a, createdAt: fsDate(a.createdAt) } as Message;
      });
      items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      return items;
    }
    const rows = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
    return rows as unknown as Message[];
  },

  /**
   * Update a message's createdAt to a future timestamp (used for
   * scheduled auto-replies so the client can show a typing bubble).
   */
  async scheduleForFuture(messageId: string, futureDate: Date): Promise<void> {
    if (firebaseEnabled) {
      // Find the message by ID and update its createdAt.
      await getFirestore()!.collection(FS.messages).doc(messageId).update({
        createdAt: futureDate,
      });
      return;
    }
    await prisma.message.update({
      where: { id: messageId },
      data: { createdAt: futureDate },
    });
  },
};
