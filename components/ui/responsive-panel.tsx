"use client";

import {
  createContext,
  useContext,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/lib/utils/hooks/use-media-query.hook";

type ResponsivePanelType = "simple" | "complex";
type ResponsivePanelMode = "dialog" | "drawer" | "sheet";

const desktopMediaQuery = "(min-width: 768px)";
const ResponsivePanelModeContext = createContext<ResponsivePanelMode | null>(
  null,
);

interface ResponsivePanelProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  desktopType?: ResponsivePanelType;
  dialogContentClassName?: string;
  drawerContentClassName?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  sheetContentClassName?: string;
  trigger?: ReactNode;
}

export function ResponsivePanel({
  children,
  className,
  contentClassName,
  desktopType = "complex",
  dialogContentClassName,
  drawerContentClassName,
  onOpenChange,
  open,
  sheetContentClassName,
  trigger,
}: Readonly<ResponsivePanelProps>) {
  const isDesktop = useMediaQuery(desktopMediaQuery);
  const mode = getResponsivePanelMode(isDesktop, desktopType);
  const content = (
    <ResponsivePanelModeContext value={mode}>
      {children}
    </ResponsivePanelModeContext>
  );

  if (mode === "dialog") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent
          className={cn(className, contentClassName, dialogContentClassName)}
        >
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  if (mode === "sheet") {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
        <SheetContent
          side="right"
          className={cn(
            "gap-0 overflow-hidden px-0 sm:max-w-lg",
            className,
            contentClassName,
            sheetContentClassName,
          )}
        >
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
      <DrawerContent
        className={cn(
          "h-[90vh] max-h-[90vh] gap-0 overflow-hidden px-0",
          className,
          contentClassName,
          drawerContentClassName,
        )}
      >
        {content}
      </DrawerContent>
    </Drawer>
  );
}

export function ResponsivePanelHeader({
  className,
  ...props
}: ComponentProps<"div">) {
  const mode = useResponsivePanelMode();

  if (mode === "dialog") {
    return <DialogHeader className={className} {...props} />;
  }

  if (mode === "sheet") {
    return (
      <SheetHeader
        className={cn("shrink-0 px-6 py-5 pr-12", className)}
        {...props}
      />
    );
  }

  return (
    <DrawerHeader
      className={cn("shrink-0 px-6 py-5 text-left", className)}
      {...props}
    />
  );
}

export function ResponsivePanelTitle({
  ...props
}: ComponentProps<typeof DialogTitle>) {
  const mode = useResponsivePanelMode();

  if (mode === "dialog") {
    return <DialogTitle {...props} />;
  }

  if (mode === "sheet") {
    return <SheetTitle {...props} />;
  }

  return <DrawerTitle {...props} />;
}

export function ResponsivePanelDescription({
  ...props
}: ComponentProps<typeof DialogDescription>) {
  const mode = useResponsivePanelMode();

  if (mode === "dialog") {
    return <DialogDescription {...props} />;
  }

  if (mode === "sheet") {
    return <SheetDescription {...props} />;
  }

  return <DrawerDescription {...props} />;
}

export function ResponsivePanelBody({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col content-start justify-start gap-5 overflow-y-auto px-6 py-5",
        className,
      )}
      {...props}
    />
  );
}

export function ResponsivePanelFooter({
  className,
  ...props
}: ComponentProps<"div">) {
  const mode = useResponsivePanelMode();
  const panelClassName = cn(
    "shrink-0 border-t bg-background px-6 py-4 sm:flex-row sm:justify-end",
    className,
  );

  if (mode === "dialog") {
    return <DialogFooter className={panelClassName} {...props} />;
  }

  if (mode === "sheet") {
    return <SheetFooter className={panelClassName} {...props} />;
  }

  return <DrawerFooter className={panelClassName} {...props} />;
}

function getResponsivePanelMode(
  isDesktop: boolean,
  desktopType: ResponsivePanelType,
): ResponsivePanelMode {
  if (!isDesktop) {
    return "drawer";
  }

  return desktopType === "simple" ? "dialog" : "sheet";
}

function useResponsivePanelMode() {
  const mode = useContext(ResponsivePanelModeContext);
  if (mode === null) {
    throw new Error(
      "ResponsivePanel compound components must be rendered inside ResponsivePanel.",
    );
  }

  return mode;
}
