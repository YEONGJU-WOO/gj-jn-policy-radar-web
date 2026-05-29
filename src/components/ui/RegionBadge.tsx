import { Badge } from "@/components/ui/badge";

export function RegionBadge({ region }: { region: string }) {
  const isJeonnam = region.includes("전남") || region.includes("jeonnam");
  return <Badge variant={isJeonnam ? "warning" : "default"}>{isJeonnam ? "전남" : "광주"}</Badge>;
}
