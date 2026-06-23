"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  type AdminBuyerRecord,
  useAdminBuyersStore,
} from "@/stores/admin-buyers-store";
import { useAdminOrdersStore } from "@/stores/admin-orders-store";
import {
  type AdminProductRecord,
  type AdminProductVariantRecord,
  useAdminProductsStore,
} from "@/stores/admin-products-store";
import {
  type AdminSellerRecord,
  useAdminSellersStore,
} from "@/stores/admin-sellers-store";

type AssistedLineItem = {
  sellerId: string;
  sellerName: string;
  productId: string;
  productTitle: string;
  variantId: string | null;
  variantTitle: string | null;
  quantity: number;
  unitPrice: number;
};

type ManualAddressForm = {
  displayName: string;
  addressLine: string;
  fullAddress: string;
  city: string;
  state: string;
  landmark: string;
  saveToBuyerProfile: boolean;
};

type AdminAssistedOrderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (args: {
    orderId: string;
    paymentUrl: string | null;
    paymentReference: string;
  }) => void;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function buildLineKey(productId: string, variantId: string | null) {
  return `${productId}:${variantId ?? "base"}`;
}

export function AdminAssistedOrderDialog({
  open,
  onOpenChange,
  onCreated,
}: AdminAssistedOrderDialogProps) {
  const buyers = useAdminBuyersStore((state) => state.buyers);
  const buyersLoaded = useAdminBuyersStore((state) => state.loaded);
  const fetchBuyers = useAdminBuyersStore((state) => state.fetchBuyers);
  const selectedBuyerDetail = useAdminBuyersStore(
    (state) => state.selectedBuyerDetail,
  );
  const fetchBuyerDetail = useAdminBuyersStore((state) => state.fetchBuyerDetail);

  const sellers = useAdminSellersStore((state) => state.sellers);
  const sellersLoaded = useAdminSellersStore((state) => state.loaded);
  const fetchSellers = useAdminSellersStore((state) => state.fetchSellers);

  const products = useAdminProductsStore((state) => state.products);
  const productsLoading = useAdminProductsStore((state) => state.isLoading);
  const fetchProducts = useAdminProductsStore((state) => state.fetchProducts);
  const clearProducts = useAdminProductsStore((state) => state.clearProducts);

  const initializeAssistedOrder = useAdminOrdersStore(
    (state) => state.initializeAssistedOrder,
  );
  const quoteAssistedOrder = useAdminOrdersStore((state) => state.quoteAssistedOrder);
  const isSubmitting = useAdminOrdersStore((state) => state.isUpdating);

  const [buyerSearch, setBuyerSearch] = useState("");
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);
  const [sellerSearch, setSellerSearch] = useState("");
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [lineItems, setLineItems] = useState<AssistedLineItem[]>([]);
  const [discountCodes, setDiscountCodes] = useState<Record<string, string>>({});
  const [sellerLogisticsSelections, setSellerLogisticsSelections] = useState<Record<string, string>>({});
  const [allGroupsLogisticsCompanyId, setAllGroupsLogisticsCompanyId] = useState<string>("");
  const [addressMode, setAddressMode] = useState<"existing" | "manual">("existing");
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [manualAddress, setManualAddress] = useState<ManualAddressForm>({
    displayName: "",
    addressLine: "",
    fullAddress: "",
    city: "",
    state: "",
    landmark: "",
    saveToBuyerProfile: false,
  });
  const [logisticsQuote, setLogisticsQuote] = useState<Awaited<
    ReturnType<typeof quoteAssistedOrder>
  > | null>(null);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setBuyerSearch("");
      setSelectedBuyerId(null);
      setSellerSearch("");
      setSelectedSellerId(null);
      setProductSearch("");
      setLineItems([]);
      setDiscountCodes({});
      setSellerLogisticsSelections({});
      setAllGroupsLogisticsCompanyId("");
      setAddressMode("existing");
      setSelectedAddressId("");
      setManualAddress({
        displayName: "",
        addressLine: "",
        fullAddress: "",
        city: "",
        state: "",
        landmark: "",
        saveToBuyerProfile: false,
      });
      setLogisticsQuote(null);
      setIsQuoteLoading(false);
      setQuoteError(null);
      clearProducts();
    }
  }, [clearProducts, open]);

  useEffect(() => {
    if (!open) return;
    if (!buyersLoaded) {
      void fetchBuyers();
    }
    if (!sellersLoaded) {
      void fetchSellers();
    }
  }, [buyersLoaded, fetchBuyers, fetchSellers, open, sellersLoaded]);

  useEffect(() => {
    if (!selectedBuyerId) return;
    void fetchBuyerDetail(selectedBuyerId, { force: true }).then((detail) => {
      if (detail.addresses.length > 0) {
        const defaultAddress =
          detail.addresses.find((address) => address.isDefault) ??
          detail.addresses[0];
        setSelectedAddressId(defaultAddress?.id || "");
        setAddressMode("existing");
      } else {
        setSelectedAddressId("");
        setAddressMode("manual");
      }
    });
  }, [fetchBuyerDetail, selectedBuyerId]);

  useEffect(() => {
    if (!selectedSellerId) {
      clearProducts();
      return;
    }

    const timeout = window.setTimeout(() => {
      void fetchProducts({
        sellerId: selectedSellerId,
        search: productSearch.trim() || undefined,
        page: 1,
        pageSize: 10,
        force: true,
      });
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [clearProducts, fetchProducts, productSearch, selectedSellerId]);

  const filteredBuyers = useMemo(() => {
    const query = buyerSearch.trim().toLowerCase();
    if (!query) return buyers.slice(0, 10);
    return buyers
      .filter((buyer) =>
        `${buyer.fullName} ${buyer.email} ${buyer.phone || ""}`
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 10);
  }, [buyerSearch, buyers]);

  const filteredSellers = useMemo(() => {
    const query = sellerSearch.trim().toLowerCase();
    const activeSellers = sellers.filter((seller) => seller.isActive);
    if (!query) return activeSellers.slice(0, 10);
    return activeSellers
      .filter((seller) =>
        `${seller.fullName} ${seller.farmName} ${seller.email} ${seller.locationLabel || ""}`
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 10);
  }, [sellerSearch, sellers]);

  const productOptions = useMemo(() => {
    const options: Array<{
      key: string;
      sellerId: string;
      sellerName: string;
      product: AdminProductRecord;
      variant: AdminProductVariantRecord | null;
      label: string;
      price: number;
      inventory: number;
    }> = [];

    products.forEach((product) => {
      const sellerName =
        sellers.find((seller) => seller.id === product.sellerId)?.farmName ||
        "Seller";
      if (product.variants.length > 0) {
        product.variants.forEach((variant) => {
          options.push({
            key: buildLineKey(product.id, variant.id),
            sellerId: product.sellerId,
            sellerName,
            product,
            variant,
            label: `${product.title} · ${variant.title}`,
            price: variant.price,
            inventory: variant.inventory,
          });
        });
      } else {
        options.push({
          key: buildLineKey(product.id, null),
          sellerId: product.sellerId,
          sellerName,
          product,
          variant: null,
          label: product.title,
          price: product.basePrice,
          inventory: product.inventory,
        });
      }
    });

    return options;
  }, [products, sellers]);

  const selectedBuyer = buyers.find((buyer) => buyer.id === selectedBuyerId) || null;
  const selectedBuyerAddresses =
    selectedBuyerDetail?.id === selectedBuyerId
      ? selectedBuyerDetail.addresses
      : [];

  const groupedLineItems = useMemo(() => {
    const groups = new Map<
      string,
      { sellerName: string; items: AssistedLineItem[] }
    >();
    lineItems.forEach((item) => {
      const existing = groups.get(item.sellerId) || {
        sellerName: item.sellerName,
        items: [],
      };
      existing.items.push(item);
      groups.set(item.sellerId, existing);
    });
    return Array.from(groups.entries()).map(([sellerId, group]) => ({
      sellerId,
      sellerName: group.sellerName,
      items: group.items,
    }));
  }, [lineItems]);

  const quoteAddressPayload = useMemo(() => {
    if (addressMode === "existing") {
      if (!selectedAddressId) return null;
      return { addressId: selectedAddressId };
    }

    if (
      !manualAddress.addressLine.trim() ||
      !manualAddress.fullAddress.trim() ||
      !manualAddress.city.trim() ||
      !manualAddress.state.trim()
    ) {
      return null;
    }

    return {
      manualAddress: {
        displayName: manualAddress.displayName.trim() || null,
        addressLine: manualAddress.addressLine.trim(),
        fullAddress: manualAddress.fullAddress.trim(),
        city: manualAddress.city.trim(),
        state: manualAddress.state.trim(),
        landmark: manualAddress.landmark.trim() || null,
        saveToBuyerProfile: manualAddress.saveToBuyerProfile,
      },
    };
  }, [addressMode, manualAddress, selectedAddressId]);

  const quoteReady =
    open && !!selectedBuyerId && lineItems.length > 0 && quoteAddressPayload != null;

  useEffect(() => {
    if (!quoteReady || !quoteAddressPayload || !selectedBuyerId) {
      setLogisticsQuote(null);
      setQuoteError(null);
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsQuoteLoading(true);
      setQuoteError(null);

      void quoteAssistedOrder({
        buyerId: selectedBuyerId,
        items: lineItems.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        discountCodes,
        logisticsSelections: allGroupsLogisticsCompanyId ? {} : sellerLogisticsSelections,
        allGroupsLogisticsCompanyId: allGroupsLogisticsCompanyId || null,
        ...quoteAddressPayload,
      })
        .then((quote) => {
          setLogisticsQuote(quote);
          setSellerLogisticsSelections((current) => {
            if (allGroupsLogisticsCompanyId) return current;
            const next = { ...current };
            for (const group of quote.sellerGroups) {
              if (!next[group.sellerId] && group.logisticsCompanyId) {
                next[group.sellerId] = group.logisticsCompanyId;
              }
            }
            return next;
          });
        })
        .catch((error) => {
          setLogisticsQuote(null);
          setQuoteError(
            error instanceof Error
              ? error.message
              : "Failed to load logistics options",
          );
        })
        .finally(() => setIsQuoteLoading(false));
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [
    allGroupsLogisticsCompanyId,
    discountCodes,
    lineItems,
    quoteAddressPayload,
    quoteAssistedOrder,
    quoteReady,
    selectedBuyerId,
    sellerLogisticsSelections,
  ]);

  const handleSelectBuyer = (buyer: AdminBuyerRecord) => {
    setSelectedBuyerId(buyer.id);
    setBuyerSearch(buyer.fullName);
  };

  const handleSelectSeller = (seller: AdminSellerRecord) => {
    setSelectedSellerId(seller.id);
    setSellerSearch(`${seller.fullName} · ${seller.farmName}`);
    setProductSearch("");
  };

  const handleAddProduct = (option: (typeof productOptions)[number]) => {
    const key = buildLineKey(option.product.id, option.variant?.id ?? null);
    setLineItems((current) => {
      const existing = current.find(
        (item) => buildLineKey(item.productId, item.variantId) === key,
      );
      if (existing) {
        return current.map((item) =>
          buildLineKey(item.productId, item.variantId) === key
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [
        ...current,
        {
          sellerId: option.sellerId,
          sellerName: option.sellerName,
          productId: option.product.id,
          productTitle: option.product.title,
          variantId: option.variant?.id ?? null,
          variantTitle: option.variant?.title ?? null,
          quantity: 1,
          unitPrice: option.price,
        },
      ];
    });
    setProductSearch("");
  };

  const updateQuantity = (key: string, quantity: number) => {
    if (quantity <= 0) return;
    setLineItems((current) =>
      current.map((item) =>
        buildLineKey(item.productId, item.variantId) === key
          ? { ...item, quantity }
          : item,
      ),
    );
  };

  const removeLineItem = (key: string) => {
    setLineItems((current) =>
      current.filter(
        (item) => buildLineKey(item.productId, item.variantId) !== key,
      ),
    );
  };

  const handleSubmit = async () => {
    if (!selectedBuyerId) {
      toast.error("Select a buyer first.");
      return;
    }
    if (lineItems.length === 0) {
      toast.error("Add at least one product.");
      return;
    }

    if (addressMode === "existing" && !selectedAddressId) {
      toast.error("Select an existing buyer address or switch to manual.");
      return;
    }

    if (addressMode === "manual") {
      if (
        !manualAddress.addressLine.trim() ||
        !manualAddress.fullAddress.trim() ||
        !manualAddress.city.trim() ||
        !manualAddress.state.trim()
      ) {
        toast.error("Complete the manual delivery address fields.");
        return;
      }
    }

    if (!logisticsQuote || logisticsQuote.sellerGroups.some((group) => !group.logisticsCompanyId)) {
      toast.error("Select a logistics company for each seller group before continuing.");
      return;
    }

    try {
      const result = await initializeAssistedOrder({
        buyerId: selectedBuyerId,
        items: lineItems.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        discountCodes,
        logisticsSelections: allGroupsLogisticsCompanyId ? {} : sellerLogisticsSelections,
        allGroupsLogisticsCompanyId: allGroupsLogisticsCompanyId || null,
        ...(addressMode === "existing"
          ? { addressId: selectedAddressId }
          : {
              manualAddress: {
                displayName: manualAddress.displayName.trim() || null,
                addressLine: manualAddress.addressLine.trim(),
                fullAddress: manualAddress.fullAddress.trim(),
                city: manualAddress.city.trim(),
                state: manualAddress.state.trim(),
                landmark: manualAddress.landmark.trim() || null,
                saveToBuyerProfile: manualAddress.saveToBuyerProfile,
              },
            }),
      });

      toast.success("Assisted order initialized successfully");
      if (result.payment.authorizationUrl) {
        window.open(result.payment.authorizationUrl, "_blank", "noopener,noreferrer");
      }
      onCreated?.({
        orderId: result.order.id,
        paymentUrl: result.payment.authorizationUrl,
        paymentReference: result.payment.reference,
      });
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to initialize assisted order",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Create Assisted Order</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">
                Buyer
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={buyerSearch}
                  onChange={(event) => {
                    setBuyerSearch(event.target.value);
                    if (!event.target.value.trim()) {
                      setSelectedBuyerId(null);
                    }
                  }}
                  placeholder="Search buyer by name, email, or phone..."
                  className="pl-10"
                />
              </div>
              <div className="max-h-48 overflow-y-auto rounded-md border border-border/50">
                {filteredBuyers.map((buyer) => (
                  <button
                    key={buyer.id}
                    type="button"
                    className={`w-full border-b border-border/30 px-3 py-2 text-left text-sm hover:bg-muted/50 ${
                      selectedBuyerId === buyer.id ? "bg-primary/5" : ""
                    }`}
                    onClick={() => handleSelectBuyer(buyer)}
                  >
                    <p className="font-medium text-foreground">{buyer.fullName}</p>
                    <p className="text-xs text-muted-foreground">{buyer.email}</p>
                  </button>
                ))}
                {filteredBuyers.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-muted-foreground">
                    No buyers found.
                  </p>
                ) : null}
              </div>
              {selectedBuyer ? (
                <div className="rounded-md border border-border/50 bg-muted/20 p-3 text-sm">
                  <p className="font-medium text-foreground">
                    Selected buyer: {selectedBuyer.fullName}
                  </p>
                  <p className="text-muted-foreground">{selectedBuyer.email}</p>
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">
                Seller
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={sellerSearch}
                  onChange={(event) => {
                    setSellerSearch(event.target.value);
                    if (!event.target.value.trim()) {
                      setSelectedSellerId(null);
                      setProductSearch("");
                      clearProducts();
                    }
                  }}
                  placeholder="Search seller or farm..."
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Select a seller first. Product search only becomes active for the selected seller.
              </p>
              <div className="max-h-48 overflow-y-auto rounded-md border border-border/50">
                {filteredSellers.map((seller) => (
                  <button
                    key={seller.id}
                    type="button"
                    className={`w-full border-b border-border/30 px-3 py-2 text-left text-sm hover:bg-muted/50 ${
                      selectedSellerId === seller.id ? "bg-primary/5" : ""
                    }`}
                    onClick={() => handleSelectSeller(seller)}
                  >
                    <p className="font-medium text-foreground">{seller.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {seller.farmName}
                    </p>
                  </button>
                ))}
                {filteredSellers.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-muted-foreground">
                    No sellers found.
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              Products
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder={
                  selectedSellerId
                    ? "Search products for selected seller..."
                    : "Select a seller to enable product search"
                }
                className="pl-10"
                disabled={!selectedSellerId}
              />
            </div>
            {selectedSellerId ? (
              <div className="max-h-56 overflow-y-auto rounded-md border border-border/50">
                {productsLoading ? (
                  <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                    <Spinner className="size-4" />
                    <span>Loading products...</span>
                  </div>
                ) : productOptions.length > 0 ? (
                  productOptions.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => handleAddProduct(option)}
                      className="flex w-full items-center justify-between gap-3 border-b border-border/30 px-3 py-3 text-left hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {option.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(option.price)} · Inventory {option.inventory}
                        </p>
                      </div>
                      <Plus className="h-4 w-4 shrink-0 text-primary" />
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-4 text-sm text-muted-foreground">
                    No products found for this seller.
                  </p>
                )}
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            {groupedLineItems.map((group) => (
              <div key={group.sellerId} className="rounded-md border border-border/50 p-4">
                <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{group.sellerName}</p>
                    <p className="text-xs text-muted-foreground">
                      Seller group
                    </p>
                  </div>
                  <Input
                    value={discountCodes[group.sellerId] || ""}
                    onChange={(event) =>
                      setDiscountCodes((current) => ({
                        ...current,
                        [group.sellerId]: event.target.value,
                      }))
                    }
                    placeholder="Discount code for this seller (optional)"
                    className="max-w-sm"
                  />
                </div>
                <div className="space-y-3">
                  {group.items.map((item) => {
                    const key = buildLineKey(item.productId, item.variantId);
                    return (
                      <div
                        key={key}
                        className="grid grid-cols-1 gap-3 rounded-md border border-border/40 p-3 md:grid-cols-[1fr_auto_auto_auto]"
                      >
                        <div>
                          <p className="font-medium text-foreground">
                            {item.productTitle}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.variantTitle || "Base product"} · {formatCurrency(item.unitPrice)}
                          </p>
                        </div>
                        <Input
                          type="number"
                          min={1}
                          value={String(item.quantity)}
                          onChange={(event) =>
                            updateQuantity(key, Number(event.target.value))
                          }
                          className="w-24"
                        />
                        <div className="flex items-center text-sm font-semibold text-foreground">
                          {formatCurrency(item.quantity * item.unitPrice)}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLineItem(key)}
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {lineItems.length === 0 ? (
              <div className="rounded-md border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                Selected products will be pinned here. After adding one, the product search clears so you can add another from the same seller, or switch seller and continue.
              </div>
            ) : null}
          </div>

          <div className="space-y-4 rounded-md border border-border/50 p-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={addressMode === "existing" ? "default" : "outline"}
                onClick={() => setAddressMode("existing")}
                disabled={!selectedBuyer || selectedBuyerAddresses.length === 0}
              >
                Use Buyer Address
              </Button>
              <Button
                type="button"
                variant={addressMode === "manual" ? "default" : "outline"}
                onClick={() => setAddressMode("manual")}
              >
                Manual Address
              </Button>
            </div>

            {addressMode === "existing" ? (
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  Buyer Address
                </label>
                <select
                  value={selectedAddressId}
                  onChange={(event) => setSelectedAddressId(event.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                  disabled={selectedBuyerAddresses.length === 0}
                >
                  <option value="">
                    {selectedBuyerAddresses.length > 0
                      ? "Select address"
                      : "No saved addresses available"}
                  </option>
                  {selectedBuyerAddresses.map((address) => (
                    <option key={address.id} value={address.id}>
                      {address.displayName || "Saved address"} · {address.fullAddress}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  placeholder="Address label (optional)"
                  value={manualAddress.displayName}
                  onChange={(event) =>
                    setManualAddress((current) => ({
                      ...current,
                      displayName: event.target.value,
                    }))
                  }
                />
                <Input
                  placeholder="Address line"
                  value={manualAddress.addressLine}
                  onChange={(event) =>
                    setManualAddress((current) => ({
                      ...current,
                      addressLine: event.target.value,
                    }))
                  }
                />
                <Input
                  placeholder="Full address"
                  value={manualAddress.fullAddress}
                  onChange={(event) =>
                    setManualAddress((current) => ({
                      ...current,
                      fullAddress: event.target.value,
                    }))
                  }
                />
                <Input
                  placeholder="Landmark (optional)"
                  value={manualAddress.landmark}
                  onChange={(event) =>
                    setManualAddress((current) => ({
                      ...current,
                      landmark: event.target.value,
                    }))
                  }
                />
                <Input
                  placeholder="City"
                  value={manualAddress.city}
                  onChange={(event) =>
                    setManualAddress((current) => ({
                      ...current,
                      city: event.target.value,
                    }))
                  }
                />
                <Input
                  placeholder="State"
                  value={manualAddress.state}
                  onChange={(event) =>
                    setManualAddress((current) => ({
                      ...current,
                      state: event.target.value,
                    }))
                  }
                />
                <label className="flex items-center gap-2 text-sm text-foreground md:col-span-2">
                  <input
                    type="checkbox"
                    checked={manualAddress.saveToBuyerProfile}
                    onChange={(event) =>
                      setManualAddress((current) => ({
                        ...current,
                        saveToBuyerProfile: event.target.checked,
                      }))
                    }
                  />
                  Save this manual address to the buyer profile
                </label>
              </div>
            )}
          </div>

          <div className="space-y-4 rounded-md border border-border/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">Logistics selection</p>
                <p className="text-sm text-muted-foreground">
                  Choose one logistics company per seller group, or one company that is eligible for all seller groups.
                </p>
              </div>
              {isQuoteLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner className="size-4" />
                  <span>Loading logistics...</span>
                </div>
              ) : null}
            </div>

            {quoteError ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {quoteError}
              </div>
            ) : null}

            {logisticsQuote ? (
              <>
                {(() => {
                  const sharedOptions = Array.from(
                    new Map(
                      logisticsQuote.sellerGroups
                        .flatMap((group) => group.eligibleLogisticsCompanies)
                        .map((company) => [company.id, company]),
                    ).values(),
                  ).filter((company) =>
                    logisticsQuote.sellerGroups.every((group) =>
                      group.eligibleLogisticsCompanies.some(
                        (candidate) => candidate.id === company.id,
                      ),
                    ),
                  );

                  return sharedOptions.length > 0 ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        One logistics company for all seller groups
                      </label>
                      <select
                        value={allGroupsLogisticsCompanyId}
                        onChange={(event) => {
                          const value = event.target.value;
                          setAllGroupsLogisticsCompanyId(value);
                          if (value) {
                            setSellerLogisticsSelections({});
                          }
                        }}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                      >
                        <option value="">Select per seller group instead</option>
                        {sharedOptions.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.companyName} - {company.coverageType === "NATIONWIDE" ? "Nationwide" : company.pricing.state || "Regional"}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null;
                })()}

                <div className="space-y-3">
                  {logisticsQuote.sellerGroups.map((group) => (
                    <div key={group.sellerId} className="rounded-md border border-border/40 p-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-medium text-foreground">{group.farmName}</p>
                          <p className="text-xs text-muted-foreground">
                            Deliver to {group.buyerDeliveryCity}, {group.buyerDeliveryState}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Chargeable weight {group.totalChargeableWeightKg.toFixed(1)}kg
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-semibold text-foreground">
                            {formatCurrency(group.groupTotal)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Shipping {formatCurrency(group.shippingFee)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <select
                          value={
                            allGroupsLogisticsCompanyId
                              ? allGroupsLogisticsCompanyId
                              : sellerLogisticsSelections[group.sellerId] || ""
                          }
                          onChange={(event) => {
                            const value = event.target.value;
                            setAllGroupsLogisticsCompanyId("");
                            setSellerLogisticsSelections((current) => ({
                              ...current,
                              [group.sellerId]: value,
                            }));
                          }}
                          disabled={Boolean(allGroupsLogisticsCompanyId)}
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                        >
                          <option value="">Select logistics company</option>
                          {group.eligibleLogisticsCompanies.map((company) => (
                            <option key={company.id} value={company.id}>
                              {company.companyName} - {company.coverageType === "NATIONWIDE" ? "Nationwide" : company.pricing.state || "Regional"}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <div className="rounded-md bg-muted/30 p-3">
                    <p className="text-sm text-muted-foreground">Products</p>
                    <p className="font-semibold text-foreground">
                      {formatCurrency(logisticsQuote.productSubtotal)}
                    </p>
                  </div>
                  <div className="rounded-md bg-muted/30 p-3">
                    <p className="text-sm text-muted-foreground">Discounts</p>
                    <p className="font-semibold text-foreground">
                      {formatCurrency(logisticsQuote.discountTotal)}
                    </p>
                  </div>
                  <div className="rounded-md bg-muted/30 p-3">
                    <p className="text-sm text-muted-foreground">Shipping</p>
                    <p className="font-semibold text-foreground">
                      {formatCurrency(logisticsQuote.totalShippingFee)}
                    </p>
                  </div>
                  <div className="rounded-md bg-muted/30 p-3">
                    <p className="text-sm text-muted-foreground">Grand total</p>
                    <p className="font-semibold text-foreground">
                      {formatCurrency(logisticsQuote.grandTotal)}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Add products and a delivery address to load eligible logistics companies.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-border/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              This initializes one parent order with seller groups underneath, then opens Paystack for payment.
            </p>
            <Button
              onClick={() => void handleSubmit()}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? <Spinner className="size-4" /> : <ExternalLink className="h-4 w-4" />}
              {isSubmitting ? "Initializing..." : "Create Assisted Order"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
