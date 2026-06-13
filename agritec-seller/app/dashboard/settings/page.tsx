"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle,
  CreditCard,
  Lock,
  LogOut,
  Moon,
  Palette,
  Sun,
  Trash2,
  User,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useSellerAuthStore } from "@/stores/seller-auth-store";
import { useSellerSettingsStore } from "@/stores/seller-settings-store";

const AddressMapPicker = dynamic(
  () =>
    import("./components/address-map-picker").then(
      (mod) => mod.AddressMapPicker,
    ),
  { ssr: false },
);

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

type SettingsTab =
  | "profile"
  | "password"
  | "appearance"
  | "categories"
  | "banking";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const signOut = useSellerAuthStore((state) => state.signOut);
  const {
    profile,
    bankAccount,
    autoPayoutEnabled,
    canReceivePayouts,
    banks,
    bankVerification,
    isLoading,
    isSavingProfile,
    isChangingPassword,
    isLoadingBanks,
    isVerifyingBank,
    isSavingBank,
    fetchSettingsData,
    fetchBanks,
    updateProfile,
    changePassword,
    verifyBankAccount,
    saveBankAccount,
    updateAutoPayoutEnabled,
    removeBankAccount,
  } = useSellerSettingsStore((state) => state);

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [pendingAutoPayoutEnabled, setPendingAutoPayoutEnabled] = useState<
    boolean | null
  >(null);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);

  const [profileForm, setProfileForm] = useState({
    fullName: "",
    email: "",
    farmName: "",
    locationLabel: "",
    phone: "",
    description: "",
    fullAddress: "",
    city: "",
    state: "",
    latitude: "",
    longitude: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [bankForm, setBankForm] = useState({
    bankCode: "",
    accountNumber: "",
    autoPayoutEnabled: false,
  });

  const [notificationPrefs, setNotificationPrefs] = useState({
    newOrders: true,
    deliveryUpdates: true,
    priceAlerts: true,
    messages: true,
    productAlerts: true,
  });

  const tabs = useMemo(
    () => [
      { id: "profile", label: "Profile", icon: User },
      { id: "password", label: "Password", icon: Lock },
      { id: "appearance", label: "Appearance", icon: Palette },
      { id: "categories", label: "Categories", icon: User },
      { id: "banking", label: "Banking & Payouts", icon: CreditCard },
    ],
    [],
  );

  useEffect(() => {
    void fetchSettingsData();
  }, [fetchSettingsData]);

  useEffect(() => {
    if (!profile) return;
    setProfileForm({
      fullName: profile.fullName ?? "",
      email: profile.email ?? "",
      farmName: profile.sellerProfile?.farmName ?? "",
      locationLabel: profile.sellerProfile?.locationLabel ?? "",
      phone: profile.phone ?? "",
      description: profile.sellerProfile?.description ?? "",
      fullAddress: profile.sellerProfile?.fullAddress ?? "",
      city: profile.sellerProfile?.city ?? "",
      state: profile.sellerProfile?.state ?? "",
      latitude:
        profile.sellerProfile?.latitude != null
          ? String(profile.sellerProfile.latitude)
          : "",
      longitude:
        profile.sellerProfile?.longitude != null
          ? String(profile.sellerProfile.longitude)
          : "",
    });
  }, [profile]);

  useEffect(() => {
    setBankForm((current) => ({
      ...current,
      autoPayoutEnabled,
    }));
  }, [autoPayoutEnabled]);


  function openBankModal() {
    setBankForm({
      bankCode: bankAccount?.bankCode ?? "",
      accountNumber: bankAccount?.accountNumber ?? "",
      autoPayoutEnabled,
    });
    void fetchBanks();
    setIsBankModalOpen(true);
  }

  function handleProfileInputChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
  }

  function handlePasswordInputChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const { name, value } = event.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
  }

  function handleBankInputChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target;
    setBankForm((current) => ({ ...current, [name]: value }));
  }

  function handleCoordinateChange(latitude: number, longitude: number) {
    setProfileForm((current) => ({
      ...current,
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
    }));
  }

  async function handleProfileSave() {
    if (!profileForm.fullName.trim()) {
      toast.error("Full name is required.");
      return;
    }
    if (!profileForm.email.trim()) {
      toast.error("Email is required.");
      return;
    }
    if (!profileForm.farmName.trim()) {
      toast.error("Farm name is required.");
      return;
    }

    try {
      await updateProfile({
        fullName: profileForm.fullName.trim(),
        email: profileForm.email.trim().toLowerCase(),
        phone: profileForm.phone.trim() || null,
        farmName: profileForm.farmName.trim(),
        description: profileForm.description.trim() || null,
        locationLabel: profileForm.locationLabel.trim() || null,
        fullAddress: profileForm.fullAddress.trim() || null,
        city: profileForm.city.trim() || null,
        state: profileForm.state.trim() || null,
        latitude: profileForm.latitude.trim()
          ? Number(profileForm.latitude)
          : null,
        longitude: profileForm.longitude.trim()
          ? Number(profileForm.longitude)
          : null,
      });
      toast.success("Profile updated successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Request failed.");
    }
  }

  async function handlePasswordSave() {
    if (!passwordForm.currentPassword) {
      toast.error("Current password is required.");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    try {
      const message = await changePassword(passwordForm);
      toast.success(message);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Request failed.");
    }
  }

  async function handleVerifyBank() {
    if (!bankForm.bankCode) {
      toast.error("Select a bank first.");
      return;
    }
    if (!/^\d{10}$/.test(bankForm.accountNumber.trim())) {
      toast.error("Account number must be 10 digits.");
      return;
    }

    try {
      await verifyBankAccount({
        bankCode: bankForm.bankCode,
        accountNumber: bankForm.accountNumber.trim(),
      });
      toast.success("Bank account verified.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Request failed.");
    }
  }

  async function handleSaveBank() {
    if (!bankVerification) {
      toast.error("Verify the bank account before saving.");
      return;
    }

    if (
      bankVerification.bankCode !== bankForm.bankCode ||
      bankVerification.accountNumber !== bankForm.accountNumber.trim()
    ) {
      toast.error("Verify the current bank details before saving.");
      return;
    }

    try {
      await saveBankAccount({
        bankCode: bankForm.bankCode,
        accountNumber: bankForm.accountNumber.trim(),
        autoPayoutEnabled: bankForm.autoPayoutEnabled,
      });
      toast.success("Bank account saved successfully.");
      setIsBankModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Request failed.");
    }
  }

  async function handleAutoPayoutToggle(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    setPendingAutoPayoutEnabled(event.target.checked);
  }

  async function confirmAutoPayoutToggle() {
    if (pendingAutoPayoutEnabled == null) return;

    try {
      await updateAutoPayoutEnabled(pendingAutoPayoutEnabled);
      toast.success("Payout preference updated.");
      setPendingAutoPayoutEnabled(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Request failed.");
      setPendingAutoPayoutEnabled(null);
    }
  }
  async function handleRemoveBankAccount() {
    try {
      await removeBankAccount();
      toast.success("Bank account removed.");
      setIsBankModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Request failed.");
    }
  }

  if (isLoading && !profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 text-sm text-muted-foreground shadow-sm">
          <Spinner className="size-5" />
          <span>Loading seller settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div initial="hidden" animate="visible" variants={itemVariants}>
        <p className="mt-2 text-muted-foreground">
          Manage your account and preferences.
        </p>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={itemVariants}
        className="flex gap-2 overflow-x-auto border-b border-border"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          );
        })}
      </motion.div>

      <motion.div initial="hidden" animate="visible" variants={itemVariants}>
        {activeTab === "profile" && (
          <Card className="max-w-2xl p-8">
            <h2 className="mb-6 text-2xl font-bold text-foreground">
              Profile Information
            </h2>
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Full Name
                </label>
                <Input
                  name="fullName"
                  value={profileForm.fullName}
                  onChange={handleProfileInputChange}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Email Address
                </label>
                <Input
                  name="email"
                  type="email"
                  value={profileForm.email}
                  onChange={handleProfileInputChange}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Farm Name
                </label>
                <Input
                  name="farmName"
                  value={profileForm.farmName}
                  onChange={handleProfileInputChange}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Location Label
                </label>
                <Input
                  name="locationLabel"
                  value={profileForm.locationLabel}
                  onChange={handleProfileInputChange}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Phone Number
                </label>
                <Input
                  name="phone"
                  value={profileForm.phone}
                  onChange={handleProfileInputChange}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Description
                </label>
                <textarea
                  name="description"
                  value={profileForm.description}
                  onChange={handleProfileInputChange}
                  rows={4}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    City
                  </label>
                  <Input
                    name="city"
                    value={profileForm.city}
                    onChange={handleProfileInputChange}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    State
                  </label>
                  <Input
                    name="state"
                    value={profileForm.state}
                    onChange={handleProfileInputChange}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Latitude
                  </label>
                  <Input
                    name="latitude"
                    value={profileForm.latitude}
                    readOnly
                    disabled
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Longitude
                  </label>
                  <Input
                    name="longitude"
                    value={profileForm.longitude}
                    readOnly
                    disabled
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">
                      Saved Farm Location
                    </p>
                    <p className="text-sm text-slate-600 wrap-break-word">
                      {profileForm.fullAddress.trim() || "No farm location saved yet."}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Click below to search for your location or place the pin on the map.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={isLocationPickerOpen ? "outline" : "default"}
                    onClick={() => setIsLocationPickerOpen((current) => !current)}
                  >
                    {isLocationPickerOpen ? "Hide location search" : "Search or update location"}
                  </Button>
                </div>
              </div>

              {isLocationPickerOpen ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Coordinates are set from the selected map location. Use the search field to
                    find your farm, then select a result or adjust the pin on the map.
                  </p>

                  <AddressMapPicker
                    latitude={Number(profileForm.latitude) || 9.082}
                    longitude={Number(profileForm.longitude) || 8.6753}
                    addressText={profileForm.fullAddress}
                    onAddressTextChange={(value) =>
                      setProfileForm((current) => ({
                        ...current,
                        fullAddress: value,
                      }))
                    }
                    onAddressSelect={(payload) =>
                      setProfileForm((current) => ({
                        ...current,
                        fullAddress: payload.displayName,
                        city: payload.city ?? current.city,
                        state: payload.state ?? current.state,
                        locationLabel:
                          payload.city || payload.state
                            ? [payload.city, payload.state]
                                .filter(Boolean)
                                .join(", ")
                            : current.locationLabel,
                      }))
                    }
                    onCoordinateChange={handleCoordinateChange}
                  />
                </div>
              ) : null}


              <Button
                onClick={handleProfileSave}
                disabled={isSavingProfile}
                className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSavingProfile ? (
                  <>
                    <Spinner className="mr-2 size-4" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </Card>
        )}

        {activeTab === "password" && (
          <Card className="max-w-2xl p-8">
            <h2 className="mb-6 text-2xl font-bold text-foreground">
              Change Password
            </h2>
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Current Password
                </label>
                <Input
                  type="password"
                  name="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordInputChange}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  New Password
                </label>
                <Input
                  type="password"
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordInputChange}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Confirm New Password
                </label>
                <Input
                  type="password"
                  name="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordInputChange}
                />
              </div>
              <Button
                onClick={handlePasswordSave}
                disabled={isChangingPassword}
                className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isChangingPassword ? (
                  <>
                    <Spinner className="mr-2 size-4" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </div>
          </Card>
        )}

        {activeTab === "appearance" && (
          <Card className="max-w-2xl p-8">
            <h2 className="mb-6 text-2xl font-bold text-foreground">
              Appearance
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: "Light", value: "light", icon: Sun },
                { name: "Dark", value: "dark", icon: Moon },
              ].map((mode) => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.value}
                    onClick={() => setTheme(mode.value)}
                    className={`rounded-lg border p-4 transition-colors ${
                      theme === mode.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary"
                    }`}
                  >
                    <Icon className="mx-auto mb-2 size-6 text-foreground" />
                    <p className="font-medium text-foreground">{mode.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Use {mode.name} theme
                    </p>
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {activeTab === "banking" && (
          <Card className="max-w-2xl space-y-8 p-8">
            <div>
              <h2 className="mb-6 text-2xl font-bold text-foreground">
                Banking & Payouts
              </h2>

              <div className="space-y-6">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
                  <h3 className="mb-4 flex items-center gap-2 font-semibold text-foreground dark:text-primary-foreground">
                    <CreditCard className="size-5 text-blue-600" />
                    Bank Account Details
                  </h3>
                  {bankAccount ? (
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="mb-1 text-muted-foreground dark:text-primary-foreground">
                          Bank Name
                        </p>
                        <p className="font-semibold text-foreground dark:text-primary-foreground">
                          {bankAccount.bankName}
                        </p>
                      </div>
                      <div>
                        <p className="mb-1 text-muted-foreground dark:text-primary-foreground">
                          Account Number
                        </p>
                        <p className="font-mono font-semibold text-foreground dark:text-primary-foreground">
                          {bankAccount.accountNumber}
                        </p>
                      </div>
                      <div>
                        <p className="mb-1 text-muted-foreground dark:text-primary-foreground">
                          Account Name
                        </p>
                        <p className="font-semibold text-foreground dark:text-primary-foreground">
                          {bankAccount.accountName}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            canReceivePayouts
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {canReceivePayouts
                            ? "Payout Ready"
                            : "Needs Attention"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No bank account saved yet.
                    </p>
                  )}
                </div>

                <div className="rounded-lg border border-border p-6">
                  <h3 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
                    <CheckCircle className="size-5 text-emerald-600" />
                    Automatic Payouts
                  </h3>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-foreground">
                        Weekly Automatic Payouts
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Earnings are automatically withdrawn when your account
                        is eligible.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoPayoutEnabled}
                      onChange={handleAutoPayoutToggle}
                      disabled={isSavingBank}
                      className="mt-1 size-5 cursor-pointer accent-primary"
                    />
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={openBankModal}
                  className="w-full border-border text-foreground hover:bg-secondary hover:text-secondary-foreground"
                >
                  {bankAccount ? "Edit Payout Information" : "Add Bank Account"}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {activeTab === "categories" && (
          <Card className="max-w-2xl p-8">
            <h2 className="mb-6 text-2xl font-bold text-foreground">
              Product Categories
            </h2>
            <p className="text-sm text-muted-foreground">
              Categories are controlled by the platform. You can select from the
              fixed marketplace list when creating or editing products.
            </p>
          </Card>
        )}
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={itemVariants}
        className="max-w-2xl"
      >
        <Card className="border-destructive/20 p-8">
          <h2 className="mb-4 text-2xl font-bold text-destructive">
            Danger Zone
          </h2>
          <p className="mb-6 text-muted-foreground">Irreversible actions</p>
          <div className="space-y-3">
            <Button
              variant="outline"
              onClick={signOut}
              className="w-full border-destructive text-destructive hover:bg-destructive/10"
            >
              <LogOut className="mr-2 size-4" />
              Logout from This Device
            </Button>
            <Button
              variant="outline"
              disabled
              className="w-full border-destructive text-destructive hover:bg-destructive/10"
            >
              Delete Account
            </Button>
          </div>
        </Card>
      </motion.div>

      {pendingAutoPayoutEnabled !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm rounded-lg bg-card p-6 text-center"
          >
            <div className="mb-4 flex justify-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                <AlertTriangle className="size-8 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <h3 className="mb-2 text-lg font-bold text-foreground">
              Confirm Payout Preference
            </h3>
            <p className="mb-6 text-muted-foreground">
              {pendingAutoPayoutEnabled
                ? "Enable automatic payouts for this seller account?"
                : "Disable automatic payouts for this seller account?"}
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setPendingAutoPayoutEnabled(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={confirmAutoPayoutToggle}
                disabled={isSavingBank}
              >
                {isSavingBank ? (
                  <>
                    <Spinner className="mr-2 size-4" />
                    Saving...
                  </>
                ) : (
                  "Confirm"
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {isBankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md space-y-6 rounded-lg bg-card p-8"
          >
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {bankAccount
                  ? "Edit Payout Information"
                  : "Add Payout Information"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Select your bank, verify the account number, then save.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Bank
                </label>
                <select
                  name="bankCode"
                  value={bankForm.bankCode}
                  onChange={handleBankInputChange}
                  disabled={isLoadingBanks || isVerifyingBank || isSavingBank}
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground"
                >
                  <option value="" className="bg-background text-foreground">
                    Select bank
                  </option>
                  {banks.map((bank) => (
                    <option
                      key={bank.code}
                      value={bank.code}
                      className="bg-background text-foreground"
                    >
                      {bank.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Account Number
                </label>
                <Input
                  name="accountNumber"
                  value={bankForm.accountNumber}
                  onChange={handleBankInputChange}
                  disabled={isVerifyingBank || isSavingBank}
                />
              </div>

              {bankVerification && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
                  <p className="font-semibold text-emerald-800">
                    Verification successful
                  </p>
                  <p className="mt-1 text-emerald-700">
                    {bankVerification.accountName}
                  </p>
                  <p className="text-emerald-700">
                    {bankVerification.bankName}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="font-medium text-foreground">
                    Enable automatic payouts
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Only works after bank verification succeeds.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={bankForm.autoPayoutEnabled}
                  onChange={(event) =>
                    setBankForm((current) => ({
                      ...current,
                      autoPayoutEnabled: event.target.checked,
                    }))
                  }
                  className="size-5 cursor-pointer accent-primary"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => setIsBankModalOpen(false)}
                disabled={isVerifyingBank || isSavingBank}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={handleVerifyBank}
                disabled={isVerifyingBank || isSavingBank || isLoadingBanks}
                className="flex-1"
              >
                {isVerifyingBank ? (
                  <>
                    <Spinner className="mr-2 size-4" />
                    Verifying...
                  </>
                ) : (
                  "Verify Account"
                )}
              </Button>
              <Button
                onClick={handleSaveBank}
                disabled={isSavingBank || !bankVerification}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSavingBank ? (
                  <>
                    <Spinner className="mr-2 size-4" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>

            {bankAccount && (
              <Button
                variant="outline"
                onClick={handleRemoveBankAccount}
                disabled={isSavingBank || isVerifyingBank}
                className="w-full border-destructive text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="mr-2 size-4" />
                Remove Bank Account
              </Button>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}



