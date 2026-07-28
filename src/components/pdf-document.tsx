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
    <article className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-sm shadow-ink/5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-4 py-5 sm:px-6">
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
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary"
          >
            Ouvrir <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      {previewUrls.length > 0 ? (
        <div className="grid gap-3 bg-[#f1ece6] p-2 sm:gap-5 sm:p-5">
          {previewUrls.map((preview, index) => (
            <img
              key={`${title}-${index}`}
              src={preview}
              alt={`${title}${previewUrls.length > 1 ? ` - page ${index + 1}` : ""}`}
              loading={priority && index === 0 ? "eager" : "lazy"}
              className="mx-auto h-auto w-full max-w-5xl rounded-xl bg-white object-contain shadow-md shadow-ink/10"
            />
          ))}
        </div>
      ) : href ? (
        <div className="bg-[#f1ece6] p-2 sm:p-5">
          <iframe
            src={`${href}#view=FitH`}
            title={title}
            className="h-[72vh] min-h-[560px] w-full rounded-xl border-0 bg-white"
          />
        </div>
      ) : (
        <div className="grid min-h-72 place-items-center bg-[#f1ece6] p-8 text-center">
          <div>
            <FileText className="mx-auto h-9 w-9 text-primary" />
            <p className="mt-3 font-medium">Le PDF officiel sera ajouté prochainement.</p>
          </div>
        </div>
      )}

      {href && (
        <div className="flex justify-center border-t border-border px-4 py-5">
          <a
            href={href}
            download={fileName}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Download className="h-4 w-4" /> Télécharger le PDF
          </a>
        </div>
      )}
    </article>
  );
}
