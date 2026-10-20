"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AIAnalysisButtonProps {
  auditId: string;
}

export function AIAnalysisButton({ auditId }: AIAnalysisButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/audits/${auditId}/analyze`, {
        method: "POST",
      });

      const resData = await response.json();

      if (!response.ok || resData.error) {
        throw new Error(resData.error?.message || "AI Analysis failed to execute.");
      }

      toast.success(
        `AI Analysis complete! Generated ${resData.data.opportunityCount} service opportunities.`
      );

      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to run AI analysis.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleAnalyze}
      disabled={loading}
      className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Gemini Analyzing...</span>
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          <span>Run AI Opportunity Analysis</span>
        </>
      )}
    </Button>
  );
}
