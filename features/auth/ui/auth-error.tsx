import { ErrorDetails } from "@/features/auth";

interface AuthErrorDetailsProps {
  errorDetatails: ErrorDetails;
}

export default function AuthErrorDetails({
  errorDetatails,
}: AuthErrorDetailsProps) {
  return (
    <div className="mt-2 text-sm text-gray-500 gap-4">
      <p className="text-center mb-4">{errorDetatails.message}</p>
      <p className="text-center mb-4">
        Unique error code:{" "}
        <code className="rounded-sm bg-slate-100 p-1 text-xs">
          {errorDetatails.code}
        </code>
      </p>
    </div>
  );
}
