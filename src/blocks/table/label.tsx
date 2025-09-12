import { Badge } from "@/components/ui/badge";

export function Label({
  value,
  options,
  className,
}: {
  value: string;
  options?: any;
  className?: string;
}) {
  return (
    <Badge variant={options?.variant ?? "secondary"} className={className}>
      {value.toString()}
    </Badge>
  );
}
