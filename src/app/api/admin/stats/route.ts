import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-session";
import { Accounts, Payments, UnlockTokens, Logs } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await requireAdmin();
  const [accounts, payments, tokens, logs] = await Promise.all([
    Accounts.search("", { limit: 100000 }),
    Payments.list(100000),
    UnlockTokens.list(100000),
    Logs.list(100000),
  ]);

  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const paid = payments.filter((p) => p.status === "paid");
  const revenue = paid.reduce((s, p) => s + p.amount, 0) / 100;
  const todaysSales = paid.filter(
    (p) => new Date(p.createdAt).getTime() >= startOfToday.getTime()
  ).length;
  const monthSales = paid.filter(
    (p) => new Date(p.createdAt).getTime() >= startOfMonth.getTime()
  ).length;
  const successfulUnlocks = tokens.filter((t) => t.used).length;
  const expiredTokens = tokens.filter(
    (t) => !t.used && new Date(t.expiresAt).getTime() < now
  ).length;
  const failedUnlocks = logs.filter((l) => l.action === "unlock_failed").length;

  // Last 7-day revenue series for chart.
  const days: { date: string; revenue: number; sales: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const end = new Date(d);
    end.setDate(end.getDate() + 1);
    const dayPayments = paid.filter((p) => {
      const t = new Date(p.createdAt).getTime();
      return t >= d.getTime() && t < end.getTime();
    });
    days.push({
      date: d.toISOString().slice(5, 10),
      revenue: dayPayments.reduce((s, p) => s + p.amount, 0) / 100,
      sales: dayPayments.length,
    });
  }

  // Top accounts by sales.
  const byAccount = new Map<string, number>();
  for (const p of paid) {
    byAccount.set(p.accountId, (byAccount.get(p.accountId) || 0) + 1);
  }
  const topAccounts = await Promise.all(
    [...byAccount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(async ([id, count]) => {
        const a = await Accounts.getById(id);
        return { username: a?.username || id, count };
      })
  );

  return NextResponse.json({
    totalAccounts: accounts.total,
    todaysSales,
    monthSales,
    revenue,
    successfulUnlocks,
    expiredTokens,
    failedUnlocks,
    totalPayments: payments.length,
    recentLogs: logs.slice(0, 50),
    recentPayments: payments.slice(0, 50),
    recentTokens: tokens.slice(0, 50),
    series7d: days,
    topAccounts,
  });
}
