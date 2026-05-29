import { JEONNAM_REGIONS } from "@/components/domain/explorer/constants";
import { Badge } from "@/components/ui/badge";

export function RegionBadge({ region }: { region: string }) {
  const isJeonnam =
    region.includes("전남") ||
    region.includes("jeonnam") ||
    JEONNAM_REGIONS.some((name) => region.includes(name));

  return <Badge variant={isJeonnam ? "warning" : "default"}>{region}</Badge>;
}
