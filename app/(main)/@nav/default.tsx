import MainNav from "@/components/layout-ui/navigation/main-nav";

export default function DefaultNavSlot() {
  return (
    <aside className="w-14 flex-col border-r bg-background hidden sm:flex">
      <MainNav />
    </aside>
  );
}
