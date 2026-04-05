"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

export function FormSubmitButton({
  idleLabel,
  pendingLabel = "Сохраняю...",
  ...props
}: {
  idleLabel: string;
  pendingLabel?: string;
} & Omit<ButtonProps, "type" | "disabled" | "children">) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? pendingLabel : idleLabel}
    </Button>
  );
}
