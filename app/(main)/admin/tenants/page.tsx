import { requireAdmin } from "@/components/admin-ui/admin-protection";

export default async function TenantsPage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <h1 className="text-2xl font-bold">Tenants</h1>
    </div>
  );
}
