import { Badge, type BadgeVariant } from "@/ui/badge";
import type { CatalogStatus } from "@/lib/catalog";

const LOOK: Record<CatalogStatus, { label: string; variant: BadgeVariant }> = {
  DRAFT: { label: "Draft", variant: "default" },
  BETA: { label: "Beta", variant: "info" },
  STABLE: { label: "Stable", variant: "success" },
  DEPRECATED: { label: "Deprecated", variant: "warning" },
};

export function StatusBadge({ status, size = "md" }: { status: CatalogStatus; size?: "sm" | "md" }) {
  const look = LOOK[status];
  return (
    <Badge variant={look.variant} size={size}>
      {look.label}
    </Badge>
  );
}
