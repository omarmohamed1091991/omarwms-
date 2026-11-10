"use client"

/**
 * تحويل أي صورة يختارها المستخدم (HEIC/HEIF، WebP، GIF، BMP، AVIF، TIFF، SVG…)
 * وبأي مقاس إلى صورة JPEG مضغوطة يقبلها WhatsApp (JPEG/PNG حتى 5 ميجابايت)
 * وتمر عبر حد حجم الطلب في الخادم.
 */

/** أقصى حجم مقبول بعد التحويل (أقل من حد الرفع عبر الموقع وحد WhatsApp للصور). */
export const IMAGE_TARGET_BYTES = 4 * 1024 * 1024
/** أقصى طول لأي ضلع بالبكسل. */
const MAX_DIMENSION = 4096

const PASSTHROUGH_TYPES = ["image/jpeg", "image/png"]
const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif|tiff?|svg|ico|jfif|pjpeg|pjp)$/i

export function isImageFile(file: File) {
  return file.type.startsWith("image/") || IMAGE_EXT_RE.test(file.name)
}

function isHeic(file: File) {
  return /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)
}

function loadWithImageElement(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("decode-failed"))
    }
    img.src = url
  })
}

async function decode(blob: Blob): Promise<{ source: CanvasImageSource; width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(blob, { imageOrientation: "from-image" } as ImageBitmapOptions)
      return { source: bmp, width: bmp.width, height: bmp.height }
    } catch {
      // نجرب عنصر الصورة كبديل (مثلاً SVG)
    }
  }
  const img = await loadWithImageElement(blob)
  return { source: img, width: img.naturalWidth || 1024, height: img.naturalHeight || 1024 }
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality))
}

function jpgName(name: string) {
  const base = name.replace(/\.[^.]+$/, "") || "image"
  return `${base}.jpg`
}

/**
 * يعيد ملف صورة جاهزاً للرفع. صور JPEG/PNG الصغيرة تُعاد كما هي،
 * وأي صورة أخرى تُحوَّل إلى JPEG ويُصغَّر مقاسها/جودتها حتى تصبح ضمن الحد.
 */
export async function normalizeImageForUpload(file: File, targetBytes = IMAGE_TARGET_BYTES): Promise<File> {
  if (PASSTHROUGH_TYPES.includes(file.type) && file.size <= targetBytes) return file

  let input: Blob = file
  if (isHeic(file)) {
    try {
      const { default: heic2any } = await import("heic2any")
      const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 })
      input = Array.isArray(out) ? out[0] : out
    } catch {
      // بعض المتصفحات (Safari) تفك HEIC مباشرة؛ نكمل بالملف الأصلي
    }
  }

  let decoded
  try {
    decoded = await decode(input)
  } catch {
    throw new Error("تعذّر قراءة الصورة. جرّب صيغة أخرى مثل JPG أو PNG.")
  }

  const { source, width, height } = decoded
  let scale = Math.min(1, MAX_DIMENSION / Math.max(width, height))
  const qualities = [0.92, 0.85, 0.78, 0.7, 0.6]

  try {
    for (let attempt = 0; attempt < 8; attempt++) {
      const w = Math.max(1, Math.round(width * scale))
      const h = Math.max(1, Math.round(height * scale))
      const canvas = document.createElement("canvas")
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("canvas")
      // خلفية بيضاء للصور الشفافة لأن JPEG لا يدعم الشفافية
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, w, h)
      ctx.imageSmoothingQuality = "high"
      ctx.drawImage(source, 0, 0, w, h)

      for (const q of qualities) {
        const blob = await canvasToBlob(canvas, q)
        if (blob && blob.size <= targetBytes) {
          return new File([blob], jpgName(file.name), { type: "image/jpeg", lastModified: Date.now() })
        }
      }
      scale *= 0.75
    }
  } finally {
    if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) source.close()
  }

  throw new Error("تعذّر ضغط الصورة إلى الحجم المسموح.")
}
