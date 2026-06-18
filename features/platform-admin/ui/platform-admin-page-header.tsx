interface PlatformAdminPageHeaderProps {
  title: string;
  description: string;
}

export function PlatformAdminPageHeader({
  title,
  description,
}: Readonly<PlatformAdminPageHeaderProps>) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
        Platform Admin
      </p>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="max-w-3xl text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
