import { Button, type ButtonProps } from "@/components/ui/button";

export function PrimaryButton(props: ButtonProps) {
  return <Button {...props} />;
}

export function SecondaryButton(props: ButtonProps) {
  return <Button variant="outline" {...props} />;
}
