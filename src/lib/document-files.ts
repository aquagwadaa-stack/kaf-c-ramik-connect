import * as pdfjs from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { isSupabaseConfigured, uploadAdminFile } from "./supabase-rest";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

export interface StoredDocumentFile {
  attachmentUrl?: string;
  attachmentDataUrl?: string;
  attachmentName: string;
  attachmentType: string;
  previewImageUrls?: string[];
  previewImageDataUrls?: string[];
}

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

export async function storeDocumentFile(scope: string, file: File): Promise<StoredDocumentFile> {
  const attachmentType = file.type || "application/octet-stream";
  const previews = attachmentType === "application/pdf" ? await renderPdfPages(file) : [];
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const base = `${safeName(scope)}/${stamp}-${safeName(file.name)}`;

  if (isSupabaseConfigured()) {
    const attachmentUrl = await uploadAdminFile("kafe-documents", `${base}/original`, file);
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
      attachmentName: file.name,
      attachmentType,
      previewImageUrls,
    };
  }

  return {
    attachmentDataUrl: await readFileAsDataUrl(file),
    attachmentName: file.name,
    attachmentType,
    previewImageDataUrls: attachmentType.startsWith("image/")
      ? [await readFileAsDataUrl(file)]
      : await Promise.all(previews.map(readFileAsDataUrl)),
  };
}
