import { createFileRoute } from "@tanstack/react-router";

const DOCUMENT_BUCKET = "kafe-documents";
const MAX_DOCUMENT_SIZE = 15 * 1024 * 1024;
const ALLOWED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

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

function documentType(file: File) {
  if (file.type) return file.type;
  if (/\.pdf$/i.test(file.name)) return "application/pdf";
  if (/\.jpe?g$/i.test(file.name)) return "image/jpeg";
  if (/\.png$/i.test(file.name)) return "image/png";
  if (/\.webp$/i.test(file.name)) return "image/webp";
  return "application/octet-stream";
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

        let formData: FormData;
        try {
          formData = await request.formData();
        } catch {
          return errorResponse("Le fichier transmis est illisible.", 400);
        }

        const file = formData.get("file");
        const path = formData.get("path");

        if (!(file instanceof File) || typeof path !== "string") {
          return errorResponse("Fichier ou chemin de stockage manquant.", 400);
        }
        if (!isSafeStoragePath(path)) {
          return errorResponse("Chemin de stockage invalide.", 400);
        }
        if (file.size === 0 || file.size > MAX_DOCUMENT_SIZE) {
          return errorResponse("Le fichier doit peser entre 1 octet et 15 Mo.", 400);
        }
        const contentType = documentType(file);
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
        return Response.json({ publicUrl: publicData.publicUrl });
      },
    },
  },
});
