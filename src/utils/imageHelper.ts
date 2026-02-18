import { MAX_IMAGE_SIZE } from "@/const/number";

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
async function imageConverter(img: HTMLImageElement, max_size: number = 480) {
  try {
    const aspectRatio = img.height / img.width;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (aspectRatio >= 1) {
      canvas.width = max_size;
      canvas.height = Math.round(max_size * aspectRatio);
    } else {
      canvas.height = max_size;
      canvas.width = Math.round(max_size / aspectRatio);
    }

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    return canvas;
  } catch (e) {
    console.error("Image conversion failed:", e);
    return false;
  }
}

/**
 * 画像<img>を取得する
 */
export async function getImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(0);
    img.src = url;
  });
}

/** 
 * リサイズしたBase64文字列を取得
 */
export async function getResizedBase64(data: string | Blob): Promise<string> {
  const dataURL : string | null = data instanceof Blob ? await convertToBase64(data) : data;
  if (!dataURL) return "";
  const type = dataURL.split(":")[1].split(";")[0] || "image/jpeg";

  const img = await getImage(dataURL);

  const aspectRatio = img.height / img.width
  const typeCheck = (() => {
    if (type === "image/webp") {
      return true;
    } else if (!isCanvasSupportedWebp()) {
      return type === "image/jpeg";
    }
    return false;
  })()

  // 規定サイズ以下かつWebpならならそのまま返す
  if (typeCheck && ((aspectRatio >= 1 && img.width <= MAX_IMAGE_SIZE) || (aspectRatio < 1 && img.height <= MAX_IMAGE_SIZE))) {
    return dataURL;
  }

  const canvas = await imageConverter(img, MAX_IMAGE_SIZE);
  if (!canvas) return "";

 return canvas.toDataURL(isCanvasSupportedWebp() ? "image/webp" : "image/jpeg", 0.75);
}

/**
 * BlobをBase64文字列に変換する
 */
export async function convertToBase64(blob: Blob): Promise<string | null> {
  if (!blob || !(blob instanceof Blob)) return blob;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}
