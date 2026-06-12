"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useAdminAuditStore } from "@/stores/admin-audit-store";

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatActionLabel(action: string) {
  return action.replaceAll(".", " ");
}

export default function AuditLogsPage() {
  const logs = useAdminAuditStore((state) => state.logs);
  const pagination = useAdminAuditStore((state) => state.pagination);
  const isLoading = useAdminAuditStore((state) => state.isLoading);
  const loaded = useAdminAuditStore((state) => state.loaded);
  const fetchLogs = useAdminAuditStore((state) => state.fetchLogs);

  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    void fetchLogs({ page, pageSize: 10 });
  }, [fetchLogs, page]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPage(1);
      void fetchLogs({
        force: true,
        page: 1,
        pageSize: 10,
        search: searchTerm.trim() || undefined,
        action: actionFilter.trim() || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
      });
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [actionFilter, dateFrom, dateTo, fetchLogs, searchTerm]);

  const availableActions = useMemo(
    () => Array.from(new Set(logs.map((log) => log.action))).sort(),
    [logs],
  );

  const handleExport = () => {
    const rows = [
      ["Action", "Admin", "Email", "Target Type", "Target ID", "Metadata", "Timestamp"],
      ...logs.map((log) => [
        formatActionLabel(log.action),
        log.admin?.fullName || "",
        log.admin?.email || "",
        log.targetType,
        log.targetId || "",
        log.metadata ? JSON.stringify(log.metadata) : "",
        formatDate(log.createdAt),
      ]),
    ];

    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `admin-audit-page-${page}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
    toast.success("Audit logs exported successfully");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="mt-1 text-muted-foreground">
            Platform activity trail for admin actions and system changes
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full gap-2 md:w-auto"
          onClick={() => setExportOpen(true)}
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="mb-1 text-sm text-muted-foreground">Current Page Logs</p>
            <p className="text-3xl font-bold text-foreground">{logs.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="mb-1 text-sm text-muted-foreground">Total Logs</p>
            <p className="text-3xl font-bold text-primary">{pagination.total}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="mb-1 text-sm text-muted-foreground">Action Types</p>
            <p className="text-3xl font-bold text-secondary">
              {availableActions.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative xl:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by action, admin, target type, or target id..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="">All actions</option>
              {availableActions.map((action) => (
                <option key={action} value={action}>
                  {formatActionLabel(action)}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/50">
        <CardHeader className="border-b border-border/30 pb-4">
          <CardTitle>Audit Logs</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/30 bg-muted/30">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Admin</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Target Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Target ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Metadata</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-border/30 transition-colors hover:bg-muted/30"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-foreground">
                      {formatActionLabel(log.action)}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-foreground">
                        {log.admin?.fullName || "Unknown admin"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {log.admin?.email || ""}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">{log.targetType}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{log.targetId || "-"}</td>
                    <td className="max-w-sm px-6 py-4 text-xs text-muted-foreground">
                      <div className="line-clamp-3 break-words">
                        {log.metadata ? JSON.stringify(log.metadata) : "No metadata"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isLoading && !loaded ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Spinner className="size-4" />
              <span>Loading audit logs...</span>
            </div>
          ) : null}

          {!isLoading && logs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No audit logs found
            </div>
          ) : null}

          {pagination.totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-border/30 py-4">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === pagination.totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Current Audit View</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This exports the logs currently loaded on this page with the active filters.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport}>Download CSV</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
