"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buyers,
  buyerAddresses,
  farmers,
  products as sellerProducts,
} from "@/lib/mock-data";
import { toast } from "sonner";

interface AddOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (orderData: any) => void;
  isLoading?: boolean;
}

export function AddOrderDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: AddOrderDialogProps) {
  const [buyerSearch, setBuyerSearch] = useState("");
  const [farmerSearch, setFarmerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedBuyerId, setSelectedBuyerId] = useState("");
  const [selectedFarmerId, setSelectedFarmerId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [manualAddressLine, setManualAddressLine] = useState("");
  const [manualCity, setManualCity] = useState("");
  const [manualState, setManualState] = useState("");
  const [manualLandmark, setManualLandmark] = useState("");
  const [saveManualAddress, setSaveManualAddress] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);

  const selectedProduct = sellerProducts.find(
    (product) => String(product.id) === selectedProductId,
  );
  const selectedBuyer = buyers.find((buyer) => buyer.id === selectedBuyerId);
  const selectedFarmer = farmers.find(
    (farmer) => farmer.id === selectedFarmerId,
  );
  const selectedBuyerAddresses = useMemo(
    () =>
      selectedBuyerId
        ? buyerAddresses.filter((entry) => entry.buyerId === selectedBuyerId)
        : [],
    [selectedBuyerId],
  );
  const selectedBuyerAddress = selectedBuyerAddresses.find(
    (entry) => entry.id === selectedAddressId,
  );

  const matchingBuyers = buyers
    .filter((buyer) =>
      `${buyer.name} ${buyer.email} ${buyer.location}`
        .toLowerCase()
        .includes(buyerSearch.toLowerCase()),
    )
    .slice(0, 5);

  const matchingFarmers = farmers
    .filter((farmer) =>
      `${farmer.name} ${farmer.email} ${farmer.location}`
        .toLowerCase()
        .includes(farmerSearch.toLowerCase()),
    )
    .slice(0, 5);

  const matchingProducts = useMemo(() => {
    if (!selectedFarmerId) return [];
    return sellerProducts
      .filter(
        (product) =>
          product.sellerId === selectedFarmerId &&
          `${product.name} ${product.category}`
            .toLowerCase()
            .includes(productSearch.toLowerCase()),
      )
      .slice(0, 5);
  }, [productSearch, selectedFarmerId]);

  const reset = () => {
    setBuyerSearch("");
    setFarmerSearch("");
    setProductSearch("");
    setSelectedBuyerId("");
    setSelectedFarmerId("");
    setSelectedProductId("");
    setQuantity("");
    setSelectedAddressId("");
    setManualAddressLine("");
    setManualCity("");
    setManualState("");
    setManualLandmark("");
    setSaveManualAddress(false);
  };

  const handleSubmit = async () => {
    const hasSelectedAddress = Boolean(selectedBuyerAddress);
    const hasManualAddress =
      manualAddressLine.trim() && manualCity.trim() && manualState.trim();
    if (
      !selectedBuyer ||
      !selectedFarmer ||
      !selectedProduct ||
      !quantity ||
      (!hasSelectedAddress && !hasManualAddress)
    ) {
      toast.error(
        "Select buyer, seller, product, quantity, and a delivery address",
      );
      return;
    }

    setConfirmingPayment(true);
    toast.info(
      `Share Paystack transfer details with ${selectedBuyer.name}. Waiting for confirmation...`,
    );
    await new Promise((resolve) => setTimeout(resolve, 1200));
    toast.success("Paystack transfer confirmed. Creating order...");
    onConfirm({
      buyerId: selectedBuyer.id,
      farmerId: selectedFarmer.id,
      productName: selectedProduct.name,
      quantity,
      unit: selectedProduct.variants[0]?.name || "unit",
      price: String(selectedProduct.price),
      deliveryAddress: selectedBuyerAddress
        ? {
            addressLine: selectedBuyerAddress.addressLine,
            city: selectedBuyerAddress.city,
            state: selectedBuyerAddress.state,
            landmark: selectedBuyerAddress.landmark ?? "",
            latitude: selectedBuyerAddress.latitude,
            longitude: selectedBuyerAddress.longitude,
            isManualAddress: selectedBuyerAddress.isManualAddress ?? false,
            saveToBuyerProfile: false,
          }
        : {
            addressLine: manualAddressLine.trim(),
            city: manualCity.trim(),
            state: manualState.trim(),
            landmark: manualLandmark.trim(),
            latitude: null,
            longitude: null,
            isManualAddress: true,
            saveToBuyerProfile: saveManualAddress,
          },
    });
    setConfirmingPayment(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
          <DialogDescription>
            Create a support-assisted order. Select the buyer, seller, and
            seller-owned product, then confirm the Paystack transfer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="buyer">Buyer</Label>
            <Input
              id="buyer"
              placeholder="Search buyers..."
              value={buyerSearch}
            onChange={(event) => {
              setBuyerSearch(event.target.value);
              setSelectedBuyerId("");
            }}
            />
            {buyerSearch && !selectedBuyerId && (
              <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-border bg-background">
                {matchingBuyers.map((buyer) => (
                  <button
                    key={buyer.id}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                  setSelectedBuyerId(buyer.id);
                  setBuyerSearch(buyer.name);
                  setSelectedAddressId("");
                }}
              >
                    {buyer.name}
                    <span className="block text-xs text-muted-foreground">
                      {buyer.location}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Delivery Address</Label>
            <Input
              id="address"
              placeholder={
                selectedBuyerId
                  ? "Select saved buyer address (optional)"
                  : "Select a buyer first"
              }
              value={
                selectedBuyerAddress
                  ? `${selectedBuyerAddress.addressLine}, ${selectedBuyerAddress.city}`
                  : ""
              }
              disabled={!selectedBuyerId}
              onChange={() => {}}
            />
            {selectedBuyerId && !selectedAddressId && selectedBuyerAddresses.length > 0 && (
              <div className="max-h-36 overflow-y-auto rounded-md border border-border bg-background">
                {selectedBuyerAddresses.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => setSelectedAddressId(entry.id)}
                  >
                    {entry.addressLine}
                    <span className="block text-xs text-muted-foreground">
                      {entry.city}, {entry.state}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Or enter a manual address for assisted checkout.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input
                placeholder="Address line"
                value={manualAddressLine}
                onChange={(event) => setManualAddressLine(event.target.value)}
              />
              <Input
                placeholder="City"
                value={manualCity}
                onChange={(event) => setManualCity(event.target.value)}
              />
              <Input
                placeholder="State"
                value={manualState}
                onChange={(event) => setManualState(event.target.value)}
              />
              <Input
                placeholder="Landmark / notes (optional)"
                value={manualLandmark}
                onChange={(event) => setManualLandmark(event.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={saveManualAddress}
                onChange={(event) => setSaveManualAddress(event.target.checked)}
              />
              Save manual address to buyer profile
            </label>
          </div>

          <div>
            <Label htmlFor="farmer">Seller</Label>
            <Input
              id="farmer"
              placeholder="Search sellers..."
              value={farmerSearch}
              onChange={(event) => {
                setFarmerSearch(event.target.value);
                setSelectedFarmerId("");
                setSelectedProductId("");
              }}
            />
            {farmerSearch && !selectedFarmerId && (
              <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-border bg-background">
                {matchingFarmers.map((farmer) => (
                  <button
                    key={farmer.id}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setSelectedFarmerId(farmer.id);
                      setFarmerSearch(farmer.name);
                      setSelectedProductId("");
                      setProductSearch("");
                    }}
                  >
                    {farmer.name}
                    <span className="block text-xs text-muted-foreground">
                      {farmer.location}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="product">Product</Label>
            <Input
              id="product"
              placeholder={
                selectedFarmerId
                  ? "Search seller products..."
                  : "Select a seller first"
              }
              value={productSearch}
              disabled={!selectedFarmerId}
              onChange={(event) => {
                setProductSearch(event.target.value);
                setSelectedProductId("");
              }}
            />
            {selectedFarmerId && productSearch && !selectedProductId && (
              <div className="mt-2 max-h-44 overflow-y-auto rounded-md border border-border bg-background">
                {matchingProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setSelectedProductId(String(product.id));
                      setProductSearch(product.name);
                    }}
                  >
                    {product.name}
                    <span className="block text-xs text-muted-foreground">
                      NGN {product.price.toLocaleString()} . {product.category}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                placeholder="1"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </div>
            <div>
              <Label>Price</Label>
              <div className="flex h-10 items-center rounded-md border border-border/50 px-3 text-sm text-muted-foreground">
                {selectedProduct
                  ? `NGN ${selectedProduct.price.toLocaleString()}`
                  : "Auto assigned"}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading || confirmingPayment}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || confirmingPayment}>
            {isLoading || confirmingPayment
              ? "Confirming payment..."
              : "Confirm Paystack & Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
