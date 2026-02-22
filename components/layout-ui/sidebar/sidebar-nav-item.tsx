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

interface SidebarNavItemProps extends React.ComponentProps<
  typeof SidebarMenuButton
> {
  item: INavItem;
}

export function SidebarNavItem({ item, ...props }: SidebarNavItemProps) {
  const hasChildren = (item.children?.length ?? 0) > 0;

  if (hasChildren) {
    return (
      <Collapsible asChild className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip={item.title} {...props}>
              {item.icon && <item.icon className="h-5 w-5" />}
              <span>{item.title}</span>
              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.children?.map((subItem) => (
                <SidebarMenuSubItem key={subItem.title}>
                  <SidebarMenuSubButton asChild>
                    <Link
                      href={subItem.url as Route}
                      target={subItem.external ? "_blank" : undefined}
                    >
                      <span>{subItem.title}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip={item.title} {...props}>
        <Link href={item.url as Route}>
          {item.icon && <item.icon className="h-5 w-5" />}
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
