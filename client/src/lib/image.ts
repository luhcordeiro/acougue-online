/**
 * Prepara imagens antes do upload.
 *
 * Foto de celular costuma ter 3–6 MB e 4000px de largura. Enviar isso como
 * base64 pelo tRPC (que ainda cresce ~33%) desperdiça banda do lojista, memória
 * do Worker e depois carrega lento para cada cliente da loja. Redimensionar no
 * navegador resolve os três de uma vez.
 */

type ResizeOptions = {
  /** Maior dimensão permitida, em pixels. */
  maxSize?: number;
  /** 0–1; 0.82 mantém boa qualidade com arquivo pequeno. */
  quality?: number;
};

export type PreparedImage = {
  /** Conteúdo em base64, sem o prefixo `data:...;base64,`. */
  base64: string;
  mimeType: string;
  fileName: string;
  /** Tamanho final em bytes, para exibir ao usuário. */
  size: number;
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a imagem"));
    };

    img.src = url;
  });
}

export async function prepareImage(
  file: File,
  { maxSize = 1920, quality = 0.82 }: ResizeOptions = {}
): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("O arquivo selecionado não é uma imagem");
  }

  const img = await loadImage(file);

  const escala = Math.min(1, maxSize / Math.max(img.width, img.height));
  const largura = Math.round(img.width * escala);
  const altura = Math.round(img.height * escala);

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível processar a imagem");

  ctx.drawImage(img, 0, 0, largura, altura);

  // PNG com transparência perderia o fundo ao virar JPEG; como a fachada é
  // foto, JPEG compensa muito no tamanho.
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const base64 = dataUrl.split(",")[1] ?? "";

  return {
    base64,
    mimeType: "image/jpeg",
    fileName: file.name.replace(/\.[^.]+$/, "") || "imagem",
    // cada 4 caracteres de base64 representam 3 bytes
    size: Math.round((base64.length * 3) / 4),
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
