"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useAdminLogisticsStore } from "@/stores/admin-logistics-store";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function verificationBadge(status: string) {
  switch (status) {
    case "VERIFIED":
      return "bg-green-100 text-green-700";
    case "SUSPENDED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-yellow-100 text-yellow-700";
  }
}

export default function LogisticsPage() {
  const logisticsCompanies = useAdminLogisticsStore((state) => state.logisticsCompanies);
  const selectedLogistics = useAdminLogisticsStore((state) => state.selectedLogistics);
  const isLoading = useAdminLogisticsStore((state) => state.isLoading);
  const isDetailLoading = useAdminLogisticsStore((state) => state.isDetailLoading);
  const isUpdating = useAdminLogisticsStore((state) => state.isUpdating);
  const fetchLogisticsCompanies = useAdminLogisticsStore((state) => state.fetchLogisticsCompanies);
  const fetchLogisticsDetail = useAdminLogisticsStore((state) => state.fetchLogisticsDetail);
  const updateLogisticsStatus = useAdminLogisticsStore((state) => state.updateLogisticsStatus);
  const clearSelectedLogistics = useAdminLogisticsStore((state) => state.clearSelectedLogistics);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    void fetchLogisticsCompanies().catch(() => undefined);
  }, [fetchLogisticsCompanies]);

  const filteredCompanies = useMemo(
    () =>
      logisticsCompanies.filter((company) => {
        const search = searchTerm.toLowerCase();
        return (
          company.companyName.toLowerCase().includes(search) ||
          company.fullName.toLowerCase().includes(search) ||
          company.email.toLowerCase().includes(search) ||
          (company.state || "").toLowerCase().includes(search)
        );
      }),
    [logisticsCompanies, searchTerm]
  );

  const pendingCount = logisticsCompanies.filter(
    (company) => company.verificationStatus === "PENDING_VERIFICATION"
  ).length;
  const verifiedCount = logisticsCompanies.filter(
    (company) => company.verificationStatus === "VERIFIED"
  ).length;
  const suspendedCount = logisticsCompanies.filter(
    (company) => company.verificationStatus === "SUSPENDED"
  ).length;
  const nationwidePricing = selectedLogistics?.pricingSettings.find(
    (pricing) => pricing.pricingScope === "NATIONWIDE"
  );
  const statePricing = selectedLogistics?.pricingSettings.filter(
    (pricing) => pricing.pricingScope === "STATE"
  ) ?? [];

  const handleOpenDetail = async (id: string) => {
    try {
      await fetchLogisticsDetail(id, { force: true });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load logistics details"
      );
    }
  };

  const handleAction = async (action: "verify" | "suspend" | "reactivate") => {
    if (!selectedLogistics) return;

    try {
      await updateLogisticsStatus(selectedLogistics.id, action);
      toast.success(`Logistics company ${action}d successfully`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update logistics company"
      );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="mt-1 text-muted-foreground">
          Review, verify, suspend, and reactivate marketplace logistics
          companies
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="mb-1 text-sm text-muted-foreground">Companies</p>
            <p className="text-3xl font-bold text-foreground">
              {logisticsCompanies.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="mb-1 text-sm text-muted-foreground">
              Pending Verification
            </p>
            <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="mb-1 text-sm text-muted-foreground">Verified</p>
            <p className="text-3xl font-bold text-green-600">{verifiedCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="mb-1 text-sm text-muted-foreground">Suspended</p>
            <p className="text-3xl font-bold text-red-600">{suspendedCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by company, owner, email, or state..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/50">
        <CardHeader className="border-b border-border/30 pb-4">
          <CardTitle>
            Logistics Companies ({filteredCompanies.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/30 bg-muted/30">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Owner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Coverage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Assigned Groups
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.map((company) => (
                  <tr
                    key={company.id}
                    className="border-b border-border/30 transition-colors hover:bg-muted/30"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-foreground">
                          {company.companyName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {company.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {company.fullName}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {[company.city, company.state]
                        .filter(Boolean)
                        .join(", ") || "Unspecified"}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {company.coverageCount} area
                      {company.coverageCount === 1 ? "" : "s"}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {company.assignedGroupCount}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant="outline"
                        className={verificationBadge(
                          company.verificationStatus,
                        )}
                      >
                        {company.verificationStatus.replaceAll("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {formatDate(company.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="outline"
                        className="gap-2 dark:hover:text-white dark:hover:bg-secondary/50"
                        size="sm"
                        onClick={() => void handleOpenDetail(company.id)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredCompanies.length === 0 && isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Spinner className="size-4" />
              <span>Loading logistics companies...</span>
            </div>
          ) : null}
          {filteredCompanies.length === 0 && !isLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              No logistics companies found
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedLogistics}
        onOpenChange={(open) => !open && clearSelectedLogistics()}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedLogistics
                ? selectedLogistics.companyName
                : "Logistics Company"}
            </DialogTitle>
          </DialogHeader>

          {isDetailLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <Spinner className="size-4" />
              <span>Loading logistics details...</span>
            </div>
          ) : selectedLogistics ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="Owner" value={selectedLogistics.fullName} />
                <Metric
                  label="Status"
                  value={selectedLogistics.verificationStatus.replaceAll(
                    "_",
                    " ",
                  )}
                />
                <Metric
                  label="Coverage"
                  value={
                    selectedLogistics.coverageType === "NATIONWIDE"
                      ? "Nationwide"
                      : `${selectedLogistics.coveredStates.length} state(s)`
                  }
                />
                <Metric
                  label="Assigned Groups"
                  value={String(selectedLogistics.assignedGroupCount)}
                />
              </div>

              <div className="rounded-md border border-border/50 p-3">
                <p className="mb-2 text-muted-foreground">Company Details</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <p>
                    <span className="text-muted-foreground">Email:</span>{" "}
                    {selectedLogistics.email}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Phone:</span>{" "}
                    {selectedLogistics.phone || "N/A"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">
                      Contact Person:
                    </span>{" "}
                    {selectedLogistics.contactPersonName || "N/A"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Location:</span>{" "}
                    {[selectedLogistics.city, selectedLogistics.state]
                      .filter(Boolean)
                      .join(", ") || "N/A"}
                  </p>
                </div>
                {selectedLogistics.businessAddress ? (
                  <p className="mt-2">
                    <span className="text-muted-foreground">Address:</span>{" "}
                    {selectedLogistics.businessAddress}
                  </p>
                ) : null}
                {selectedLogistics.description ? (
                  <p className="mt-2">
                    <span className="text-muted-foreground">Description:</span>{" "}
                    {selectedLogistics.description}
                  </p>
                ) : null}
              </div>

              <div className="rounded-md border border-border/50 p-3">
                <p className="mb-2 text-muted-foreground">Pricing Settings</p>
                {selectedLogistics.pricingSettings.length > 0 ? (
                  <div className="space-y-3">
                    {nationwidePricing ? (
                      <div className="rounded-md border border-border/40 p-3">
                        <p className="mb-2 font-medium text-foreground">
                          Nationwide pricing
                        </p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          <p>
                            Minimum fee: NGN{" "}
                            {nationwidePricing.minimumFee.toLocaleString()}
                          </p>
                          <p>
                            Additional unit fee: NGN{" "}
                            {nationwidePricing.additionalUnitFee.toLocaleString()}
                          </p>
                          <p>
                            Weight unit size:{" "}
                            {nationwidePricing.weightUnitSizeKg ?? 0}kg
                          </p>
                          <p>
                            Volumetric divisor:{" "}
                            {nationwidePricing.volumetricDivisor.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ) : null}
                    {statePricing.length > 0 ? (
                      <div className="space-y-2">
                        <p className="font-medium text-foreground">
                          Regional state pricing
                        </p>
                        <div className="space-y-2">
                          {statePricing.map((pricing) => (
                            <div
                              key={pricing.id}
                              className="rounded-md border border-border/40 p-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-medium text-foreground">
                                  {pricing.state || "State pricing"}
                                </p>
                                <Badge variant="outline">
                                  {pricing.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                <p>
                                  Minimum fee: NGN{" "}
                                  {pricing.minimumFee.toLocaleString()}
                                </p>
                                <p>
                                  Additional unit fee: NGN{" "}
                                  {pricing.additionalUnitFee.toLocaleString()}
                                </p>
                                <p>
                                  Weight unit size:{" "}
                                  {pricing.weightUnitSizeKg ?? 0}kg
                                </p>
                                <p>
                                  Volumetric divisor:{" "}
                                  {pricing.volumetricDivisor.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    Pricing has not been configured.
                  </p>
                )}
              </div>

              <div className="rounded-md border border-border/50 p-3">
                <p className="mb-2 text-muted-foreground">Coverage</p>
                {selectedLogistics.coverageAreas.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-foreground">
                      Coverage type:{" "}
                      <span className="font-medium">
                        {selectedLogistics.coverageType === "NATIONWIDE"
                          ? "Nationwide"
                          : "Regional"}
                      </span>
                    </p>
                    {selectedLogistics.coveredStates.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedLogistics.coveredStates.map((state) => (
                          <Badge key={state} variant="secondary">
                            {state}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No coverage areas configured.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2 border-t border-border/30 pt-2">
                {selectedLogistics.verificationStatus !== "VERIFIED" ? (
                  <Button
                    disabled={isUpdating}
                    onClick={() => void handleAction("verify")}
                  >
                    Verify
                  </Button>
                ) : null}
                {selectedLogistics.verificationStatus !== "SUSPENDED" ? (
                  <Button
                    disabled={isUpdating}
                    variant="destructive"
                    onClick={() => void handleAction("suspend")}
                  >
                    Suspend
                  </Button>
                ) : null}
                {selectedLogistics.verificationStatus === "SUSPENDED" ? (
                  <Button
                    disabled={isUpdating}
                    variant="outline"
                    onClick={() => void handleAction("reactivate")}
                  >
                    Reactivate
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/50 p-3">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
