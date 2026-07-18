/** Shared domain types. */

export interface Account {
  id: string;
  username: string;
  previousPassword: string;
  /** AES-256-GCM ciphertext. Never sent to client. */
  currentPasswordEnc?: string;
  price: number;
  category: string;
  notes?: string | null;
  status: "active" | "inactive";
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AccountInput {
  username: string;
  previousPassword: string;
  currentPassword: string;
  price: number;
  category?: string;
  notes?: string;
  status?: "active" | "inactive";
}

/** Public-safe account projection — no `currentPasswordEnc`. */
export interface AccountPublic {
  id: string;
  username: string;
  previousPassword: string;
  price: number;
  category: string;
  notes?: string | null;
  status: "active" | "inactive";
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Payment {
  id: string;
  paymentId?: string | null;
  orderId: string;
  amount: number;
  status: "created" | "paid" | "failed";
  username: string;
  accountId: string;
  createdAt: Date | string;
}

export interface PaymentInput {
  paymentId?: string | null;
  orderId: string;
  amount: number;
  status: Payment["status"];
  username: string;
  accountId: string;
}

export interface UnlockToken {
  id: string;
  token: string;
  accountId: string;
  paymentId?: string | null;
  createdAt: Date | string;
  expiresAt: Date | string;
  used: boolean;
}

export interface UnlockTokenInput {
  token: string;
  accountId: string;
  paymentId?: string | null;
  expiresAt: Date;
}

export interface AdminLog {
  id: string;
  action: string;
  targetId?: string | null;
  detail?: string | null;
  adminUid?: string | null;
  createdAt: Date | string;
}

export interface AdminLogInput {
  action: string;
  targetId?: string | null;
  detail?: string | null;
  adminUid?: string | null;
}

// ---------- Anonymous chat ----------
export interface Chat {
  id: string;
  sessionId: string;
  displayName: string;
  lastMessageAt: Date | string;
  createdAt: Date | string;
  lastReadAt?: Date | string | null;
  userTypingAt?: Date | string | null;
  adminTypingAt?: Date | string | null;
}

export interface Message {
  id: string;
  chatId: string;
  sender: "user" | "admin";
  text?: string | null;
  imageUrl?: string | null;
  passwordReveal?: boolean;
  createdAt: Date | string;
}
