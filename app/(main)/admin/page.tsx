import { AdminMenuCards } from "@/components/admin-ui/admin-menu-cards";

export default function AdminPage() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <AdminMenuCards />
    </div>
  );
}
