import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MARK_EMPHASIS_ON, stripMarkers } from "@shared/receipt";
import { Printer } from "lucide-react";

export default function ReceiptDialog({
  open,
  onOpenChange,
  receipt,
  width,
  onPrint,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: string | null;
  width: "58mm" | "80mm";
  /** Quem chama decide o que fazer além de imprimir (confirmar o pedido). */
  onPrint: () => void;
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
            {/* Reproduz o destaque da térmica: linha marcada sai em negrito e
                maior, e os caracteres de controle não aparecem */}
            <pre className="max-h-[55vh] overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-xs leading-tight">
              {receipt.split(/\r?\n/).map((linha, i) =>
                linha.includes(MARK_EMPHASIS_ON) ? (
                  <span key={i} className="block text-sm font-bold">
                    {stripMarkers(linha)}
                  </span>
                ) : (
                  <span key={i} className="block">
                    {stripMarkers(linha)}
                  </span>
                )
              )}
            </pre>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700"
                onClick={onPrint}
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
