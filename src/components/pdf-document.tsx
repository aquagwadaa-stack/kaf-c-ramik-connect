import { useEffect, useState } from "react";
import { Download, ExternalLink, FileText, LoaderCircle } from "lucide-react";

type PdfDocumentProps = {
  title: string;
  description?: string;
  href?: string;
  fileName?: string;
  previewUrls?: string[];
  priority?: boolean;
  plain?: boolean;
};

export function PdfDocument({
  title,
  description,
  href,
  fileName,
  previewUrls = [],
  priority,
  plain = false,
}: PdfDocumentProps) {
  const isPdf = Boolean(
    href && (fileName?.toLowerCase().endsWith(".pdf") || href.toLowerCase().includes(".pdf")),
  );

  return (
    <article className={plain ? "overflow-hidden" : "kafe-block-link overflow-hidden bg-card"}>
      {!plain && (
        <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-ink bg-[#f7e1e6] px-4 py-5 sm:px-6">
          <div className="max-w-2xl">
            <h3 className="font-display text-2xl leading-tight">{title}</h3>
            {description && (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
            )}
          </div>
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="kafe-block-link inline-flex items-center gap-2 bg-[#fffaf0] px-4 py-2 text-sm font-bold"
            >
              Ouvrir <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      )}

      {previewUrls.length > 0 ? (
        <div className={plain ? "grid gap-4" : "grid gap-3 bg-[#ffd6a5] p-2 sm:gap-5 sm:p-5"}>
          {previewUrls.map((preview, index) => (
            <img
              key={`${title}-${index}`}
              src={preview}
              alt={`${title}${previewUrls.length > 1 ? ` - page ${index + 1}` : ""}`}
              loading={priority && index === 0 ? "eager" : "lazy"}
              className={
                plain
                  ? "mx-auto block h-auto w-full max-w-5xl object-contain"
                  : "mx-auto h-auto w-full max-w-5xl rounded-lg border-2 border-ink bg-white object-contain shadow-[4px_4px_0_#2f1620]"
              }
            />
          ))}
        </div>
      ) : href && isPdf ? (
        <RenderedPdf href={href} title={title} plain={plain} priority={priority} />
      ) : href ? (
        <div className={plain ? "" : "bg-[#ffd6a5] p-2 sm:p-5"}>
          <img
            src={href}
            alt={title}
            className="mx-auto block h-auto w-full max-w-5xl object-contain"
          />
        </div>
      ) : (
        <div className="grid min-h-72 place-items-center bg-[#ffd6a5] p-8 text-center">
          <div>
            <FileText className="mx-auto h-9 w-9 text-primary" />
            <p className="mt-3 font-medium">Le document sera ajouté ici.</p>
          </div>
        </div>
      )}

      {href && (
        <div
          className={
            plain
              ? "flex justify-center px-4 pt-6"
              : "flex justify-center border-t-2 border-ink bg-[#fffaf0] px-4 py-5"
          }
        >
          <a
            href={href}
            download={fileName}
            className="kafe-block-link inline-flex items-center gap-2 bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
          >
            <Download className="h-4 w-4" /> Télécharger le PDF
          </a>
        </div>
      )}
    </article>
  );
}

function RenderedPdf({
  href,
  title,
  plain,
  priority,
}: {
  href: string;
  title: string;
  plain: boolean;
  priority?: boolean;
}) {
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];

    async function render() {
      setLoading(true);
      setError("");
      setPages([]);

      try {
        const [pdfjs, workerModule] = await Promise.all([
          import("pdfjs-dist"),
          import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
        ]);
        pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
        const pdf = await pdfjs.getDocument({ url: href }).promise;
        const renderedPages: string[] = [];
        const targetWidth = Math.min(
          1800,
          Math.max(1100, window.innerWidth * Math.min(window.devicePixelRatio || 1, 2)),
        );

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const baseViewport = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: targetWidth / baseViewport.width });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          const context = canvas.getContext("2d", { alpha: false });
          if (!context) throw new Error("Canvas indisponible");
          await page.render({ canvas, canvasContext: context, viewport }).promise;
          const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
              (value) => (value ? resolve(value) : reject(new Error("Aperçu indisponible"))),
              "image/webp",
              0.92,
            );
          });
          const objectUrl = URL.createObjectURL(blob);
          objectUrls.push(objectUrl);
          renderedPages.push(objectUrl);
        }

        if (!cancelled) setPages(renderedPages);
      } catch (renderError) {
        console.error("PDF display failed", renderError);
        if (!cancelled) setError("Le document n'a pas pu être affiché directement.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void render();
    return () => {
      cancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [href]);

  if (loading) {
    return (
      <div
        className={`grid min-h-72 place-items-center ${plain ? "bg-[#fffaf0]" : "bg-[#ffd6a5]"}`}
      >
        <div className="flex items-center gap-3 text-sm font-medium">
          <LoaderCircle className="h-5 w-5 animate-spin" /> Chargement du document…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid min-h-52 place-items-center bg-[#fffaf0] p-6 text-center text-sm">
        {error} Utilise le bouton de téléchargement ci-dessous.
      </div>
    );
  }

  return (
    <div className={plain ? "grid gap-4" : "grid gap-3 bg-[#ffd6a5] p-2 sm:gap-5 sm:p-5"}>
      {pages.map((page, index) => (
        <img
          key={page}
          src={page}
          alt={`${title} - page ${index + 1}`}
          loading={priority && index === 0 ? "eager" : "lazy"}
          className={
            plain
              ? "mx-auto block h-auto w-full max-w-5xl object-contain"
              : "mx-auto block h-auto w-full max-w-5xl rounded-lg bg-white object-contain"
          }
        />
      ))}
    </div>
  );
}
