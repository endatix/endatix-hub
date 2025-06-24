import MainNav from "@/components/layout-ui/navigation/main-nav";

export default function NavSlot() {
  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
      <MainNav />
    </aside>
  );
}
