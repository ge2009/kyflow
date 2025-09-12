import { Form as FormType } from "@/types/blocks/form";
import { Form } from "@/blocks/form";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function FormCard({
  form,
  className,
}: {
  form: FormType;
  className?: string;
}) {
  return (
    <Card className={cn("p-4", className)}>
      <Form {...form} />
    </Card>
  );
}
