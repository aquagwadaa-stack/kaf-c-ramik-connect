import { createFileRoute } from "@tanstack/react-router";
import type { Json } from "@/integrations/supabase/types";

const DOCUMENT_BUCKET = "kafe-documents";
const MAX_DOCUMENT_SIZE = 15 * 1024 * 1024;
const ALLOWED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const CONTENT_DOCUMENT_IDS = new Set(["guide", "waiver", "menu"]);

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function isSafeStoragePath(path: string) {
  return (
    path.length > 0 &&
    path.length <= 500 &&
    !path.includes("..") &&
    /^[a-z0-9][a-z0-9._/-]*$/i.test(path)
  );
}

function decodeHeader(request: Request, name: string) {
  const value = request.headers.get(name);
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

function jsonObject(value: Json | undefined): { [key: string]: Json | undefined } {
  return value && typeof value === "object" && !Array.isArray(value) ? { ...value } : {};
}

export const Route = createFileRoute("/api/admin-document-upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authorization = request.headers.get("authorization");
        const accessToken = authorization?.startsWith("Bearer ")
          ? authorization.slice("Bearer ".length).trim()
          : "";

        if (!accessToken) {
          return errorResponse("Session administrateur requise.", 401);
        }

        const encodedPath = request.headers.get("x-kafe-document-path");
        let path = "";
        try {
          path = encodedPath ? decodeURIComponent(encodedPath) : "";
        } catch {
          return errorResponse("Chemin de stockage illisible.", 400);
        }
        if (!isSafeStoragePath(path)) {
          return errorResponse("Chemin de stockage invalide.", 400);
        }
        const contentLength = Number(request.headers.get("content-length") ?? 0);
        if (contentLength > MAX_DOCUMENT_SIZE) {
          return errorResponse("Le fichier doit peser entre 1 octet et 15 Mo.", 400);
        }
        const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim() ?? "";
        if (!ALLOWED_DOCUMENT_TYPES.has(contentType)) {
          return errorResponse(
            "Format non pris en charge. Utilisez un PDF, JPG, PNG ou WebP.",
            400,
          );
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken);

        if (authError || !authData.user) {
          return errorResponse("Votre session a expiré. Reconnectez-vous puis réessayez.", 401);
        }

        const { data: profile, error: profileError } = await supabaseAdmin
          .from("kafe_admin_profiles")
          .select("role")
          .eq("user_id", authData.user.id)
          .maybeSingle();

        if (profileError || !profile) {
          return errorResponse("Ce compte n'est pas autorisé à importer des documents.", 403);
        }

        const contentDocumentId = request.headers.get("x-kafe-content-document-id") ?? "";
        const contentResourceId = decodeHeader(request, "x-kafe-content-resource-id");
        const originalFileName = decodeHeader(request, "x-kafe-original-file-name") || "document";
        let contentDocument: { value: Json } | null = null;

        if (contentDocumentId) {
          if (!CONTENT_DOCUMENT_IDS.has(contentDocumentId)) {
            return errorResponse("Document de contenu invalide.", 400);
          }
          const { data, error } = await supabaseAdmin
            .from("kafe_content_documents")
            .select("value")
            .eq("id", contentDocumentId)
            .maybeSingle();
          if (error || !data) {
            return errorResponse("Le document à remplacer est introuvable.", 404);
          }
          if (contentResourceId) {
            const value = jsonObject(data.value);
            const resources = Array.isArray(value.resources) ? value.resources : [];
            const resourceExists = resources.some(
              (resource) => jsonObject(resource).id === contentResourceId,
            );
            if (!resourceExists) {
              return errorResponse("La ressource à remplacer est introuvable.", 404);
            }
          }
          contentDocument = data;
        }

        let bytes: ArrayBuffer;
        try {
          bytes = await request.arrayBuffer();
        } catch {
          return errorResponse("Le fichier transmis est illisible.", 400);
        }
        if (bytes.byteLength === 0 || bytes.byteLength > MAX_DOCUMENT_SIZE) {
          return errorResponse("Le fichier doit peser entre 1 octet et 15 Mo.", 400);
        }
        const file = new Blob([bytes], { type: contentType });

        const { error: uploadError } = await supabaseAdmin.storage
          .from(DOCUMENT_BUCKET)
          .upload(path, file, {
            contentType,
            upsert: true,
          });

        if (uploadError) {
          console.error("[admin-document-upload] Supabase upload failed", uploadError);
          return errorResponse(`Import Supabase impossible : ${uploadError.message}`, 502);
        }

        const { data: publicData } = supabaseAdmin.storage.from(DOCUMENT_BUCKET).getPublicUrl(path);

        if (contentDocumentId && contentDocument) {
          const now = new Date().toISOString();
          const nextValue = jsonObject(contentDocument.value);
          const attachmentPatch: { [key: string]: Json | undefined } = {
            attachmentUrl: publicData.publicUrl,
            attachmentName: originalFileName,
            attachmentType: contentType,
            previewImageUrls: contentType.startsWith("image/") ? [publicData.publicUrl] : [],
            previewImageDataUrls: [],
          };

          if (contentResourceId) {
            const resources = Array.isArray(nextValue.resources) ? nextValue.resources : [];
            nextValue.resources = resources.map((resource) => {
              const current = jsonObject(resource);
              if (current.id !== contentResourceId) return resource;
              const next = { ...current, ...attachmentPatch };
              delete next.attachmentDataUrl;
              return next;
            });
          } else {
            Object.assign(nextValue, attachmentPatch);
            delete nextValue.attachmentDataUrl;
          }
          nextValue.updatedAt = now;

          const { error: updateError } = await supabaseAdmin
            .from("kafe_content_documents")
            .update({ value: nextValue, updated_at: now })
            .eq("id", contentDocumentId);

          if (updateError) {
            await supabaseAdmin.storage.from(DOCUMENT_BUCKET).remove([path]);
            console.error("[admin-document-upload] Content publication failed", updateError);
            return errorResponse("Le fichier a été reçu mais sa publication a échoué.", 502);
          }
        }

        return Response.json({ publicUrl: publicData.publicUrl });
      },
    },
  },
});
