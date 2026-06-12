"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DeleteDialog } from "@/components/delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useAdminAdminsStore } from "@/stores/admin-admins-store";
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
  const deactivateAdmin = useAdminAdminsStore((state) => state.deactivateAdmin);

  const [marketplaceName, setMarketplaceName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [currencyCode, setCurrencyCode] = useState("NGN");
  const [countryCode, setCountryCode] = useState("NG");
  const [commissionRatePercent, setCommissionRatePercent] = useState("");
  const [abujaRate, setAbujaRate] = useState("");
  const [outsideAbujaRate, setOutsideAbujaRate] = useState("");
  const [weightUnitSizeKg, setWeightUnitSizeKg] = useState("");
  const [volumetricDivisor, setVolumetricDivisor] = useState("");
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
    setAbujaRate(String(settings.shipping.abujaRatePerShippingUnit));
    setOutsideAbujaRate(String(settings.shipping.outsideAbujaRatePerShippingUnit));
    setWeightUnitSizeKg(String(settings.shipping.weightUnitSizeKg));
    setVolumetricDivisor(String(settings.shipping.volumetricDivisor));
    setAutoPayoutThreshold(String(settings.payout.autoPayoutThreshold));
    setWeeklyPayoutDay(
      settings.payout.weeklyPayoutDay == null
        ? ""
        : String(settings.payout.weeklyPayoutDay),
    );
  }, [settings]);

  const isBootstrapping = isLoadingSettings && !settings;
  const activeAdminCount = useMemo(
    () => admins.filter((admin) => admin.isActive).length,
    [admins],
  );

  const handleSaveSettings = async () => {
    const commission = Number(commissionRatePercent);
    const abuja = Number(abujaRate);
    const outside = Number(outsideAbujaRate);
    const weightUnit = Number(weightUnitSizeKg);
    const divisor = Number(volumetricDivisor);
    const payoutThreshold = Number(autoPayoutThreshold);

    if (!marketplaceName.trim()) {
      toast.error("Marketplace name is required.");
      return;
    }
    if (supportEmail.trim() && !/\S+@\S+\.\S+/.test(supportEmail.trim())) {
      toast.error("Enter a valid support email.");
      return;
    }
    if ([commission, abuja, outside, weightUnit, divisor, payoutThreshold].some((value) => Number.isNaN(value))) {
      toast.error("All numeric settings must be valid numbers.");
      return;
    }
    if (commission < 0 || commission > 100) {
      toast.error("Commission rate must be between 0 and 100.");
      return;
    }
    if (weightUnit <= 0 || divisor <= 0) {
      toast.error("Weight unit size and volumetric divisor must be greater than zero.");
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
        shipping: {
          abujaRatePerShippingUnit: abuja,
          outsideAbujaRatePerShippingUnit: outside,
          weightUnitSizeKg: weightUnit,
          volumetricDivisor: divisor,
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

  const handleDeactivateAdmin = async () => {
    if (!deleteDialog.adminId) return;

    try {
      await deactivateAdmin(deleteDialog.adminId);
      setDeleteDialog({ open: false });
      toast.success("Admin account deactivated successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to deactivate admin",
      );
    }
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
          Configure platform, logistics, payout, and admin access settings
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
                Auto Payout Threshold (₦)
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
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Shipping Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Delivery is calculated by the platform from product logistics metadata. Sellers do not manage shipping options.
          </p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Abuja/FCT Rate Per Shipping Unit
              </label>
              <Input
                type="number"
                value={abujaRate}
                onChange={(event) => setAbujaRate(event.target.value)}
                disabled={isUpdatingSettings}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Outside Abuja Rate Per Shipping Unit
              </label>
              <Input
                type="number"
                value={outsideAbujaRate}
                onChange={(event) => setOutsideAbujaRate(event.target.value)}
                disabled={isUpdatingSettings}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Weight Unit Size (kg)
              </label>
              <Input
                type="number"
                step="0.1"
                value={weightUnitSizeKg}
                onChange={(event) => setWeightUnitSizeKg(event.target.value)}
                disabled={isUpdatingSettings}
              />
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
            </div>
          </div>

          <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
            <div className="space-y-2 max-w-sm">
              <label className="text-sm font-medium text-foreground">
                Advanced Logistics: Volumetric Divisor
              </label>
              <Input
                type="number"
                value={volumetricDivisor}
                onChange={(event) => setVolumetricDivisor(event.target.value)}
                disabled={isUpdatingSettings}
              />
              <p className="text-xs text-muted-foreground">
                Used internally for volumetric weight: length x width x height / divisor. Normally this should not be changed.
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
              <div className="space-y-2">
                {admins.map((admin) => (
                  <div
                    key={admin.id}
                    className="flex items-center justify-between gap-4 rounded-lg border border-border/50 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">
                        {admin.fullName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {admin.email}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {admin.isActive ? "Active" : "Inactive"}
                        {admin.lastActiveAt
                          ? ` · Last active ${new Date(
                              admin.lastActiveAt,
                            ).toLocaleDateString("en-NG")}`
                          : ""}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!admin.isActive || isUpdatingAdmin || activeAdminCount <= 1}
                      onClick={() =>
                        setDeleteDialog({
                          open: true,
                          adminId: admin.id,
                          adminName: admin.fullName,
                        })
                      }
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
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
                  onChange={(event) =>
                    setNewAdminFullName(event.target.value)
                  }
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
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Phone
                </label>
                <Input
                  value={newAdminPhone}
                  onChange={(event) => setNewAdminPhone(event.target.value)}
                  disabled={isCreatingAdmin}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Password
                </label>
                <Input
                  type="password"
                  value={newAdminPassword}
                  onChange={(event) =>
                    setNewAdminPassword(event.target.value)
                  }
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
        onOpenChange={(open) => setDeleteDialog((current) => ({ ...current, open }))}
        title="Deactivate Admin Account"
        description={`Are you sure you want to deactivate ${deleteDialog.adminName}? This admin will no longer be able to sign in.`}
        onConfirm={handleDeactivateAdmin}
        isLoading={isUpdatingAdmin}
      />
    </div>
  );
}
