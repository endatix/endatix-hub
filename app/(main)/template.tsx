import { Suspense, type ReactNode } from "react";
import { NoticeSlot } from "@/features/auth/required-actions/notice-slot";

export default function Template({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <Suspense fallback={null}>
        <NoticeSlot />
      </Suspense>
      {children}
    </>
  );
}
