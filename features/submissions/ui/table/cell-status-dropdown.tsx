"use client";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { SubmissionStatus, SubmissionStatusKind } from "@/types";
import { ChevronDown, Check } from "lucide-react";
import { useState } from "react";
import { changeStatusAction } from "@/features/submissions/use-cases/change-status/change-status.action";
import { toast } from "@/components/ui/toast";
import { Spinner } from "@/components/loaders/spinner";

interface CellStatusDropdownProps {
  code: string;
  submissionId: string;
  formId: string;
}

export function CellStatusDropdown({ code, submissionId, formId }: CellStatusDropdownProps) {
  const [isPending, setIsPending] = useState(false);
  const [status, setStatus] = useState(code);
  const currentStatus = SubmissionStatus.fromCode(status);
  
  const statusOptions = [
    SubmissionStatus.fromCode(SubmissionStatusKind.New),
    SubmissionStatus.fromCode(SubmissionStatusKind.Read),
    SubmissionStatus.fromCode(SubmissionStatusKind.Approved)
  ];

  const handleStatusChange = async (newStatus: SubmissionStatusKind) => {
    if (newStatus === currentStatus.value) return;
    
    setIsPending(true);
    try {
      const result = await changeStatusAction({
        submissionId,
        formId,
        status: newStatus
      });
      
      if (result.success) {
        setStatus(newStatus);
        toast.success(`Status updated to ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`);
      } else {
        toast.error(result.error || "Failed to update status");
      }
    } catch (error) {
      toast.error("An error occurred while updating status");
      console.error(error);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Badge 
          variant={currentStatus.isNew() ? "default" : "secondary"}
          className="cursor-pointer inline-flex items-center gap-1 w-auto max-w-[150px]"
        >
          {isPending ? <Spinner className="h-3 w-3 mr-1" /> : <currentStatus.icon className="h-3 w-3 mr-1" />}
          {currentStatus.label}
          <ChevronDown className="h-3 w-3 ml-1" />
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {statusOptions.map((option) => (
          <DropdownMenuItem 
            key={option.value}
            disabled={isPending || currentStatus.value === option.value}
            onClick={() => handleStatusChange(option.value as SubmissionStatusKind)}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <option.icon className="h-4 w-4" />
              {option.label}
            </div>
            {currentStatus.value === option.value && (
              <Check className="h-4 w-4 ml-2" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
