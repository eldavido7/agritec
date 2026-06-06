"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  marketplaceOrders as initialMarketplaceOrders,
  type MarketplaceOrder,
  farmers,
  buyers,
} from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Plus, MoreHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddOrderDialog } from "@/components/add-order-dialog";
import { toast } from "sonner";

const pageSize = 10;

type FilterStatus = "all" | "pending" | "in_transit" | "completed";

type OrderRow = {
  id: string;
  buyerId: string;
  buyerName: string;
  sellerIds: string[];
  sellerNames: string[];
  sellerCount: number;
  itemSummary: string;
  itemCount: number;
  productSubtotal: number;
  totalShippingFee: number;
  discountTotal: number;
  grandTotal: number;
  createdAt: string;
  statusSummary: string;
  statuses: string[];
};

const formatAmount = (value: number) => `?${(value / 1000000).toFixed(1)}M`;

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-700";
    case "in_transit":
      return "bg-blue-100 text-blue-700";
    case "pending":
      return "bg-yellow-100 text-yellow-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getStatusSummary = (order: MarketplaceOrder) => {
  const statuses = Array.from(new Set(order.sellerGroups.map((group) => group.status)));
  if (statuses.length === 1) return statuses[0];
  if (statuses.includes("completed")) return "mixed";
  if (statuses.includes("in_transit")) return "mixed";
  return "pending";
};

const buildOrderRow = (order: MarketplaceOrder): OrderRow => {
  const buyerName = buyers.find((buyer) => buyer.id === order.buyerId)?.name || "Unknown";
  const sellerNames = order.sellerGroups.map((group) => group.sellerName);
  const itemCount = order.sellerGroups.reduce(
    (sum, group) => sum + group.items.reduce((inner, item) => inner + item.quantity, 0),
    0,
  );
  const firstItems = order.sellerGroups.flatMap((group) => group.items.map((item) => item.productName));
  return {
    id: order.id,
    buyerId: order.buyerId,
    buyerName,
    sellerIds: order.sellerGroups.map((group) => group.sellerId),
    sellerNames,
    sellerCount: order.sellerGroups.length,
    itemSummary: firstItems.slice(0, 2).join(", ") + (firstItems.length > 2 ? ` +${firstItems.length - 2} more` : ""),
    itemCount,
    productSubtotal: order.productSubtotal,
    totalShippingFee: order.totalShippingFee,
    discountTotal: order.discountTotal,
    grandTotal: order.grandTotal,
    createdAt: order.createdAt,
    statusSummary: getStatusSummary(order),
    statuses: Array.from(new Set(order.sellerGroups.map((group) => group.status))),
  };
};

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [orders, setOrders] = useState<MarketplaceOrder[]>(initialMarketplaceOrders);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [addOrderOpen, setAddOrderOpen] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const query = searchParams.get("search");
    if (query) setSearchTerm(query);
  }, [searchParams]);

  const orderRows = useMemo(() => orders.map(buildOrderRow), [orders]);

  const filteredOrders = orderRows.filter((order) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      order.id.toLowerCase().includes(search) ||
      order.itemSummary.toLowerCase().includes(search) ||
      order.buyerName.toLowerCase().includes(search) ||
      order.sellerNames.some((name) => name.toLowerCase().includes(search));

    const matchesFilter =
      filterStatus === "all" || order.statuses.some((status) => status === filterStatus);

    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = useMemo(
    () => filteredOrders.slice((page - 1) * pageSize, page * pageSize),
    [filteredOrders, page],
  );

  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterStatus]);

  const handleAddOrder = (orderData: any) => {
    const seller = farmers.find((farmer) => farmer.id === orderData.sellerId);
    const buyer = buyers.find((entry) => entry.id === orderData.buyerId);
    if (!seller || !buyer) {
      toast.error("Unable to create order. Buyer or seller data is missing.");
      return;
    }

    const quantity = Number(orderData.quantity) || 1;
    const price = Number(orderData.price) || 0;
    const productSubtotal = quantity * price;
    const shippingFee = orderData.shippingQuote?.shippingFee ?? 0;
    const orderId = `ORD-${String(orders.length + 1).padStart(3, "0")}`;
    const createdAt = new Date().toISOString().split("T")[0];
    const deliveryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const newOrder: MarketplaceOrder = {
      id: orderId,
      buyerId: buyer.id,
      paymentReference: `PSK-${Date.now()}`,
      productSubtotal,
      totalShippingFee: shippingFee,
      discountTotal: 0,
      grandTotal: productSubtotal + shippingFee,
      createdAt,
      sellerGroups: [
        {
          id: `${orderId}-G1`,
          sellerId: seller.id,

          sellerName: seller.name,
          farmName: seller.farmName,
          buyerId: buyer.id,
          status: "pending",
          items: [
            {
              productId: orderData.productId,
              variantId: orderData.variantId ?? null,
              productName: orderData.productName,
              unit: orderData.unit,
              quantity,
              price,
              lineTotal: productSubtotal,
            },
          ],
          productSubtotal,
          shippingQuote: orderData.shippingQuote,
          shippingFee,
          discountTotal: 0,
          groupTotal: productSubtotal + shippingFee,
          orderDate: createdAt,
          deliveryDate,
          deliveryAddressId: orderData.deliveryAddress?.id || `manual-${Date.now()}`,
        },
      ],
    };

    setOrders((current) => [newOrder, ...current]);
    setAddOrderOpen(false);
    toast.success(`Order ${newOrder.id} created successfully`);
  };

  const completedGroups = orderRows.reduce(
    (sum, order) => sum + order.statuses.filter((status) => status === "completed").length,
    0,
  );
  const pendingGroups = orderRows.reduce(
    (sum, order) => sum + order.statuses.filter((status) => status === "pending").length,
    0,
  );
  const inTransitGroups = orderRows.reduce(
    (sum, order) => sum + order.statuses.filter((status) => status === "in_transit").length,
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-muted-foreground mt-1">
            Manage parent marketplace orders and seller fulfillment groups, including support-assisted orders
          </p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 w-full md:w-auto"
          onClick={() => setAddOrderOpen(true)}
        >
          <Plus className="w-4 h-4" />
          Create Assisted Order
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/50"><CardContent className="pt-6"><p className="text-sm text-muted-foreground mb-1">Parent Orders</p><p className="text-3xl font-bold text-foreground">{orders.length}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="pt-6"><p className="text-sm text-muted-foreground mb-1">Completed Groups</p><p className="text-3xl font-bold text-green-600">{completedGroups}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="pt-6"><p className="text-sm text-muted-foreground mb-1">In Transit Groups</p><p className="text-3xl font-bold text-blue-600">{inTransitGroups}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="pt-6"><p className="text-sm text-muted-foreground mb-1">Pending Groups</p><p className="text-3xl font-bold text-yellow-600">{pendingGroups}</p></CardContent></Card>
      </div>

      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by parent order, item, buyer, or seller..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-border/50"
              />
            </div>
            <div className="flex gap-2">
              <Button variant={filterStatus === "all" ? "default" : "outline"} onClick={() => setFilterStatus("all")} className="gap-2"><Filter className="w-4 h-4" />All</Button>
              <Button variant={filterStatus === "pending" ? "default" : "outline"} onClick={() => setFilterStatus("pending")}>Pending</Button>
              <Button variant={filterStatus === "in_transit" ? "default" : "outline"} onClick={() => setFilterStatus("in_transit")}>In Transit</Button>
              <Button variant={filterStatus === "completed" ? "default" : "outline"} onClick={() => setFilterStatus("completed")}>Completed</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 overflow-hidden">
        <CardHeader className="border-b border-border/30 pb-4">
          <CardTitle>Marketplace Orders ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/30 bg-muted/30">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Order ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Buyer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Seller Groups</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Product Subtotal</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Shipping</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Grand Total</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((order) => (
                  <tr key={order.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4"><p className="font-mono font-semibold text-foreground text-sm">{order.id}</p></td>
                    <td className="px-6 py-4 text-sm text-foreground">{order.buyerName}</td>
                    <td className="px-6 py-4 text-sm text-foreground">{order.sellerCount} seller{order.sellerCount > 1 ? "s" : ""}</td>
                    <td className="px-6 py-4 text-sm text-foreground max-w-[16rem] break-words">{order.itemSummary}</td>
                    <td className="px-6 py-4 text-sm text-foreground">{formatAmount(order.productSubtotal)}</td>
                    <td className="px-6 py-4 text-sm text-foreground">{formatAmount(order.totalShippingFee)}</td>
                    <td className="px-6 py-4"><p className="font-semibold text-foreground text-sm">{formatAmount(order.grandTotal)}</p></td>
                    <td className="px-6 py-4"><Badge variant="outline" className={getStatusColor(order.statusSummary === "mixed" ? "in_transit" : order.statusSummary)}>{order.statusSummary === "mixed" ? "Mixed" : order.statusSummary.replace("_", " ")}</Badge></td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{order.createdAt}</td>
                    <td className="px-6 py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {order.sellerIds.map((sellerId, index) => (
                            <DropdownMenuItem key={sellerId} onClick={() => router.push(`/dashboard/messages?participantType=seller&participantId=${sellerId}`)}>
                              Contact {order.sellerNames[index]}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/messages?participantType=buyer&participantId=${order.buyerId}`)}>
                            Contact Buyer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredOrders.length === 0 && (
            <div className="text-center py-12"><p className="text-muted-foreground">No orders found</p></div>
          )}
          {filteredOrders.length > pageSize && (
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

      <AddOrderDialog open={addOrderOpen} onOpenChange={setAddOrderOpen} onConfirm={handleAddOrder} />
    </div>
  );
}



