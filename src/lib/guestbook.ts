import { useEffect, useState } from "react";
import {
  callRpc,
  insertRow,
  isSupabaseConfigured,
  publicFileUrl,
  selectRows,
  uploadPublicFile,
} from "./supabase-rest";
import { useStoredList } from "./admin-data";

export type GuestbookStatus = "pending" | "published" | "hidden";
export type GuestbookSource = "site" | "google";

export interface GuestbookEntry {
  id: string;
  author: string;
  message: string;
  rating: number;
  status: GuestbookStatus;
  source: GuestbookSource;
  sourceUrl?: string;
  imageUrl?: string;
  createdAt: string;
}

type GuestbookRow = {
  id: string;
  value: GuestbookEntry;
  sort_order?: number;
  updated_at?: string;
};

export function useAdminGuestbookEntries() {
  return useStoredList<GuestbookEntry>("kafe-ceramik-guestbook", [], {
    table: "kafe_guestbook_entries",
    authLoad: true,
  });
}

export function usePublishedGuestbookEntries() {
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      try {
        const stored = JSON.parse(
          localStorage.getItem("kafe-ceramik-guestbook") || "[]",
        ) as GuestbookEntry[];
        setEntries(stored.filter((entry) => entry.status === "published"));
      } catch {
        setEntries([]);
      }
      setLoading(false);
      return;
    }
    selectRows<GuestbookRow>(
      "kafe_guestbook_entries",
      "?select=id,value,sort_order,updated_at&order=sort_order.asc.nullslast,updated_at.desc",
    )
      .then((rows) => setEntries(rows.map((row) => row.value)))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  return { entries, loading };
}

export async function submitGuestbookEntry(input: {
  author: string;
  message: string;
  rating: number;
  image?: File | null;
}) {
  const id = `guest-${crypto.randomUUID()}`;
  const imagePath = input.image ? `submissions/${id}/${safeImageName(input.image.name)}` : "";

  const createdAt = new Date().toISOString();
  const remoteMode = isSupabaseConfigured();

  let imageUrl: string | undefined;
  if (input.image && imagePath) {
    imageUrl = remoteMode
      ? publicFileUrl("kafe-guestbook", imagePath)
      : await fileToDataUrl(input.image);
  }

  let entry: GuestbookEntry = {
    id,
    author: input.author.trim(),
    message: input.message.trim(),
    rating: Math.max(1, Math.min(5, input.rating)),
    status: "pending",
    source: "site",
    imageUrl,
    createdAt,
  };

  if (!remoteMode) {
    let stored: GuestbookEntry[] = [];
    try {
      stored = JSON.parse(localStorage.getItem("kafe-ceramik-guestbook") || "[]");
    } catch {
      stored = [];
    }
    localStorage.setItem("kafe-ceramik-guestbook", JSON.stringify([entry, ...stored]));
    return { entry, imageUploaded: true };
  }

  // The storage policy only accepts a visitor image when a matching pending
  // guestbook entry already references its exact public path. Create the
  // pending entry first, then upload the file.
  await insertRow("kafe_guestbook_entries", {
    id,
    value: entry,
    sort_order: 9999,
    updated_at: createdAt,
  });

  let imageUploaded = true;
  if (input.image && imagePath && imageUrl) {
    try {
      await uploadPublicFile("kafe-guestbook", imagePath, input.image);
    } catch {
      imageUploaded = false;
      entry = { ...entry, imageUrl: undefined };
      await callRpc("clear_failed_kafe_guestbook_image", {
        p_id: id,
        p_image_url: imageUrl,
      }).catch((error) => {
        console.warn("Guestbook image cleanup skipped:", error);
      });
    }
  }

  return { entry, imageUploaded };
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error ?? new Error("IMAGE_READ_FAILED"));
    reader.readAsDataURL(file);
  });
}

function safeImageName(value: string) {
  const cleaned = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "souvenir.webp";
}
