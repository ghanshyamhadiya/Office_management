import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";

export function ConfirmDialogShell({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmLabel = "Confirm"
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmLabel?: string;
}) {
  return (
    <ModalShell onOpenChange={onOpenChange} open={open}>
      <div className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm leading-6 text-slate-500">{description}</p>
        </div>
        <div className="flex justify-end gap-3">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </ModalShell>
  );
}
