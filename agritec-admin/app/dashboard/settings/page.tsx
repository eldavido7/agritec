"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { settings } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { DeleteDialog } from "@/components/delete-dialog";
import { toast } from "sonner";

interface Admin {
  id: string;
  username: string;
  email: string;
}

const mockAdmins: Admin[] = [
  { id: "1", username: "admin@agritec.com", email: "admin@agritec.com" },
  { id: "2", username: "support@agritec.com", email: "support@agritec.com" },
];

export default function SettingsPage() {
  const [platformFee, setPlatformFee] = useState(settings.platformFee);
  const [commissionRate, setCommissionRate] = useState(settings.commissionRate);
  const [admins, setAdmins] = useState<Admin[]>(mockAdmins);
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [isDeletingAdmin, setIsDeletingAdmin] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    adminId?: string;
    adminName?: string;
  }>({ open: false });

  const handleSaveConfig = () => {
    setIsSavingConfig(true);
    setTimeout(() => {
      setIsSavingConfig(false);
      setIsSaved(true);
      toast.success("Platform settings updated successfully");
      setTimeout(() => setIsSaved(false), 2000);
    }, 800);
  };

  const handleAddAdmin = () => {
    if (newAdminUsername.trim() && newAdminPassword.trim()) {
      setIsCreatingAdmin(true);

      const newAdmin: Admin = {
        id: Date.now().toString(),
        username: newAdminUsername,
        email: newAdminUsername,
      };

      setTimeout(() => {
        setAdmins([...admins, newAdmin]);
        setNewAdminUsername("");
        setNewAdminPassword("");
        setIsCreatingAdmin(false);
        toast.success("New admin created successfully");
      }, 800);
    } else {
      toast.warning("Enter a valid username and password to create an admin");
    }
  };

  const handleDeleteAdmin = () => {
    if (deleteDialog.adminId) {
      setIsDeletingAdmin(true);
      setTimeout(() => {
        setAdmins(admins.filter((a) => a.id !== deleteDialog.adminId));
        setIsDeletingAdmin(false);
        setDeleteDialog({ open: false });
        toast.success("Admin deleted successfully");
      }, 800);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure platform settings
        </p>
      </div>

      {/* Platform Configuration */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Platform Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Platform Fee (%)
              </label>
              <Input
                type="number"
                step="0.1"
                value={platformFee}
                onChange={(e) => setPlatformFee(parseFloat(e.target.value))}
                className="border-border/50"
              />
              <p className="text-xs text-muted-foreground">
                Percentage fee on each transaction
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Commission Rate (%)
              </label>
              <Input
                type="number"
                step="0.1"
                value={commissionRate}
                onChange={(e) => setCommissionRate(parseFloat(e.target.value))}
                className="border-border/50"
              />
              <p className="text-xs text-muted-foreground">
                Percentage earned from transactions
              </p>
            </div>
          </div>

          <Button
            onClick={handleSaveConfig}
            className="w-full md:w-auto gap-2"
            disabled={isSavingConfig}
          >
            {isSavingConfig ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            {isSavingConfig ? "Saving..." : isSaved ? "Saved!" : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      {/* Admin Management */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Admin Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Admins */}
          <div>
            <h3 className="font-medium text-foreground mb-4">
              Existing Admins
            </h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {admins.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between p-3 border border-border/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-foreground text-sm">
                      {admin.username}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {admin.email}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setDeleteDialog({
                        open: true,
                        adminId: admin.id,
                        adminName: admin.username,
                      })
                    }
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Create New Admin */}
          <div className="border-t border-border/50 pt-6">
            <h3 className="font-medium text-foreground mb-4">
              Create New Admin
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Username
                </label>
                <Input
                  type="email"
                  placeholder="admin@example.com"
                  value={newAdminUsername}
                  onChange={(e) => setNewAdminUsername(e.target.value)}
                  className="border-border/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  className="border-border/50"
                />
              </div>

              <Button
                onClick={handleAddAdmin}
                className="w-full md:w-auto gap-2"
                disabled={
                  !newAdminUsername.trim() ||
                  !newAdminPassword.trim() ||
                  isCreatingAdmin
                }
              >
                {isCreatingAdmin ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {isCreatingAdmin ? "Creating..." : "Create Admin"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <DeleteDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        title="Delete Admin Account"
        description={`Are you sure you want to delete the admin account for ${deleteDialog.adminName}? This action cannot be undone.`}
        onConfirm={handleDeleteAdmin}
        isLoading={isDeletingAdmin}
      />
    </div>
  );
}
