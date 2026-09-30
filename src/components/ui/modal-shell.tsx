import { Dialog, DialogContent } from "@/components/ui/dialog";

export function ModalShell({
  open,
  onOpenChange,
  children,
  className
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className={className}>{children}</DialogContent>
    </Dialog>
  );
}
