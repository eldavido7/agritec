"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { orders as initialOrders, farmers, buyers } from "@/lib/mock-data";
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

interface Order {
  id: string;
  farmerId: string;
  buyerId: string;
  productName: string;
  quantity: number;
  unit: string;
  price: number;
  totalAmount: number;
  status: string;
  orderDate: string;
  deliveryDate: string;
  deliveryAddress?: {
    addressLine: string;
    city: string;
    state: string;
    landmark?: string;
    latitude?: number | null;
    longitude?: number | null;
    isManualAddress?: boolean;
    saveToBuyerProfile?: boolean;
  };
}

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "pending" | "in_transit" | "completed"
  >("all");

  // Dialog states
  const [addOrderOpen, setAddOrderOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const query = searchParams.get("search");
    if (query) setSearchTerm(query);
  }, [searchParams]);

  const getFarmerName = (farmerId: string) =>
    farmers.find((f) => f.id === farmerId)?.name || "Unknown";
  const getBuyerName = (buyerId: string) =>
    buyers.find((b) => b.id === buyerId)?.name || "Unknown";

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getFarmerName(order.farmerId)
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      getBuyerName(order.buyerId)
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterStatus === "all" || order.status === filterStatus;

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

  const handleAddOrder = (orderData: any) => {
    const newOrder: Order = {
      id: `ORD${String(orders.length + 1).padStart(3, "0")}`,
      farmerId: orderData.farmerId,
      buyerId: orderData.buyerId,
      productName: orderData.productName,
      quantity: parseInt(orderData.quantity),
      unit: orderData.unit,
      price: parseInt(orderData.price),
      totalAmount: parseInt(orderData.quantity) * parseInt(orderData.price),
      status: "pending",
      orderDate: new Date().toISOString().split("T")[0],
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      deliveryAddress: orderData.deliveryAddress,
    };

    setOrders([...orders, newOrder]);
    setAddOrderOpen(false);
    toast.success(`Order ${newOrder.id} created successfully`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-muted-foreground mt-1">
            Manage and track marketplace orders, including support-assisted orders
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Total Orders</p>
            <p className="text-3xl font-bold text-foreground">
              {orders.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Completed</p>
            <p className="text-3xl font-bold text-green-600">
              {orders.filter((o) => o.status === "completed").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">In Transit</p>
            <p className="text-3xl font-bold text-blue-600">
              {orders.filter((o) => o.status === "in_transit").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Pending</p>
            <p className="text-3xl font-bold text-yellow-600">
              {orders.filter((o) => o.status === "pending").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by order ID, product, or participant..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-border/50"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === "all" ? "default" : "outline"}
                onClick={() => setFilterStatus("all")}
                className="gap-2"
              >
                <Filter className="w-4 h-4" />
                All
              </Button>
              <Button
                variant={filterStatus === "pending" ? "default" : "outline"}
                onClick={() => setFilterStatus("pending")}
              >
                Pending
              </Button>
              <Button
                variant={filterStatus === "in_transit" ? "default" : "outline"}
                onClick={() => setFilterStatus("in_transit")}
              >
                In Transit
              </Button>
              <Button
                variant={filterStatus === "completed" ? "default" : "outline"}
                onClick={() => setFilterStatus("completed")}
              >
                Completed
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="border-border/50 overflow-hidden">
        <CardHeader className="border-b border-border/30 pb-4">
          <CardTitle>All Orders ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/30 bg-muted/30">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Seller
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Buyer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="font-mono font-semibold text-foreground text-sm">
                        {order.id}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-foreground text-sm">
                        {order.productName}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {getFarmerName(order.farmerId)}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {getBuyerName(order.buyerId)}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {order.quantity}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-foreground text-sm">
                        ₦{(order.totalAmount / 1000000).toFixed(1)}M
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant="outline"
                        className={getStatusColor(order.status)}
                      >
                        {order.status
                          .replace("_", " ")
                          .charAt(0)
                          .toUpperCase() +
                          order.status.slice(1).replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {order.orderDate}
                    </td>
                    <td className="px-6 py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `/dashboard/messages?participantType=seller&participantId=${order.farmerId}`,
                              )
                            }
                          >
                            Contact Seller
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `/dashboard/messages?participantType=buyer&participantId=${order.buyerId}`,
                              )
                            }
                          >
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
            <div className="text-center py-12">
              <p className="text-muted-foreground">No orders found</p>
            </div>
          )}
          {filteredOrders.length > pageSize && (
            <div className="flex items-center justify-between border-t border-border/30 py-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddOrderDialog
        open={addOrderOpen}
        onOpenChange={setAddOrderOpen}
        onConfirm={handleAddOrder}
      />
    </div>
  );
}
