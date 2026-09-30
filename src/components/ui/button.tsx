"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]",
        outline: "border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--hover)]",
        secondary: "bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[color-mix(in_srgb,var(--secondary)_80%,var(--foreground)_8%)]",
        ghost: "text-[var(--muted-foreground)] hover:bg-[var(--hover)] hover:text-[var(--foreground)]",
        destructive: "bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:opacity-90"
      },
      size: {
        default: "h-9 min-h-9",
        sm: "h-8 min-h-8 px-2.5 text-xs",
        lg: "h-10 min-h-10 px-4"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";
