'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { auditLogs } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const actionColors: Record<string, string> = {
  'Order Created': 'bg-blue-100 text-blue-700',
  'User Verified': 'bg-green-100 text-green-700',
  'Payout Processed': 'bg-purple-100 text-purple-700',
  'Listing Updated': 'bg-orange-100 text-orange-700',
  'Account Created': 'bg-cyan-100 text-cyan-700',
};

export default function AuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [exportOpen, setExportOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState('2024-05-16');
  const [dateTo, setDateTo] = useState('2024-05-20');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filteredLogs = auditLogs
    .filter((log) => {
      const matchesSearch =
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.admin?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        log.target.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    })
    .sort((a, b) => {
      const aTime = new Date(a.timestamp).getTime();
      const bTime = new Date(b.timestamp).getTime();
      return sortOrder === 'desc' ? bTime - aTime : aTime - bTime;
    });
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const paginatedLogs = useMemo(
    () => filteredLogs.slice((page - 1) * pageSize, page * pageSize),
    [filteredLogs, page],
  );

  const exportLogs = () => {
    const fromTime = new Date(dateFrom).getTime();
    const toTime = new Date(`${dateTo} 23:59`).getTime();
    const logsInRange = auditLogs.filter((log) => {
      const time = new Date(log.timestamp).getTime();
      return time >= fromTime && time <= toTime;
    });
    const rows = [
      ['Action', 'User', 'Target', 'Details', 'Timestamp'],
      ...logsInRange.map((log) => [log.action, log.admin, log.target, log.details, log.timestamp]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${dateFrom}-to-${dateTo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
    toast.success('Audit logs exported in spreadsheet format');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-muted-foreground mt-1">Platform activity and system events</p>
        </div>
        <Button variant="outline" className="w-full md:w-auto gap-2" onClick={() => setExportOpen(true)}>
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Total Logs</p>
            <p className="text-3xl font-bold text-foreground">{auditLogs.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Actions</p>
            <p className="text-3xl font-bold text-primary">{new Set(auditLogs.map(l => l.action)).size}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Admins</p>
            <p className="text-3xl font-bold text-secondary">{new Set(auditLogs.map(l => (l as any).admin)).size}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by action, user, or target..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-border/50"
              />
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground mb-2">Sort Order</p>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="border-border/50 overflow-hidden">
        <CardHeader className="border-b border-border/30 pb-4">
          <CardTitle>Activity Logs ({filteredLogs.length})</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/30 bg-muted/30">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">User</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Target</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Details</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLogs.map((log) => (
                  <tr key={log.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <Badge
                        variant="outline"
                        className={actionColors[log.action] || 'bg-gray-100 text-gray-700'}
                      >
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-foreground text-sm">{log.admin}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">{log.target}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground max-w-xs">{log.details}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">{log.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLogs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No logs found</p>
            </div>
          )}
          {filteredLogs.length > pageSize && (
            <div className="flex items-center justify-between border-t border-border/30 py-4">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Audit Logs</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="mb-2 text-sm font-medium">From</p>
              <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">To</p>
              <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportOpen(false)}>Cancel</Button>
            <Button onClick={exportLogs}>Download</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
