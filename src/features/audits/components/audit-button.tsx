"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FileSearch, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AuditButtonProps {
  businessId: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  label?: string;
}

export function AuditButton({
  businessId,
  variant = "outline",
  size = "sm",
  label = "Run Website Audit",
}: AuditButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAudit = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/leads/${businessId}/audit`, {
        method: "POST",
      });

      const resData = await response.json();

      if (!response.ok || resData.error) {
        throw new Error(resData.error?.message || "Audit failed to execute.");
      }

      toast.success(
        `Audit completed! Overall score: ${resData.data.overallScore}/100 (${resData.data.issueCount} issues identified)`
      );

      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to run website audit.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleAudit}
      variant={variant}
      size={size}
      disabled={loading}
      className="gap-2 border-slate-800 text-slate-300 hover:bg-slate-800"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
          <span>Auditing Website...</span>
        </>
      ) : (
        <>
          <FileSearch className="h-4 w-4 text-indigo-400" />
          <span>{label}</span>
        </>
      )}
    </Button>
  );
}
