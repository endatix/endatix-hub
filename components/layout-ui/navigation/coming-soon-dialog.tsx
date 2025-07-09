"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ComingSoonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
}

export function ComingSoonDialog({ isOpen, onClose, featureName }: ComingSoonDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center">
            Coming soon
          </DialogTitle>
          <div className="mt-20" />
          <DialogDescription className="text-left px-4 leading-relaxed">
            <span className="font-semibold text-foreground">{featureName}</span> is coming soon!
            Endatix Hub is the new exciting way to manage your data collection and processing workflows.
            We&apos;re constantly adding new features and enhancing existing ones to make your data management experience even better.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="sm">
            <a 
              href="https://endatix.com?utm_source=endatix-hub&utm_medium=product"
              target="_blank"
              rel="noopener noreferrer"
            >
              Learn about Endatix
            </a>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <a 
              href="https://docs.endatix.com/docs/category/getting-started?utm_source=endatix-hub&utm_medium=product"
              target="_blank"
              rel="noopener noreferrer"
            >
              Read our Docs
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 