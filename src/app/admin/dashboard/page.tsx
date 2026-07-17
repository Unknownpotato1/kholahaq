"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  Users,
  ShoppingBag,
  Unlock,
  TimerOff,
  AlertTriangle,
  TrendingUp,
  LogOut,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { AccountsManager } from "@/components/admin/accounts-manager";
import { PaymentsTable } from "@/components/admin/payments-table";
import { LogsTable } from "@/components/admin/logs-table";

const StatsChart = dynamic(
  () => import("@/components/admin/stats-chart").then((m) => m.StatsChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-56 w-full" />,
  }
);

interface Stats {
  totalAccounts: number;
  todaysSales: number;
  monthSales: number;
  revenue: number;
  successfulUnlocks: number;
  expiredTokens: number;
  failedUnlocks: number;
  totalPayments: number;
  series7d: { date: string; revenue: number; sales: number }[];
  topAccounts: { username: string; count: number }[];
  recentLogs: any[];
  recentPayments: any[];
  recentTokens: any[];
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stats", { cache: "no-store" });
      if (res.status === 401) {
        router.push("/admin/login?from=/admin/dashboard");
        return;
      }
      const data = await res.json();
      setStats(data);
    } catch {
      toast.error("Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Admin Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage accounts, payments, and unlocks.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={logout}>
          <LogOut className="mr-1 h-4 w-4" /> Sign out
        </Button>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Total Accounts"
          value={stats?.totalAccounts}
          loading={loading}
          tint="violet"
        />
        <StatCard
          icon={<ShoppingBag className="h-4 w-4" />}
          label="Today's Sales"
          value={stats?.todaysSales}
          loading={loading}
          tint="emerald"
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Monthly Sales"
          value={stats?.monthSales}
          loading={loading}
          tint="amber"
        />
        <StatCard
          icon={<Wallet className="h-4 w-4" />}
          label="Revenue (₹)"
          value={stats?.revenue?.toFixed(2)}
          loading={loading}
          tint="fuchsia"
        />
        <StatCard
          icon={<Unlock className="h-4 w-4" />}
          label="Successful Unlocks"
          value={stats?.successfulUnlocks}
          loading={loading}
          tint="emerald"
        />
        <StatCard
          icon={<TimerOff className="h-4 w-4" />}
          label="Expired Tokens"
          value={stats?.expiredTokens}
          loading={loading}
          tint="amber"
        />
        <StatCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Failed Unlocks"
          value={stats?.failedUnlocks}
          loading={loading}
          tint="rose"
        />
        <StatCard
          icon={<ShoppingBag className="h-4 w-4" />}
          label="Total Payments"
          value={stats?.totalPayments}
          loading={loading}
          tint="violet"
        />
      </div>

      {/* CHART */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mt-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>Last 7 days</CardTitle>
            <CardDescription>Revenue and sales by day.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading || !stats ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <StatsChart series={stats.series7d} top={stats.topAccounts} />
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* TABS */}
      <div className="mt-6">
        <Tabs defaultValue="accounts">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="accounts">
              <Users className="mr-1 h-3.5 w-3.5" /> Accounts
            </TabsTrigger>
            <TabsTrigger value="payments">
              <Wallet className="mr-1 h-3.5 w-3.5" /> Payments
            </TabsTrigger>
            <TabsTrigger value="logs">
              <AlertTriangle className="mr-1 h-3.5 w-3.5" /> Logs
            </TabsTrigger>
          </TabsList>
          <TabsContent value="accounts" className="mt-4">
            <AccountsManager />
          </TabsContent>
          <TabsContent value="payments" className="mt-4">
            <PaymentsTable rows={stats?.recentPayments || []} />
          </TabsContent>
          <TabsContent value="logs" className="mt-4">
            <LogsTable rows={stats?.recentLogs || []} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  loading,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number | string;
  loading?: boolean;
  tint: "violet" | "emerald" | "amber" | "fuchsia" | "rose";
}) {
  const tints: Record<string, string> = {
    violet: "from-violet-500/20 to-violet-500/5 text-violet-600 dark:text-violet-300",
    emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-300",
    amber: "from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-300",
    fuchsia: "from-fuchsia-500/20 to-fuchsia-500/5 text-fuchsia-600 dark:text-fuchsia-300",
    rose: "from-rose-500/20 to-rose-500/5 text-rose-600 dark:text-rose-300",
  };
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span
            className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${tints[tint]}`}
          >
            {icon}
          </span>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">{label}</div>
        {loading ? (
          <Skeleton className="mt-1 h-7 w-16" />
        ) : (
          <div className="mt-1 text-2xl font-semibold tracking-tight">
            {value ?? 0}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
