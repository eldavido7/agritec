"use client";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SuspendAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountName: string;
  accountType: "seller" | "farmer" | "buyer";
  onConfirm: () => void;
  isLoading?: boolean;
}

export function SuspendAccountDialog({
  open,
  onOpenChange,
  accountName,
  accountType,
  onConfirm,
  isLoading,
}: SuspendAccountDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Suspend Account</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to suspend{" "}
            <span className="font-semibold text-foreground">{accountName}</span>
            's account?
            <br />
            <br />
            This {accountType} will not be able to access the platform until the
            account is reactivated.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            {isLoading ? "Suspending..." : "Suspend Account"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
