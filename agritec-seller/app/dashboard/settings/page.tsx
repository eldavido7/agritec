"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  User,
  Lock,
  Bell,
  Palette,
  LogOut,
  Sun,
  Moon,
  CreditCard,
  CheckCircle,
} from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { getSellerMockData } from "@/lib/mock-data";

const AddressMapPicker = dynamic(
  () =>
    import("./components/address-map-picker").then(
      (mod) => mod.AddressMapPicker,
    ),
  { ssr: false },
);

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const seller = getSellerMockData();
  const sellerWallet = seller.wallet;
  const [activeTab, setActiveTab] = useState("profile");
  const [formData, setFormData] = useState({
    fullName: seller.name,
    email: seller.email,
    farmName: seller.farmName,
    location: seller.location,
    phone: "+234 8 1234 5678",
    fullAddress: seller.address.fullAddress,
    latitude: String(seller.address.latitude),
    longitude: String(seller.address.longitude),
    landmark: seller.address.landmark ?? "",
  });
  const [isEditPayoutModalOpen, setIsEditPayoutModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [payoutFormData, setPayoutFormData] = useState({
    bankName: sellerWallet.bankAccount.name,
    accountName: sellerWallet.bankAccount.accountName,
    accountNumber: sellerWallet.bankAccount.accountNumber,
  });


  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "password", label: "Password", icon: Lock },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "categories", label: "Categories", icon: User },
    { id: "banking", label: "Banking & Payouts", icon: CreditCard },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePayoutFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPayoutFormData((prev) => ({ ...prev, [name]: value }));
  };

  const openEditPayoutModal = () => {
    setPayoutFormData({
      bankName: sellerWallet.bankAccount.name,
      accountName: sellerWallet.bankAccount.accountName,
      accountNumber: sellerWallet.bankAccount.accountNumber,
    });
    setIsEditPayoutModalOpen(true);
  };

  const handleUpdatePayoutInfo = () => {
    // In a real app, you'd make an API call here.
    console.log("Updating payout info:", payoutFormData);
    setIsConfirmModalOpen(false);
    setIsEditPayoutModalOpen(false);
    toast.success("Payout information updated successfully!");
  };

  const handleSave = () => {
    // Save logic
    console.log("Saving settings:", formData);
  };

  const handleCoordinateChange = (latitude: number, longitude: number) => {
    setFormData((prev) => ({
      ...prev,
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
    }));
  };


  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial="hidden" animate="visible" variants={itemVariants}>
        <div>
          <p className="text-muted-foreground mt-2">
            Manage your account and preferences
          </p>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={itemVariants}
        className="flex gap-2 border-b border-border overflow-x-auto"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </motion.div>

      {/* Content */}
      <motion.div initial="hidden" animate="visible" variants={itemVariants}>
        {/* Profile Tab */}
        {activeTab === "profile" && (
          <Card className="p-8 max-w-2xl">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Profile Information
            </h2>
            <div className="space-y-6">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Full Name
                </label>
                <Input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email Address
                </label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full"
                />
              </div>

              {/* Farm Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Farm Name
                </label>
                <Input
                  type="text"
                  name="farmName"
                  value={formData.farmName}
                  onChange={handleChange}
                  className="w-full"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Location
                </label>
                <Input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Latitude
                  </label>
                  <Input
                    type="text"
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleChange}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Longitude
                  </label>
                  <Input
                    type="text"
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleChange}
                    className="w-full"
                  />
                </div>
              </div>

              <AddressMapPicker
                latitude={Number(formData.latitude) || seller.address.latitude}
                longitude={Number(formData.longitude) || seller.address.longitude}
                addressText={formData.fullAddress}
                onAddressTextChange={(value) =>
                  setFormData((prev) => ({ ...prev, fullAddress: value }))
                }
                onAddressSelect={(payload) =>
                  setFormData((prev) => ({
                    ...prev,
                    fullAddress: payload.displayName,
                    location:
                      payload.city || payload.state
                        ? [payload.city, payload.state]
                            .filter((item) => item && item.trim().length > 0)
                            .join(", ")
                        : prev.location,
                  }))
                }
                onCoordinateChange={handleCoordinateChange}
              />

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Landmark (Optional)
                </label>
                <Input
                  type="text"
                  name="landmark"
                  value={formData.landmark}
                  onChange={handleChange}
                  className="w-full"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full"
                />
              </div>

              <Button
                onClick={handleSave}
                className="bg-primary hover:bg-primary/90 text-primary-foreground mt-4"
              >
                Save Changes
              </Button>
            </div>
          </Card>
        )}

        {/* Password Tab */}
        {activeTab === "password" && (
          <Card className="p-8 max-w-2xl">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Change Password
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Current Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  New Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Confirm New Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="w-full"
                />
              </div>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground mt-4">
                Update Password
              </Button>
            </div>
          </Card>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <Card className="p-8 max-w-2xl">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Notification Preferences
            </h2>
            <div className="space-y-4">
              {[
                {
                  label: "New Orders",
                  description: "Get notified when you receive new orders",
                },
                {
                  label: "Delivery Updates",
                  description: "Updates on order delivery status",
                },
                {
                  label: "Price Alerts",
                  description: "Get alerted on price changes in the market",
                },
                {
                  label: "Messages",
                  description: "New messages from customers and partners",
                },
                {
                  label: "Product Alerts",
                  description: "Low stock and product status alerts",
                },
              ].map((notif, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-secondary/50 dark:hover:bg-secondary/30 dark:hover:text-white transition-colors"
                >
                  <div>
                    <p className="font-medium text-foreground">{notif.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {notif.description}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-5 h-5 cursor-pointer accent-primary"
                  />
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Appearance Tab */}
        {activeTab === "appearance" && (
          <Card className="p-8 max-w-2xl">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Appearance
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-foreground mb-3">
                  Theme Preference
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { name: "Light", value: "light", icon: Sun },
                    { name: "Dark", value: "dark", icon: Moon },
                  ].map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.value}
                        onClick={() => setTheme(t.value)}
                        className={`p-4 border rounded-lg transition-colors ${
                          theme === t.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary"
                        }`}
                      >
                        <Icon className="w-6 h-6 mx-auto text-foreground mb-2" />
                        <p className="font-medium text-foreground">{t.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Use {t.name} theme
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Banking & Payouts Tab */}
        {activeTab === "banking" && (
          <Card className="p-8 max-w-2xl space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Banking & Payouts
              </h2>

              {/* Bank Account Details */}
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="font-semibold text-foreground dark:text-background mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                    Bank Account Details
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-muted-foreground dark:text-muted mb-1">Bank Name</p>
                      <p className="font-semibold text-foreground dark:text-background">
                        {sellerWallet.bankAccount.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground dark:text-muted mb-1">
                        Account Number
                      </p>
                      <p className="font-mono font-semibold text-foreground dark:text-background">
                        {sellerWallet.bankAccount.accountNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground dark:text-muted mb-1">Account Name</p>
                      <p className="font-semibold text-foreground dark:text-background">
                        {sellerWallet.bankAccount.accountName}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground dark:text-muted mb-1">
                        Last Payout Date
                      </p>
                      <p className="font-semibold text-foreground dark:text-background">
                        {sellerWallet.bankAccount.lastPayoutDate.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Automatic Payouts */}
                <div className="border border-border rounded-lg p-6">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    Automatic Payouts
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground">
                          Weekly Automatic Payouts
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Earnings are automatically withdrawn every Monday to
                          your registered bank account
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked={sellerWallet.automaticPayoutsEnabled}
                        className="w-5 h-5 cursor-pointer accent-primary mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Payout Information */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                  <h3 className="font-semibold text-foreground dark:text-background mb-3">
                    Payout Information
                  </h3>
                  <ul className="text-sm space-y-2 text-amber-900">
                    <li>• Minimum withdrawal amount: ₦10,000</li>
                    <li>• Processing time: 2-3 business days</li>
                    <li>
                      • Withdrawals are processed Monday to Friday, 9 AM - 4 PM
                      WAT
                    </li>
                    <li>• Transaction fees may apply depending on your bank</li>
                    <li>
                      • You can request withdrawals anytime from your Wallet
                      page
                    </li>
                  </ul>
                </div>

                {/* Current Balance */}
                {/* <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">
                      Available Balance
                    </p>
                    <p className="text-2xl font-bold text-emerald-700">
                      {formatCurrency(sellerWallet.availableBalance)}
                    </p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">
                      Pending Balance
                    </p>
                    <p className="text-2xl font-bold text-amber-700">
                      {formatCurrency(sellerWallet.pendingBalance)}
                    </p>
                  </div>
                </div> */}

                <Button
                  variant="outline"
                  onClick={openEditPayoutModal}
                  className="w-full border-border text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white"
                >
                  Edit Payout Information
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Categories Tab */}
        {activeTab === "categories" && (
          <Card className="p-8 max-w-2xl">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Product Categories
            </h2>
            <p className="text-muted-foreground text-sm">
              Categories are controlled by the platform. You can select from the fixed marketplace list when creating or editing products.
            </p>
          </Card>
        )}
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={itemVariants}
        className="max-w-2xl"
      >
        <Card className="p-8 border-destructive/20">
          <h2 className="text-2xl font-bold text-destructive mb-4">
            Danger Zone
          </h2>
          <p className="text-muted-foreground mb-6">Irreversible actions</p>
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full border-destructive text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout from All Devices
            </Button>
            <Button
              variant="outline"
              className="w-full border-destructive text-destructive hover:bg-destructive/10"
            >
              Delete Account
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* Edit Payout Modal */}
      {isEditPayoutModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-lg max-w-md w-full p-8 space-y-6"
          >
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Edit Payout Information
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Update your bank account details for payouts.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Bank Name
                </label>
                <Input
                  type="text"
                  name="bankName"
                  value={payoutFormData.bankName}
                  onChange={handlePayoutFormChange}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Account Name
                </label>
                <Input
                  type="text"
                  name="accountName"
                  value={payoutFormData.accountName}
                  onChange={handlePayoutFormChange}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Account Number
                </label>
                <Input
                  type="text"
                  name="accountNumber"
                  value={payoutFormData.accountNumber}
                  onChange={handlePayoutFormChange}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setIsEditPayoutModalOpen(false)}
                className="flex-1 border-border text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={() => setIsConfirmModalOpen(true)}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Save Changes
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-lg max-w-sm w-full p-6 text-center"
          >
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">
              Confirm Update
            </h3>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to update your payout information? This
              action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-border text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white"
                onClick={() => setIsConfirmModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={handleUpdatePayoutInfo}
              >
                Confirm & Save
              </Button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}

