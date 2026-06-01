"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSellerMockData, mockCustomers } from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/formatting";
import { ChevronLeft, ChevronRight } from "lucide-react";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const ITEMS_PER_PAGE = 10;

export default function CustomersPage() {
  const seller = getSellerMockData();
  const sellerCustomers = seller.customers;
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredCustomers = sellerCustomers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.location.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial="hidden" animate="visible" variants={itemVariants}>
        <div>
          <p className="text-muted-foreground mt-2">
            Manage buyer relationships for {seller.farmName}
          </p>
        </div>
      </motion.div>

      {/* Search */}
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
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
        />
      </motion.div>

      {/* Customers Table */}
      <motion.div initial="hidden" animate="visible" variants={itemVariants}>
        <Card className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Customer Name
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Location
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Email
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Phone
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Orders
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Total Spent
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Last Order
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="border-b border-border hover:bg-secondary/50 dark:hover:bg-secondary/30 dark:hover:text-white transition-colors"
                  >
                    <td className="py-3 px-4 text-sm font-semibold text-foreground">
                      {customer.name}
                    </td>
                    <td className="py-3 px-4 text-sm text-foreground">
                      {customer.location}
                    </td>
                    <td className="py-3 px-4 text-sm text-foreground">
                      {customer.email || "-"}
                    </td>
                    <td className="py-3 px-4 text-sm text-foreground">
                      {customer.phone || "-"}
                    </td>
                    <td className="py-3 px-4 text-sm text-foreground">
                      {customer.totalOrders}
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-primary">
                      {formatCurrency(customer.totalSpent)}
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {formatDate(customer.lastOrder)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} ({filteredCustomers.length}{" "}
                customers)
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="border-border text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <Button
                      key={page}
                      size="sm"
                      variant={currentPage === page ? "default" : "outline"}
                      onClick={() => setCurrentPage(page)}
                      className={
                        currentPage === page
                          ? "bg-primary text-primary-foreground"
                          : "border-border text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white"
                      }
                    >
                      {page}
                    </Button>
                  ),
                )}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="border-border text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </motion.div>

      {filteredCustomers.length === 0 && (
        <motion.div variants={itemVariants} className="text-center py-12">
          <p className="text-muted-foreground">
            No customers found matching your criteria
          </p>
        </motion.div>
      )}

      {/* Summary */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {[
          {
            label: "Total Customers",
            value: sellerCustomers.length,
            color: "text-primary",
          },
          {
            label: "Total Revenue",
            value: formatCurrency(
              sellerCustomers.reduce((sum, c) => sum + c.totalSpent, 0),
            ),
            color: "text-blue-600",
          },
          {
            label: "Average Order Value",
            value: formatCurrency(
              Math.round(
                sellerCustomers.reduce((sum, c) => sum + c.totalSpent, 0) /
                  sellerCustomers.reduce((sum, c) => sum + c.totalOrders, 1),
              ),
            ),
            color: "text-green-600",
          },
        ].map((stat, idx) => (
          <motion.div key={idx} variants={itemVariants}>
            <Card className="p-6">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color} mt-2`}>
                {stat.value}
              </p>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
