import { Download, ExternalLink, FileText } from "lucide-react";

type PdfDocumentProps = {
  title: string;
  description?: string;
  href?: string;
  fileName?: string;
  previewUrls?: string[];
  priority?: boolean;
};

export function PdfDocument({
  title,
  description,
  href,
  fileName,
  previewUrls = [],
  priority,
}: PdfDocumentProps) {
  return (
    <article className="kafe-block-link overflow-hidden bg-card">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-ink bg-[#f4b6cd] px-4 py-5 sm:px-6">
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
            className="kafe-block-link inline-flex items-center gap-2 bg-[#fffbd6] px-4 py-2 text-sm font-bold"
          >
            Ouvrir <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      {previewUrls.length > 0 ? (
        <div className="grid gap-3 bg-[#eea83a] p-2 sm:gap-5 sm:p-5">
          {previewUrls.map((preview, index) => (
            <img
              key={`${title}-${index}`}
              src={preview}
              alt={`${title}${previewUrls.length > 1 ? ` - page ${index + 1}` : ""}`}
              loading={priority && index === 0 ? "eager" : "lazy"}
              className="mx-auto h-auto w-full max-w-5xl rounded-lg border-2 border-ink bg-white object-contain shadow-[4px_4px_0_#2f1620]"
            />
          ))}
        </div>
      ) : href ? (
        <div className="bg-[#eea83a] p-2 sm:p-5">
          <iframe
            src={`${href}#view=FitH`}
            title={title}
            className="h-[72vh] min-h-[560px] w-full rounded-lg border-2 border-ink bg-white"
          />
        </div>
      ) : (
        <div className="grid min-h-72 place-items-center bg-[#eea83a] p-8 text-center">
          <div>
            <FileText className="mx-auto h-9 w-9 text-primary" />
            <p className="mt-3 font-medium">Le document sera ajouté ici.</p>
          </div>
        </div>
      )}

      {href && (
        <div className="flex justify-center border-t-2 border-ink bg-[#fffbd6] px-4 py-5">
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
