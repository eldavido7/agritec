"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DeleteDialog } from "@/components/delete-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminAdminsStore } from "@/stores/admin-admins-store";
import { useAdminAuthStore } from "@/stores/admin-auth-store";
import { useAdminSettingsStore } from "@/stores/admin-settings-store";

const weeklyPayoutDayOptions = [
  { value: "", label: "Disabled" },
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

export default function SettingsPage() {
  const settings = useAdminSettingsStore((state) => state.settings);
  const isLoadingSettings = useAdminSettingsStore((state) => state.isLoading);
  const isUpdatingSettings = useAdminSettingsStore((state) => state.isUpdating);
  const fetchSettings = useAdminSettingsStore((state) => state.fetchSettings);
  const updateSettings = useAdminSettingsStore((state) => state.updateSettings);

  const admins = useAdminAdminsStore((state) => state.admins);
  const isLoadingAdmins = useAdminAdminsStore((state) => state.isLoading);
  const isCreatingAdmin = useAdminAdminsStore((state) => state.isCreating);
  const isUpdatingAdmin = useAdminAdminsStore((state) => state.isUpdating);
  const fetchAdmins = useAdminAdminsStore((state) => state.fetchAdmins);
  const createAdmin = useAdminAdminsStore((state) => state.createAdmin);
  const deleteAdmin = useAdminAdminsStore((state) => state.deleteAdmin);
  const updateAdmin = useAdminAdminsStore((state) => state.updateAdmin);
  const currentAdmin = useAdminAuthStore((state) => state.user);

  const [marketplaceName, setMarketplaceName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [currencyCode, setCurrencyCode] = useState("NGN");
  const [countryCode, setCountryCode] = useState("NG");
  const [commissionRatePercent, setCommissionRatePercent] = useState("");
  const [autoPayoutThreshold, setAutoPayoutThreshold] = useState("");
  const [weeklyPayoutDay, setWeeklyPayoutDay] = useState("");

  const [newAdminFullName, setNewAdminFullName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminPhone, setNewAdminPhone] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    adminId?: string;
    adminName?: string;
  }>({ open: false });
  const [disableDialog, setDisableDialog] = useState<{
    open: boolean;
    adminId?: string;
    adminName?: string;
    nextIsActive?: boolean;
    activeSupportAssignments?: number;
  }>({ open: false });

  useEffect(() => {
    void fetchSettings();
    void fetchAdmins();
  }, [fetchAdmins, fetchSettings]);

  useEffect(() => {
    if (!settings) return;
    setMarketplaceName(settings.platform.marketplaceName);
    setSupportEmail(settings.platform.supportEmail || "");
    setCurrencyCode(settings.platform.currencyCode);
    setCountryCode(settings.platform.countryCode);
    setCommissionRatePercent(String(settings.commission.commissionRatePercent));
    setAutoPayoutThreshold(String(settings.payout.autoPayoutThreshold));
    setWeeklyPayoutDay(
      settings.payout.weeklyPayoutDay == null
        ? ""
        : String(settings.payout.weeklyPayoutDay),
    );
  }, [settings]);

  const isBootstrapping = isLoadingSettings && !settings;
  const activeAdmins = useMemo(
    () => admins.filter((admin) => admin.isActive),
    [admins],
  );
  const disabledAdmins = useMemo(
    () => admins.filter((admin) => !admin.isActive),
    [admins],
  );
  const activeAdminCount = activeAdmins.length;

  const handleSaveSettings = async () => {
    const commission = Number(commissionRatePercent);
    const payoutThreshold = Number(autoPayoutThreshold);

    if (!marketplaceName.trim()) {
      toast.error("Marketplace name is required.");
      return;
    }
    if (supportEmail.trim() && !/\S+@\S+\.\S+/.test(supportEmail.trim())) {
      toast.error("Enter a valid support email.");
      return;
    }
    if ([commission, payoutThreshold].some((value) => Number.isNaN(value))) {
      toast.error("All numeric settings must be valid numbers.");
      return;
    }
    if (commission < 0 || commission > 100) {
      toast.error("Commission rate must be between 0 and 100.");
      return;
    }

    try {
      await updateSettings({
        platform: {
          marketplaceName: marketplaceName.trim(),
          supportEmail: supportEmail.trim() ? supportEmail.trim() : null,
          currencyCode: currencyCode.trim().toUpperCase(),
          countryCode: countryCode.trim().toUpperCase(),
        },
        commission: {
          commissionRatePercent: commission,
        },
        payout: {
          autoPayoutThreshold: payoutThreshold,
          weeklyPayoutDay:
            weeklyPayoutDay === "" ? null : Number(weeklyPayoutDay),
        },
      });
      toast.success("Platform settings updated successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update settings",
      );
    }
  };

  const handleCreateAdmin = async () => {
    if (!newAdminFullName.trim()) {
      toast.error("Admin full name is required.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(newAdminEmail.trim())) {
      toast.error("Enter a valid admin email.");
      return;
    }
    if (newAdminPassword.trim().length < 6) {
      toast.error("Admin password must be at least 6 characters.");
      return;
    }

    try {
      await createAdmin({
        fullName: newAdminFullName.trim(),
        email: newAdminEmail.trim(),
        password: newAdminPassword,
        phone: newAdminPhone.trim() ? newAdminPhone.trim() : null,
      });
      setNewAdminFullName("");
      setNewAdminEmail("");
      setNewAdminPassword("");
      setNewAdminPhone("");
      toast.success("Admin account created successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create admin",
      );
    }
  };

  const handleDeleteAdmin = async () => {
    if (!deleteDialog.adminId) return;

    try {
      await deleteAdmin(deleteDialog.adminId);
      setDeleteDialog({ open: false });
      toast.success("Admin account deleted successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete admin",
      );
    }
  };

  const handleToggleAdminStatus = async () => {
    if (!disableDialog.adminId || disableDialog.nextIsActive == null) return;

    try {
      await updateAdmin(disableDialog.adminId, {
        isActive: disableDialog.nextIsActive,
      });
      setDisableDialog({ open: false });
      toast.success(
        disableDialog.nextIsActive
          ? "Admin account restored successfully"
          : "Admin account disabled successfully",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update admin account status",
      );
    }
  };

  const renderAdminRow = (
    admin: (typeof admins)[number],
    mode: "active" | "disabled",
  ) => {
    const isCurrentAdmin = currentAdmin?.id === admin.id;

    return (
      <div
        key={admin.id}
        className="flex items-center justify-between gap-4 rounded-lg border border-border/50 p-3"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-foreground">{admin.fullName}</p>
            <Badge variant={admin.isActive ? "default" : "secondary"}>
              {admin.isActive ? "Active" : "Disabled"}
            </Badge>
            {admin.hasHistoricalRecords ? (
              <Badge variant="secondary">Historical records</Badge>
            ) : (
              <Badge variant="outline">No history</Badge>
            )}
            {admin.activeAssignedSupportConversationCount > 0 ? (
              <Badge variant="outline">
                {admin.activeAssignedSupportConversationCount} active support assignment
                {admin.activeAssignedSupportConversationCount === 1 ? "" : "s"}
              </Badge>
            ) : null}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {admin.email}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {admin.lastActiveAt
              ? `Last active ${new Date(admin.lastActiveAt).toLocaleDateString("en-NG")}`
              : admin.isActive
                ? "No recent activity recorded"
                : "Disabled admins cannot sign in or receive support assignments."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {mode === "active" ? (
            <Button
              variant="outline"
              size="sm"
              disabled={isUpdatingAdmin}
              onClick={() => {
                if (isCurrentAdmin) {
                  toast.error("Logged in user cannot disable themselves.");
                  return;
                }
                if (activeAdminCount <= 1) {
                  toast.error("At least one active admin account must remain.");
                  return;
                }
                setDisableDialog({
                  open: true,
                  adminId: admin.id,
                  adminName: admin.fullName,
                  nextIsActive: false,
                  activeSupportAssignments:
                    admin.activeAssignedSupportConversationCount,
                });
              }}
            >
              Disable
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={isUpdatingAdmin}
              onClick={() => {
                if (isCurrentAdmin) {
                  toast.error("Logged in user cannot restore themselves here.");
                  return;
                }
                setDisableDialog({
                  open: true,
                  adminId: admin.id,
                  adminName: admin.fullName,
                  nextIsActive: true,
                });
              }}
            >
              Restore
            </Button>
          )}
          {admin.canDelete ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={isUpdatingAdmin}
              onClick={() => {
                if (isCurrentAdmin) {
                  toast.error("Logged in user cannot delete themselves.");
                  return;
                }
                setDeleteDialog({
                  open: true,
                  adminId: admin.id,
                  adminName: admin.fullName,
                });
              }}
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>
    );
  };

  if (isBootstrapping) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-muted-foreground">
        <Spinner className="size-4" />
        <span>Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="mt-1 text-muted-foreground">
          Configure platform, payout, and admin access settings
        </p>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Platform Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Marketplace Name
              </label>
              <Input
                value={marketplaceName}
                onChange={(event) => setMarketplaceName(event.target.value)}
                disabled={isUpdatingSettings}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Support Email
              </label>
              <Input
                type="email"
                value={supportEmail}
                onChange={(event) => setSupportEmail(event.target.value)}
                disabled={isUpdatingSettings}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Currency Code
              </label>
              <Input
                value={currencyCode}
                onChange={(event) => setCurrencyCode(event.target.value)}
                disabled={isUpdatingSettings}
                maxLength={3}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Country Code
              </label>
              <Input
                value={countryCode}
                onChange={(event) => setCountryCode(event.target.value)}
                disabled={isUpdatingSettings}
                maxLength={2}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Marketplace Commission Rate (%)
              </label>
              <Input
                type="number"
                step="0.01"
                value={commissionRatePercent}
                onChange={(event) =>
                  setCommissionRatePercent(event.target.value)
                }
                disabled={isUpdatingSettings}
              />
              <p className="text-xs text-muted-foreground">
                Applied to seller group subtotals server-side before seller wallet credits.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Auto Payout Threshold (NGN)
              </label>
              <Input
                type="number"
                value={autoPayoutThreshold}
                onChange={(event) =>
                  setAutoPayoutThreshold(event.target.value)
                }
                disabled={isUpdatingSettings}
              />
              <p className="text-xs text-muted-foreground">
                Sellers must reach this available balance before automatic weekly payout runs.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Weekly Auto Payout Day
              </label>
              <select
                value={weeklyPayoutDay}
                onChange={(event) => setWeeklyPayoutDay(event.target.value)}
                disabled={isUpdatingSettings}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                {weeklyPayoutDayOptions.map((option) => (
                  <option key={option.value || "disabled"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Controls the scheduled seller payout day. Logistics companies do not manage this.
              </p>
            </div>
          </div>
          <Button
            onClick={() => void handleSaveSettings()}
            className="w-full gap-2 md:w-auto"
            disabled={isUpdatingSettings}
          >
            {isUpdatingSettings ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            {isUpdatingSettings ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Admin Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="mb-4 font-medium text-foreground">
              Existing Admins
            </h3>
            {isLoadingAdmins && admins.length === 0 ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Spinner className="size-4" />
                <span>Loading admins...</span>
              </div>
            ) : (
              <Tabs defaultValue="active" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="active">
                    Active Admins ({activeAdmins.length})
                  </TabsTrigger>
                  <TabsTrigger value="disabled">
                    Disabled Admins ({disabledAdmins.length})
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="active" className="space-y-2">
                  {activeAdmins.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                      No active admins.
                    </div>
                  ) : (
                    activeAdmins.map((admin) => renderAdminRow(admin, "active"))
                  )}
                </TabsContent>
                <TabsContent value="disabled" className="space-y-2">
                  {disabledAdmins.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                      No disabled admins.
                    </div>
                  ) : (
                    disabledAdmins.map((admin) =>
                      renderAdminRow(admin, "disabled"),
                    )
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>

          <div className="border-t border-border/50 pt-6">
            <h3 className="mb-4 font-medium text-foreground">
              Create New Admin
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Full Name
                </label>
                <Input
                  value={newAdminFullName}
                  onChange={(event) => setNewAdminFullName(event.target.value)}
                  disabled={isCreatingAdmin}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Email
                </label>
                <Input
                  type="email"
                  value={newAdminEmail}
                  onChange={(event) => setNewAdminEmail(event.target.value)}
                  disabled={isCreatingAdmin}
                />
              </div>
              {/* <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Phone
                </label>
                <Input
                  value={newAdminPhone}
                  onChange={(event) => setNewAdminPhone(event.target.value)}
                  disabled={isCreatingAdmin}
                />
              </div> */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Password
                </label>
                <Input
                  type="password"
                  value={newAdminPassword}
                  onChange={(event) => setNewAdminPassword(event.target.value)}
                  disabled={isCreatingAdmin}
                />
              </div>
            </div>

            <Button
              onClick={() => void handleCreateAdmin()}
              className="mt-4 w-full gap-2 md:w-auto"
              disabled={isCreatingAdmin}
            >
              {isCreatingAdmin ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {isCreatingAdmin ? "Creating..." : "Create Admin"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <DeleteDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog((current) => ({ ...current, open }))
        }
        title="Delete Admin Account"
        description={`Are you sure you want to permanently delete ${deleteDialog.adminName}? This is only available for admins with no historical records or related activity.`}
        onConfirm={handleDeleteAdmin}
        isLoading={isUpdatingAdmin}
      />
      <DeleteDialog
        open={disableDialog.open}
        onOpenChange={(open) =>
          setDisableDialog((current) => ({ ...current, open }))
        }
        title={
          disableDialog.nextIsActive
            ? "Restore Admin Account"
            : "Disable Admin Account"
        }
        description={
          disableDialog.nextIsActive
            ? `Are you sure you want to restore ${disableDialog.adminName}? They will be able to sign in and receive support assignments again.`
            : `Are you sure you want to disable ${disableDialog.adminName}? This admin will not be able to sign in, and ${disableDialog.activeSupportAssignments ?? 0} active support conversation${disableDialog.activeSupportAssignments === 1 ? "" : "s"} assigned to them will be returned to the unassigned queue.`
        }
        onConfirm={handleToggleAdminStatus}
        isLoading={isUpdatingAdmin}
      />
    </div>
  );
}
