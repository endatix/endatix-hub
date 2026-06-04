import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { INavItem } from "@/types/navigation-models";
import { ChevronRight } from "lucide-react";
import { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarNavItemProps extends React.ComponentProps<
  typeof SidebarMenuButton
> {
  item: INavItem;
  isCollapsed?: boolean;
}

export function SidebarNavItem({
  item,
  isCollapsed = false,
  ...props
}: Readonly<SidebarNavItemProps>) {
  const pathname = usePathname();
  const hasChildren = (item.children?.length ?? 0) > 0;
  const isActive =
    pathname === item.url ||
    (item.children?.some(
      (child) => !child.isSectionHeader && pathname === child.url,
    ) ??
      false);

  if (hasChildren && isCollapsed && item.url) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={item.title} {...props}>
          <Link
            href={item.url as Route}
            target={item.external ? "_blank" : undefined}
          >
            {item.icon && <item.icon className="h-5 w-5" />}
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  if (hasChildren) {
    return (
      <Collapsible asChild defaultOpen={isActive} className="group/collapsible">
        <SidebarMenuItem>
          <div className="flex items-center gap-1">
            <SidebarMenuButton
              asChild
              isActive={isActive}
              tooltip={item.title}
              className="flex-1"
              {...props}
            >
              <Link
                href={item.url as Route}
                target={item.external ? "_blank" : undefined}
              >
                {item.icon && <item.icon className="h-5 w-5" />}
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                type="button"
                tooltip={`Toggle ${item.title}`}
                className="w-8 shrink-0 justify-center px-0"
              >
                <ChevronRight className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.children?.map((subItem) => {
                if (subItem.isSectionHeader) {
                  return (
                    <SidebarMenuSubItem key={subItem.title}>
                      <div className="px-2 py-2 text-[0.68rem] font-semibold tracking-wider text-muted-foreground uppercase">
                        {subItem.title}
                      </div>
                    </SidebarMenuSubItem>
                  );
                }

                return (
                  <SidebarMenuSubItem key={subItem.title}>
                    <SidebarMenuSubButton
                      asChild
                      isActive={pathname === subItem.url}
                    >
                      <Link
                        href={subItem.url as Route}
                        target={subItem.external ? "_blank" : undefined}
                      >
                        {subItem.icon && <subItem.icon className="h-4 w-4" />}
                        <span>{subItem.title}</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                );
              })}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip={item.title} {...props}>
        <Link
          href={item.url as Route}
          target={item.external ? "_blank" : undefined}
        >
          {item.icon && <item.icon className="h-5 w-5" />}
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
