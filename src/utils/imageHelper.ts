import { MAX_IMAGE_WIDTH } from "@/const/number";

const isCanvasSupportedWebp = (() => {
  let toBlobSupportWebp: boolean | undefined = undefined;

  return function () {
    if (toBlobSupportWebp !== undefined) return toBlobSupportWebp;

    const canvas = document.createElement("canvas");
    toBlobSupportWebp =
      canvas.toDataURL("image/webp").indexOf("data:image/webp") === 0;
    return toBlobSupportWebp;
  };
})();

/**
 * 画像リサイズ
 */
async function imageConverter(url: string, max_width: number = 480) {
  try {
    const img: HTMLImageElement = await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = url;
    });

    const aspectRatio = img.height / img.width;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = max_width;
    canvas.height = aspectRatio * max_width;

    ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

    return canvas;
  } catch (e) {
    console.error("Image conversion failed:", e);
    return false;
  }
}

/**
 * Base64文字列を再圧縮せずにそのままBlobに変換する
 */
export function base64ToBlob(base64: string): Blob {
  const [header, data] = base64.split(",");
  const mime = header?.match(/:(.*?);/)?.[1] || "image/png";
  const bin = atob(data);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    buf[i] = bin.charCodeAt(i);
  }
  return new Blob([buf], { type: mime });
}

/**
 * 画像の横幅を取得する
 */
export function getImageWidth(url: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.width);
    img.onerror = () => resolve(0);
    img.src = url;
  });
}

/**
 * リサイズしたBlobを取得
 */
export async function getResizedBlob(url: string): Promise<Blob | null> {
  // 1. まずは画像サイズを調べる
  const img: HTMLImageElement = await new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });

  // 2. すでに制限サイズ以下なら、変換せず元のデータをBlobとして取得
  if (img.width <= MAX_IMAGE_WIDTH) {
    const response = await fetch(url);
    return await response.blob();
  }

  const canvas = await imageConverter(url, MAX_IMAGE_WIDTH);
  if (!canvas) return null;

  return new Promise((resolve) => {
    // ブラウザが対応していればwebp、そうでなければjpegで書き出し
    const type = isCanvasSupportedWebp() ? "image/webp" : "image/jpeg";
    canvas.toBlob(
      (blob) => {
        resolve(blob);
      },
      type,
      0.8,
    ); // 品質を0.8程度に設定
  });
}

/**
 * BlobをBase64文字列に変換する（保存時のみ使用）
 */
export async function convertToBase64(blob: Blob | undefined) {
  if (!blob || !(blob instanceof Blob)) return blob;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}
