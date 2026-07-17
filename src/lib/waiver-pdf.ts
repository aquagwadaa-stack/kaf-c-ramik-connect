import { jsPDF } from "jspdf";
import type { WaiverSignature } from "./admin-data";

async function imageToPngDataUrl(source: string) {
  const image = new Image();
  image.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Le document officiel est inaccessible."));
    image.src = source;
  });
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Le document officiel est inaccessible.");
  context.drawImage(image, 0, 0);
  return canvas.toDataURL("image/png");
}

function safeFilename(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function downloadSignedWaiver(signature: WaiverSignature, fallbackBody: string) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const preview = signature.documentPreviewUrl;

  if (preview) {
    const image = await imageToPngDataUrl(preview);
    pdf.addImage(image, "PNG", 0, 0, 210, 297);
    pdf.setTextColor(45, 36, 33);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text(signature.lastName.toUpperCase(), 35, 241, { align: "center", maxWidth: 38 });
    pdf.text(signature.firstName, 82, 241, { align: "center", maxWidth: 38 });
    pdf.text(new Date(signature.signedAt).toLocaleDateString("fr-FR"), 126, 241, {
      align: "center",
      maxWidth: 33,
    });
    if (signature.signatureDataUrl) {
      pdf.addImage(signature.signatureDataUrl, "PNG", 151, 226, 38, 20);
    }
    if (signature.isMinor) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6.5);
      pdf.text(
        `Responsable légal : ${signature.guardianFirstName ?? ""} ${signature.guardianLastName ?? ""}`,
        151,
        253,
        { maxWidth: 39 },
      );
    }
  } else {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.text(signature.documentTitle ?? "Décharge de responsabilité", 20, 28);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.text(pdf.splitTextToSize(signature.acceptanceText ?? fallbackBody, 170), 20, 45);
    pdf.text(`Nom : ${signature.lastName}`, 20, 115);
    pdf.text(`Prénom : ${signature.firstName}`, 20, 126);
    pdf.text(`Date : ${new Date(signature.signedAt).toLocaleDateString("fr-FR")}`, 20, 137);
    if (signature.signatureDataUrl)
      pdf.addImage(signature.signatureDataUrl, "PNG", 20, 150, 95, 36);
  }

  pdf.setProperties({
    title: `Décharge signée - ${signature.firstName} ${signature.lastName}`,
    subject: `Version ${signature.documentVersion}`,
    author: "Kafé Céramik",
    keywords: signature.reservationRef ?? "sans réservation",
  });
  pdf.save(
    `decharge-${safeFilename(signature.lastName)}-${safeFilename(signature.firstName)}-${signature.signedAt.slice(0, 10)}.pdf`,
  );
}
