import { useEffect, useState } from "react";
import {
  insertRow,
  isSupabaseConfigured,
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
  if (!isSupabaseConfigured()) throw new Error("GUESTBOOK_NOT_CONFIGURED");
  const id = `guest-${crypto.randomUUID()}`;
  const imagePath = input.image ? `submissions/${id}/${safeImageName(input.image.name)}` : "";

  // Upload first: the entry only ever stores an image URL that already exists,
  // so no privileged cleanup function is needed when an upload fails.
  let imageUrl: string | undefined;
  let imageUploaded = true;
  if (input.image && imagePath) {
    try {
      imageUrl = await uploadPublicFile("kafe-guestbook", imagePath, input.image);
    } catch {
      imageUrl = undefined;
      imageUploaded = false;
    }
  }

  const entry: GuestbookEntry = {
    id,
    author: input.author.trim(),
    message: input.message.trim(),
    rating: Math.max(1, Math.min(5, input.rating)),
    status: "pending",
    source: "site",
    imageUrl,
    createdAt: new Date().toISOString(),
  };
  await insertRow("kafe_guestbook_entries", {
    id,
    value: entry,
    sort_order: 9999,
    updated_at: entry.createdAt,
  });
  return { entry, imageUploaded };
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
