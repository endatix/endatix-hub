"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ISitemapItem } from "@/types/navigation-models";
import React from "react";

type BreadcrumbNavProps = {
  sitemap: ISitemapItem[];
  homeText?: string;
  listClasses?: string;
  activeClasses?: string;
  capitalizeLinks?: boolean;
};

const BreadcrumbNav = ({
  homeText,
  listClasses,
  activeClasses,
  capitalizeLinks = true,
}: BreadcrumbNavProps) => {
  const currentPath = usePathname();
  const pathNames = currentPath.split("/").filter((path) => path);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {homeText?.length && (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">{homeText}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {pathNames?.length > 0 && <BreadcrumbSeparator />}
          </>
        )}
        {pathNames.map((link, index) => {
          const href = `/${pathNames.slice(0, index + 1).join("/")}`;
          const itemClasses =
            currentPath === href
              ? `${listClasses} ${activeClasses}`
              : listClasses;
          const parsedLink = link.replace("-", " ");
          const itemLink = capitalizeLinks
            ? parsedLink[0].toUpperCase() +
              parsedLink.slice(1, parsedLink.length)
            : parsedLink;

          if (index === pathNames.length - 1) {
            return (
              <React.Fragment key={href}>
                {pathNames.length > 2 && (
                  <>
                    <BreadcrumbEllipsis className="md:hidden" />
                    <BreadcrumbSeparator className="md:hidden" />
                  </>
                )}
                <BreadcrumbItem>
                  <BreadcrumbPage>{itemLink}</BreadcrumbPage>
                </BreadcrumbItem>
              </React.Fragment>
            );
          }

          return (
            <React.Fragment key={index}>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink className={itemClasses} asChild>
                  <Link href={{ pathname: href }}>{itemLink}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {pathNames.length !== index + 1 && (
                <BreadcrumbSeparator className="hidden md:block" />
              )}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default BreadcrumbNav;
