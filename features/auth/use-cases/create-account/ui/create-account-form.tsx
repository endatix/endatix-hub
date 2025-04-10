"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { Spinner } from "@/components/loaders/spinner";
import { ErrorMessage } from "@/components/forms/error-message";

const CreateAccountForm = () => {
  return (
    <form>
      <div className="grid gap-2 text-center">
        <div className="flex justify-center mb-2">
          <Image 
            src="/assets/icons/endatix.svg" 
            alt="Endatix logo" 
            width={180} 
            height={60} 
            priority
          />
        </div>
        <p className="mb-6 text-balance text-muted-foreground">
          Collect data with highly customizable forms in minutes
        </p>
      </div>
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            name="email"
            required
            autoFocus
            tabIndex={1}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" name="password" required tabIndex={2} />
        </div>
        <Button type="submit" className="w-full" tabIndex={3}>
          Create account with email
        </Button>
      </div>
    </form>
  );
};

export default CreateAccountForm;
