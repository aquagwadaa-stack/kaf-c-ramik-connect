import * as pdfjs from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { isSupabaseConfigured, uploadAdminFile } from "./supabase-rest";

function supportsModuleWorker() {
  if (typeof Worker === "undefined") return false;
  let supported = false;
  try {
    const url = URL.createObjectURL(new Blob([""], { type: "text/javascript" }));
    const options: WorkerOptions = {
      get type(): WorkerType {
        supported = true;
        return "module";
      },
    };
    const worker = new Worker(url, options);
    worker.terminate();
    URL.revokeObjectURL(url);
  } catch {
    return false;
  }
  return supported;
}

// Without module-worker support (older mobile browsers) pdf.js must run in the
// main thread; setting workerSrc there leaves getDocument() hanging forever.
if (supportsModuleWorker()) {
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;
}

const PREVIEW_TIMEOUT_MS = 45_000;

function withTimeout<T>(task: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("La génération de l'aperçu a pris trop de temps.")),
      ms,
    );
    task.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}


export interface StoredDocumentFile {
  attachmentUrl?: string;
  attachmentDataUrl?: string;
  attachmentName: string;
  attachmentType: string;
  previewImageUrls?: string[];
  previewImageDataUrls?: string[];
}

type StoreDocumentFileOptions = {
  generatePreviews?: boolean;
};

const MAX_DOCUMENT_SIZE = 15 * 1024 * 1024;
const SUPPORTED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function readFileAsDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function safeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function documentType(file: File) {
  if (file.type) return file.type;
  if (file.name.toLowerCase().endsWith(".pdf")) return "application/pdf";
  if (/\.jpe?g$/i.test(file.name)) return "image/jpeg";
  if (/\.png$/i.test(file.name)) return "image/png";
  if (/\.webp$/i.test(file.name)) return "image/webp";
  return "application/octet-stream";
}

function validateDocument(file: File, attachmentType: string) {
  if (!SUPPORTED_DOCUMENT_TYPES.has(attachmentType)) {
    throw new Error("Format non pris en charge. Utilisez un PDF, JPG, PNG ou WebP.");
  }
  if (file.size > MAX_DOCUMENT_SIZE) {
    throw new Error("Le fichier dépasse la limite de 15 Mo.");
  }
  if (file.size === 0) {
    throw new Error("Le fichier sélectionné est vide.");
  }
}

async function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Impossible de créer l'aperçu."))),
      "image/webp",
      0.86,
    );
  });
}

async function renderPdfPages(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  const previews: Blob[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const initialViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(2, 1500 / initialViewport.width);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Impossible de préparer l'aperçu du PDF.");
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    previews.push(await canvasToBlob(canvas));
  }

  return previews;
}

export async function storeDocumentFile(
  scope: string,
  file: File,
  options: StoreDocumentFileOptions = {},
): Promise<StoredDocumentFile> {
  const attachmentType = documentType(file);
  validateDocument(file, attachmentType);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const base = `${safeName(scope)}/${stamp}-${safeName(file.name)}`;

  if (isSupabaseConfigured()) {
    const attachmentUrl = await uploadAdminFile("kafe-documents", `${base}/original`, file);
    let previews: Blob[] = [];
    if (attachmentType === "application/pdf" && options.generatePreviews !== false) {
      try {
        previews = await withTimeout(renderPdfPages(file), PREVIEW_TIMEOUT_MS);
      } catch (error) {
        console.warn("PDF preview generation skipped:", error);
      }
    }
    const previewImageUrls = attachmentType.startsWith("image/")
      ? [attachmentUrl]
      : await Promise.all(
          previews.map((preview, index) =>
            uploadAdminFile(
              "kafe-documents",
              `${base}/preview-${String(index + 1).padStart(2, "0")}.webp`,
              preview,
            ),
          ),
        );
    return {
      attachmentUrl,
      attachmentDataUrl: undefined,
      attachmentName: file.name,
      attachmentType,
      previewImageUrls,
      previewImageDataUrls: [],
    };
  }

  let previews: Blob[] = [];
  if (attachmentType === "application/pdf" && options.generatePreviews !== false) {
    try {
      previews = await withTimeout(renderPdfPages(file), PREVIEW_TIMEOUT_MS);
    } catch (error) {
      console.warn("PDF preview generation skipped:", error);
    }
  }

  return {
    attachmentUrl: undefined,
    attachmentDataUrl: await readFileAsDataUrl(file),
    attachmentName: file.name,
    attachmentType,
    previewImageUrls: [],
    previewImageDataUrls: attachmentType.startsWith("image/")
      ? [await readFileAsDataUrl(file)]
      : await Promise.all(previews.map(readFileAsDataUrl)),
  };
}
