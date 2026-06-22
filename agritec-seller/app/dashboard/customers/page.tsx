"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatCurrency, formatDate } from "@/lib/formatting";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSellerAuthStore } from "@/stores/seller-auth-store";
import { useSellerOrdersStore } from "@/stores/seller-orders-store";
import { useSellerProductsStore } from "@/stores/seller-products-store";
import { buildSellerDashboardSummary } from "@/lib/seller-reporting";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const ITEMS_PER_PAGE = 10;

export default function CustomersPage() {
  const authReady = useSellerAuthStore((state) => state.isReady);
  const sellerProfile = useSellerAuthStore((state) => state.user?.sellerProfile);
  const { orderGroups, isLoading, fetchOrderGroups } = useSellerOrdersStore((state) => state);
  const { products, fetchProducts } = useSellerProductsStore((state) => state);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!authReady || !sellerProfile) return;
    void fetchOrderGroups();
    void fetchProducts();
  }, [authReady, sellerProfile, fetchOrderGroups, fetchProducts]);

  const customers = useMemo(
    () => buildSellerDashboardSummary(products, orderGroups).customers,
    [products, orderGroups],
  );

  const filteredCustomers = useMemo(
    () =>
      customers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          customer.location.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [customers, searchQuery],
  );

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE));
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const totalRevenue = customers.reduce((sum, customer) => sum + customer.totalSpent, 0);
  const totalOrders = customers.reduce((sum, customer) => sum + customer.totalOrders, 0);
  const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  return (
    <div className="space-y-8">
      <motion.div initial="hidden" animate="visible" variants={itemVariants}>
        <div>
          <p className="mt-2 text-muted-foreground">
            Buyer relationships and order history for {sellerProfile?.farmName ?? "your farm"}.
          </p>
        </div>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={itemVariants}
        className="space-y-4"
      >
        <Input
          type="text"
          placeholder="Search customers by name or location..."
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setCurrentPage(1);
          }}
        />
      </motion.div>

      <motion.div initial="hidden" animate="visible" variants={itemVariants}>
        <Card className="p-6">
          {isLoading ? (
            <div className="flex min-h-70 items-center justify-center">
              <Spinner className="size-6" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                        Customer Name
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                        Location
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                        Orders
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                        Total Spent
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                        Last Order
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCustomers.map((customer) => (
                      <tr
                        key={customer.id}
                        className="border-b border-border transition-colors hover:bg-secondary/50 dark:hover:bg-secondary/30 dark:hover:text-white"
                      >
                        <td className="px-4 py-3 text-sm font-semibold text-foreground">
                          {customer.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {customer.location}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {customer.totalOrders}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-primary">
                          {formatCurrency(customer.totalSpent)}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {customer.lastOrder ? formatDate(customer.lastOrder) : "-"}
                        </td>
                      </tr>
                    ))}
                    {paginatedCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                          No customers found matching your criteria.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              {filteredCustomers.length > 0 && totalPages > 1 ? (
                <div className="mt-6 flex items-center justify-between border-t border-border pt-6">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages} ({filteredCustomers.length} customers)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(currentPage + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </Card>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        className="grid grid-cols-1 gap-6 md:grid-cols-3"
      >
        {[
          {
            label: "Total Customers",
            value: customers.length,
            color: "text-primary",
          },
          {
            label: "Total Revenue",
            value: formatCurrency(totalRevenue),
            color: "text-blue-600",
          },
          {
            label: "Average Order Value",
            value: formatCurrency(averageOrderValue),
            color: "text-green-600",
          },
        ].map((stat) => (
          <motion.div key={stat.label} variants={itemVariants}>
            <Card className="p-6">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className={`mt-2 text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </p>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
