import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { printReceipt } from "@/lib/print";
import { Printer } from "lucide-react";

export default function ReceiptDialog({
  open,
  onOpenChange,
  receipt,
  width,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: string | null;
  width: "58mm" | "80mm";
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cupom de Impressão</DialogTitle>
          <DialogDescription>
            Prévia exatamente como sai na impressora térmica ({width}).
          </DialogDescription>
        </DialogHeader>

        {receipt ? (
          <>
            {/* fonte monoespaçada: é o alinhamento real da bobina */}
            <pre className="max-h-[55vh] overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-xs leading-tight">
              {receipt}
            </pre>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700"
                onClick={() => printReceipt(receipt, width)}
              >
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
              </Button>
            </div>
          </>
        ) : (
          <div className="py-8 text-center text-muted-foreground">Carregando...</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
