"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Row {
  id: string;
  orderId: string;
  paymentId?: string | null;
  amount: number;
  status: string;
  username: string;
  createdAt: string | Date;
}

export function PaymentsTable({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-background/40 p-8 text-center text-sm text-muted-foreground">
        No payments yet.
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border/60 bg-background/40">
      <ScrollArea className="max-h-[28rem]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="max-w-32 truncate font-mono text-xs">
                  {r.orderId}
                </TableCell>
                <TableCell>{r.username}</TableCell>
                <TableCell>₹{(r.amount / 100).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      r.status === "paid"
                        ? "default"
                        : r.status === "failed"
                        ? "destructive"
                        : "secondary"
                    }
                    className="capitalize"
                  >
                    {r.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(r.createdAt).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
