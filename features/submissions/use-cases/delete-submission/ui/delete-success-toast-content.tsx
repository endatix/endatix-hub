import type { ReactNode } from "react";
import { FlaskConical, User, Users } from "lucide-react";
import type { DeleteSubmissionKind } from "../delete-submission-risk";

export type DeleteSuccessToastContent = {
  title: ReactNode;
  description: ReactNode;
};

/**
 * Kind-specific success toast so operators can instantly confirm
 * what they deleted (test vs own vs respondent).
 */
export function deleteSuccessToastContent(
  kind: DeleteSubmissionKind,
): DeleteSuccessToastContent {
  switch (kind) {
    case "test":
      return {
        title: (
          <span className="inline-flex items-center gap-1.5">
            <FlaskConical
              className="h-4 w-4 shrink-0 text-amber-600"
              aria-hidden
            />
            <span>
              <span className="font-semibold">Test</span> submission deleted
            </span>
          </span>
        ),
        description: "Removed from the list, form counts, and exports.",
      };
    case "owned":
      return {
        title: (
          <span className="inline-flex items-center gap-1.5">
            <User className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span>
              <span className="font-semibold">Your</span> submission deleted
            </span>
          </span>
        ),
        description: "Removed from the list, form counts, and exports.",
      };
    case "respondent":
      return {
        title: (
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
            <span>
              <span className="font-semibold">Respondent</span> submission
              deleted
            </span>
          </span>
        ),
        description: "Removed from the list, form counts, and exports.",
      };
  }
}
