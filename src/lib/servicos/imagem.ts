/** Reduz uma imagem no navegador (lado maior `max` px, JPEG) e devolve data URL. */
export async function reduzirImagem(arquivo: File, max = 1280, qualidade = 0.7): Promise<string> {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, falha) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => falha(new Error("Não foi possível ler a imagem."));
      i.src = url;
    });
    const escala = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * escala));
    const h = Math.max(1, Math.round(img.naturalHeight * escala));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Navegador sem suporte a canvas.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    let q = qualidade;
    let dados = canvas.toDataURL("image/jpeg", q);
    // Garante que caiba no limite do servidor (~800 mil caracteres).
    while (dados.length > 750_000 && q > 0.35) {
      q -= 0.1;
      dados = canvas.toDataURL("image/jpeg", q);
    }
    return dados;
  } finally {
    URL.revokeObjectURL(url);
  }
}
