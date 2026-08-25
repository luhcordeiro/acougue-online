import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatFileSize, prepareImage } from "@/lib/image";
import { trpc } from "@/lib/trpc";
import { ImageIcon, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

export default function HeroImageCard() {
  const utils = trpc.useUtils();
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);

  const { data, isLoading } = trpc.settings.getHeroImage.useQuery();

  const uploadMutation = trpc.settings.uploadHeroImage.useMutation({
    onSuccess: () => {
      toast.success("Foto da fachada atualizada!");
      utils.settings.getHeroImage.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const removeMutation = trpc.settings.removeHeroImage.useMutation({
    onSuccess: () => {
      toast.success("Foto removida. A home volta ao fundo vermelho.");
      utils.settings.getHeroImage.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setEnviando(true);
    try {
      // Reduz antes de enviar: foto de celular tem vários MB
      const imagem = await prepareImage(file, { maxSize: 1920 });

      await uploadMutation.mutateAsync({
        fileName: imagem.fileName,
        fileData: imagem.base64,
        mimeType: imagem.mimeType,
      });

      toast.info(`Enviado: ${formatFileSize(imagem.size)}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao enviar a imagem"
      );
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const ocupado = enviando || uploadMutation.isPending || removeMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Foto da Fachada
        </CardTitle>
        <CardDescription>
          Aparece como fundo do topo da loja. Use uma foto na horizontal, de
          preferência com boa iluminação.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="py-4 text-center">Carregando...</div>
        ) : (
          <>
            {data?.url ? (
              <div className="space-y-2">
                {/* Prévia com o mesmo escurecimento aplicado na home, para o
                    lojista ver como o texto vai ficar sobre a foto */}
                <div className="relative overflow-hidden rounded-lg border">
                  <img
                    src={data.url}
                    alt="Fachada do açougue"
                    className="h-40 w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-red-900/85 to-red-800/70" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center text-white">
                    <p className="text-lg font-bold">Carnes Frescas Direto na Sua Casa</p>
                    <p className="text-xs text-red-50">
                      Escolha os melhores cortes e receba com qualidade garantida.
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Assim é como aparece na loja.
                </p>
              </div>
            ) : (
              <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                Nenhuma foto enviada. O topo da loja usa o fundo vermelho padrão.
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="fachada">
                {data?.url ? "Trocar foto" : "Enviar foto"}
              </Label>
              <Input
                id="fachada"
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={handleFile}
                disabled={ocupado}
              />
              <p className="text-xs text-muted-foreground">
                A imagem é reduzida automaticamente antes do envio, então pode
                usar a foto direto do celular.
              </p>
            </div>

            <div className="flex gap-2">
              {ocupado && (
                <Button disabled className="bg-red-600">
                  <Upload className="mr-2 h-4 w-4 animate-pulse" />
                  Enviando...
                </Button>
              )}

              {data?.url && !ocupado && (
                <Button
                  variant="outline"
                  onClick={() => removeMutation.mutate()}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remover foto
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
