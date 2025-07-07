"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import GitHubIcon from "@/public/assets/icons/github.svg";

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
          <DialogTitle>
            <Image
              src="/assets/icons/endatix.svg"
              alt="Endatix logo"
              width={180}
              height={38}
              priority
            />
          </DialogTitle>
          <div className="text-center py-2">
            <p className="text-lg font-medium">Coming soon!</p>
          </div>
          <DialogDescription className="mx-auto px-10 text-balance leading-relaxed">
            <span className="font-semibold text-foreground">
              {featureName}
            </span>{" "}
            is coming soon! Endatix Hub is the new exciting way to manage your
            data collection and processing workflows. We&apos;re constantly adding new features
            and enhancing existing ones to make your data management experience even better.
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
          <Button asChild variant="outline" size="sm">
            <a 
              href="https://github.com/endatix/endatix?tab=readme-ov-file#endatix-platform"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                aria-hidden
                className="dark:invert mr-2"
                src={GitHubIcon}
                alt="GitHub icon"
                width={16}
                height={16}
              />
              Follow us on GitHub
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 