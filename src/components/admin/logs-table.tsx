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
  action: string;
  targetId?: string | null;
  detail?: string | null;
  createdAt: string | Date;
}

function tone(action: string): "default" | "secondary" | "destructive" {
  if (action.includes("fail") || action.includes("delete")) return "destructive";
  if (action.includes("success") || action.includes("verified")) return "default";
  return "secondary";
}

export function LogsTable({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-background/40 p-8 text-center text-sm text-muted-foreground">
        No logs yet.
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border/60 bg-background/40">
      <ScrollArea className="max-h-[28rem]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Detail</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Badge variant={tone(r.action)} className="font-mono text-xs">
                    {r.action}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-32 truncate font-mono text-xs">
                  {r.targetId || "—"}
                </TableCell>
                <TableCell className="max-w-48 truncate text-xs">
                  {r.detail || "—"}
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
