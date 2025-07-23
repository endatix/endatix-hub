import { AdminMenuCards } from "@/components/admin-ui/admin-menu-cards";
import { requireAdmin } from "@/components/admin-ui/admin-protection";

export default async function AdminPage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <AdminMenuCards />
    </div>
  );
}
