import { getBrand } from "@/lib/branding/server";
import { cookies } from "next/headers";

export async function DeclinedNotice() {
  if ((await cookies()).get("terms-declined")?.value !== "1") return null;
  return (
    <p role="status">
      You signed out without accepting the Terms. <OperatorContact />
    </p>
  );
}

export async function OperatorContact() {
  const brand = await getBrand();
  return brand.links.support ? (
    <a className="text-primary underline" href={brand.links.support}>
      Contact {brand.name} support
    </a>
  ) : (
    <span>Contact your organization’s administrator for help.</span>
  );
}
