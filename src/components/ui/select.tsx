"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn("flex h-11 w-full items-center justify-between rounded-[var(--radius)] border bg-white px-3 text-sm", className)}
      {...props}
    >
      <SelectPrimitive.Value />
      <ChevronDown className="h-4 w-4 text-slate-500" />
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content className={cn("z-50 rounded-[var(--radius)] border bg-white shadow-lg", className)} {...props} />
    </SelectPrimitive.Portal>
  );
}

export function SelectItem(props: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return <SelectPrimitive.Item className="cursor-pointer px-3 py-2 text-sm outline-none hover:bg-slate-100" {...props} />;
}
