import { useEffect, useRef, useState } from "react";
import { deleteRow, isSupabaseConfigured, selectRows, upsertRows } from "./supabase-rest";

type Listener = () => void;

const listeners = new Map<string, Set<Listener>>();

function notify(key: string) {
  listeners.get(key)?.forEach((listener) => listener());
}

function subscribe(key: string, listener: Listener) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)?.add(listener);
  return () => listeners.get(key)?.delete(listener);
}

function readStore<T>(key: string, seed: T): T {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
    return { ...seed, ...(JSON.parse(raw) as T) };
  } catch {
    return seed;
  }
}

function readList<T>(key: string, seed: T[]): T[] {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as T[];
  } catch {
    return seed;
  }
}

function writeStore<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  notify(key);
}

type RemoteJsonRow<T> = {
  id: string;
  value: T;
  sort_order?: number;
  updated_at?: string;
  reservation_ref?: string | null;
  document_version?: string;
  signed_at?: string;
};

type RemoteListOptions<T> = {
  table: string;
  authLoad?: boolean;
  hasSortOrder?: boolean;
  toRow?: (item: T, index: number) => RemoteJsonRow<T>;
};

async function loadRemoteList<T>(table: string, authLoad = false, hasSortOrder = true) {
  const query = hasSortOrder
    ? "?select=id,value,sort_order,updated_at&order=sort_order.asc.nullslast,updated_at.desc"
    : "?select=id,value,updated_at&order=updated_at.desc";
  const rows = await selectRows<RemoteJsonRow<T>>(table, query, authLoad);
  return rows.map((row) => row.value);
}

async function saveRemoteList<T extends { id: string }>(
  table: string,
  list: T[],
  toRow: (item: T, index: number) => RemoteJsonRow<T>,
) {
  await upsertRows(table, list.map(toRow), true);
}

export function useStoredList<T extends { id: string }>(
  key: string,
  seed: T[],
  remote?: RemoteListOptions<T>,
) {
  // Keep the first client render identical to SSR, then hydrate persisted/remote data in the effect.
  const [list, setList] = useState<T[]>(() => seed);
  const remoteTable = remote?.table;
  const remoteAuthLoad = remote?.authLoad;
  const remoteHasSortOrder = remote?.hasSortOrder;
  const remoteSaveQueue = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    let alive = true;
    const update = () => setList(readList(key, seed));
    update();
    const unsubscribe = subscribe(key, update);

    if (remoteTable && isSupabaseConfigured()) {
      loadRemoteList<T>(remoteTable, remoteAuthLoad, remoteHasSortOrder !== false)
        .then((remoteList) => {
          if (!alive || (remoteList.length === 0 && !remoteAuthLoad)) return;
          writeStore(key, remoteList);
          setList(remoteList);
        })
        .catch((error) => {
          console.warn(`Remote load skipped for ${remoteTable}:`, error);
        });
    }

    return () => {
      alive = false;
      unsubscribe();
    };
  }, [key, remoteAuthLoad, remoteHasSortOrder, remoteTable, seed]);

  const save = (next: T[]) => {
    const nextIds = new Set(next.map((item) => item.id));
    const removedIds = list.filter((item) => !nextIds.has(item.id)).map((item) => item.id);
    writeStore(key, next);
    if (remote && isSupabaseConfigured()) {
      const toRow =
        remote.toRow ??
        ((item: T, index: number) => ({
          id: item.id,
          value: item,
          sort_order: index,
          updated_at: new Date().toISOString(),
        }));
      remoteSaveQueue.current = remoteSaveQueue.current
        .catch(() => undefined)
        .then(async () => {
          await Promise.all(removedIds.map((id) => deleteRow(remote.table, id, true)));
          await saveRemoteList(remote.table, next, toRow);
        })
        .catch((error) => {
          console.warn(`Remote save skipped for ${remote.table}:`, error);
        });
    }
  };
  return [list, save] as const;
}

export interface CeramicObject {
  id: string;
  name: string;
  category: "Tasses" | "Bols" | "Assiettes" | "Figurines" | "Deco" | "Vases" | "Petites pieces";
  price: number;
  availability: "available" | "limited" | "unavailable";
  imageDataUrl?: string;
  imageName?: string;
  note?: string;
}

export const ceramicObjectsSeed: CeramicObject[] = [
  {
    id: "obj-tasse-design",
    name: "Tasse design",
    category: "Tasses",
    price: 36,
    availability: "available",
  },
  {
    id: "obj-tasse-chat",
    name: "Tasse chat",
    category: "Tasses",
    price: 38,
    availability: "limited",
  },
  {
    id: "obj-bol-matcha",
    name: "Bol matcha",
    category: "Bols",
    price: 38,
    availability: "available",
  },
  {
    id: "obj-assiette-plate",
    name: "Assiette plate",
    category: "Assiettes",
    price: 44,
    availability: "available",
  },
  { id: "obj-dragon", name: "Dragon", category: "Figurines", price: 32, availability: "limited" },
  {
    id: "obj-licorne",
    name: "Licorne / dauphin",
    category: "Figurines",
    price: 28,
    availability: "available",
  },
  {
    id: "obj-monstre",
    name: "Monstre XXL",
    category: "Figurines",
    price: 48,
    availability: "available",
  },
  {
    id: "obj-vase-boule",
    name: "Vase boule",
    category: "Vases",
    price: 42,
    availability: "available",
  },
  {
    id: "obj-porte-savon",
    name: "Porte-savon",
    category: "Petites pieces",
    price: 24,
    availability: "available",
  },
  {
    id: "obj-cloche",
    name: "Cloche guirlande",
    category: "Deco",
    price: 16,
    availability: "limited",
  },
];

export interface GuideSection {
  id: string;
  number: string;
  title: string;
  body: string;
  imageUrl?: string;
  imageDataUrl?: string;
  imageName?: string;
  visible?: boolean;
}

export type ContentResourceCategory = "guide" | "nuancier" | "prevention" | "waiver" | "menu";

export interface ContentResource {
  id: string;
  title: string;
  description: string;
  category: ContentResourceCategory;
  attachmentUrl?: string;
  attachmentDataUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
  previewImageUrls?: string[];
  previewImageDataUrls?: string[];
  visible: boolean;
}

export interface ContentDocument {
  id: "guide" | "waiver" | "menu";
  title: string;
  version: string;
  updatedAt: string;
  body: string;
  intro?: string;
  sections?: GuideSection[];
  resources?: ContentResource[];
  attachmentUrl?: string;
  attachmentDataUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
  previewImageUrls?: string[];
  previewImageDataUrls?: string[];
}

export const guideSectionsSeed: GuideSection[] = [
  {
    id: "guide-choose",
    number: "01",
    title: "Choisissez votre pièce et vos couleurs",
    body: "Le prix comprend la céramique, le matériel de peinture et la cuisson. Fiez-vous aux nuanciers : la couleur avant cuisson est différente du résultat final.",
    imageUrl: "/objets/tasse-design.webp",
    visible: true,
  },
  {
    id: "guide-paint",
    number: "02",
    title: "Peignez en deux couches",
    body: "Servez-vous en petites quantités, laissez sécher 5 à 10 minutes entre les couches et gardez les zones en contact avec la bouche sans peinture.",
    imageUrl: "/creations/tasse-feuillage.webp",
    visible: true,
  },
  {
    id: "guide-identify",
    number: "03",
    title: "Identifiez votre création",
    body: "Inscrivez vos initiales sous la pièce avec de la peinture, puis prenez une photo. Sans photo et sans initiales, l'équipe ne pourra pas garantir sa récupération.",
    imageUrl: "/creations/assiette-tortue.webp",
    visible: true,
  },
  {
    id: "guide-varnish",
    number: "04",
    title: "Vernissez selon la peinture choisie",
    body: "Appliquez deux couches de vernis après séchage, sauf avec les peintures à effets indiquées dans le second nuancier. Lavez et rangez le matériel utilisé.",
    imageUrl: "/objets/assiettes-empilees.webp",
    visible: true,
  },
  {
    id: "guide-firing",
    number: "05",
    title: "Laissez l'équipe cuire votre pièce",
    body: "La création reste au Kafé pour la finition et la cuisson. Le délai habituel annoncé par l'équipe est de 7 à 10 jours.",
    imageUrl: "/creations/assiette-bateau.webp",
    visible: true,
  },
  {
    id: "guide-collect",
    number: "06",
    title: "Revenez la récupérer",
    body: "Conservez votre photo et revenez chercher la création au Kafé. Les pièces sont gardées au maximum deux mois avant d'être données.",
    imageUrl: "/objets/tasses-texturees.webp",
    visible: true,
  },
];

export const guideResourcesSeed: ContentResource[] = [
  {
    id: "guide-complet",
    title: "Guide complet de l'atelier",
    description: "Toutes les étapes, les délais et les règles à respecter avant de commencer.",
    category: "guide",
    attachmentUrl: "/documents/guide-complet.pdf",
    attachmentName: "Guide complet pdf final.pdf",
    attachmentType: "application/pdf",
    previewImageUrls: ["/documents/guide-complet.webp"],
    visible: true,
  },
  {
    id: "nuancier-1",
    title: "Nuancier - peintures classiques",
    description: "Deux couches de peinture, puis deux couches de vernis après séchage.",
    category: "nuancier",
    attachmentUrl: "/documents/nuancier-1.pdf",
    attachmentName: "Nuancier 1 pdf.pdf",
    attachmentType: "application/pdf",
    previewImageUrls: ["/documents/nuancier-1.webp"],
    visible: true,
  },
  {
    id: "nuancier-2",
    title: "Nuancier - peintures à effets",
    description:
      "Les peintures à effets ne se vernissent pas. Suivez les consignes propres à ces couleurs.",
    category: "nuancier",
    attachmentUrl: "/documents/nuancier-2.pdf",
    attachmentName: "Nuancier 2 pdf.pdf",
    attachmentType: "application/pdf",
    previewImageUrls: ["/documents/nuancier-2.webp"],
    visible: true,
  },
  {
    id: "gaspillage-peinture",
    title: "Bien doser la peinture",
    description:
      "Servez-vous en petites quantités et rechargez la palette seulement si nécessaire.",
    category: "prevention",
    attachmentUrl: "/documents/gaspillage-peinture.pdf",
    attachmentName: "Gaspillage peinture pdf.pdf",
    attachmentType: "application/pdf",
    previewImageUrls: ["/documents/gaspillage-peinture.webp"],
    visible: true,
  },
  {
    id: "casse-ceramique",
    title: "Prévention casse céramique",
    description: "Une céramique brute cassée peut être facturée à hauteur de 50 % de son prix.",
    category: "prevention",
    attachmentUrl: "/documents/casse-ceramique.pdf",
    attachmentName: "Casse céramique pdf.pdf",
    attachmentType: "application/pdf",
    previewImageUrls: ["/documents/casse-ceramique.webp"],
    visible: true,
  },
];

export const waiverResourcesSeed: ContentResource[] = [];

export const contentDocumentsSeed: ContentDocument[] = [
  {
    id: "guide",
    title: "Le guide de ton atelier",
    version: "2026-07",
    updatedAt: new Date().toISOString(),
    intro:
      "Prends le temps de consulter chaque support avant de commencer. Toutes les étapes du guide et du nuancier choisi sont importantes pour la cuisson, l'identification et la récupération de ta création.",
    body: "Les documents sont également disponibles sur place. L'équipe reste disponible si une consigne n'est pas claire avant de commencer.",
    sections: guideSectionsSeed,
    resources: guideResourcesSeed,
  },
  {
    id: "menu",
    title: "Carte du Kafé",
    version: "À publier",
    updatedAt: new Date().toISOString(),
    body: "Découvre les boissons, brunchs et gourmandises proposés au Kafé.",
    resources: [
      {
        id: "menu",
        title: "Carte du Kafé",
        description: "Boissons, brunchs et gourmandises du Kafé.",
        category: "menu",
        visible: true,
      },
    ],
  },
  {
    id: "waiver",
    title: "Décharge de responsabilité",
    version: "2026-07",
    updatedAt: new Date().toISOString(),
    body: "Je reconnais avoir pris connaissance du guide complet de l'atelier. En cas de non-respect de celui-ci, l'établissement ne pourra pas être tenu responsable et aucun remboursement ne pourra être exigé.",
    attachmentUrl: "/documents/decharge-officielle.pdf",
    attachmentName: "Décharge PDF.pdf",
    attachmentType: "application/pdf",
    previewImageUrls: ["/documents/decharge-officielle.webp"],
    resources: waiverResourcesSeed,
  },
];

export function getGuideDocument(documents: ContentDocument[]) {
  const guide = documents.find((document) => document.id === "guide") ?? contentDocumentsSeed[0];
  const storedResources = guide.resources ?? [];
  const resources = [
    ...guideResourcesSeed.map((seedResource) => ({
      ...seedResource,
      ...(storedResources.find((resource) => resource.id === seedResource.id) ?? {}),
      category: seedResource.category,
    })),
    ...storedResources.filter(
      (resource) => !guideResourcesSeed.some((seedResource) => seedResource.id === resource.id),
    ),
  ];
  return {
    ...guide,
    intro: guide.intro ?? contentDocumentsSeed[0].intro,
    sections: guide.sections?.length ? guide.sections : guideSectionsSeed,
    resources,
  };
}

export function getWaiverDocument(documents: ContentDocument[]) {
  const seed = contentDocumentsSeed.find((document) => document.id === "waiver")!;
  const waiver = documents.find((document) => document.id === "waiver") ?? seed;
  return {
    ...seed,
    ...waiver,
    resources: waiverResourcesSeed,
  };
}

export function getMenuDocument(documents: ContentDocument[]) {
  const seed = contentDocumentsSeed.find((document) => document.id === "menu")!;
  const menu = documents.find((document) => document.id === "menu") ?? seed;
  const seedResources = seed.resources ?? [];
  const storedResources = menu.resources ?? [];
  return {
    ...seed,
    ...menu,
    resources: [
      ...seedResources.map((seedResource) => ({
        ...seedResource,
        ...(storedResources.find((resource) => resource.id === seedResource.id) ?? {}),
        category: "menu" as const,
      })),
      ...storedResources.filter(
        (resource) => !seedResources.some((seedResource) => seedResource.id === resource.id),
      ),
    ],
  };
}

export interface CreationInspiration {
  id: string;
  title: string;
  body: string;
  imageSrc?: string;
  imageDataUrl?: string;
  imageName?: string;
  visible: boolean;
}

export const creationInspirationsSeed: CreationInspiration[] = [
  {
    id: "creation-tortue",
    title: "Assiette tortue tropicale",
    body: "Motifs fins, fleurs, feuillages et esprit Guadeloupe.",
    imageSrc: "/creations/assiette-tortue.webp",
    visible: true,
  },
  {
    id: "creation-vache",
    title: "Bol vache",
    body: "Une idée drôle et simple, parfaite pour un atelier sans pression.",
    imageSrc: "/creations/bol-vache.webp",
    visible: true,
  },
  {
    id: "creation-feuillage",
    title: "Tasse feuillage bleu",
    body: "Un rendu végétal plus délicat, avec un motif qui fait vite son effet.",
    imageSrc: "/creations/tasse-feuillage.webp",
    visible: true,
  },
  {
    id: "creation-bateau",
    title: "Assiette bateau",
    body: "Une pièce plus travaillée pour celles et ceux qui veulent prendre leur temps.",
    imageSrc: "/creations/assiette-bateau.webp",
    visible: true,
  },
];

export interface WaiverSignature {
  id: string;
  firstName: string;
  lastName: string;
  reservationRef?: string;
  documentVersion: string;
  signedAt: string;
  signatureDataUrl?: string;
  guideAccepted: boolean;
  waiverAccepted?: boolean;
  isMinor?: boolean;
  guardianFirstName?: string;
  guardianLastName?: string;
  documentTitle?: string;
  documentUrl?: string;
  documentPreviewUrl?: string;
  acceptanceText?: string;
  validatedBy?: string;
}

export const waiverSignaturesSeed: WaiverSignature[] = [];

export interface ScheduleRule {
  id: string;
  label: string;
  weekdays: number[];
  startTime: string;
  endTime: string;
  validFrom: string;
  validUntil: string;
}

export interface SeatingArea {
  id: string;
  label: string;
  capacity: number;
  quantity: number;
  zone?: SeatingZone;
}

export type SeatingZone = "interieur" | "exterieur" | "carbet";

export interface ReservationFieldRequirements {
  emailRequired: boolean;
  childrenAgesRequired: boolean;
  messageRequired: boolean;
}

export type GiftCardVisual = "rose" | "tropical" | "confetti";

export interface GiftCardOption {
  id: string;
  title: string;
  amount: number;
  description: string;
  visible: boolean;
  visual: GiftCardVisual;
}

export type PageImageKey =
  | "home-hero"
  | "home-artist"
  | "home-food"
  | "home-desserts"
  | "home-detail"
  | "story-intro"
  | "story-process"
  | "story-team"
  | "story-artist"
  | "story-brunch"
  | "menu-food-1"
  | "menu-food-2"
  | "menu-food-3"
  | "menu-food-4"
  | "menu-food-5"
  | "menu-food-6"
  | "gift-hero";

export interface PageImageSetting {
  id: PageImageKey;
  page: "Accueil" | "Le Kafé" | "Carte" | "Carte cadeau";
  label: string;
  imageUrl: string;
  alt: string;
  imageName?: string;
  imageHash?: string;
}

export interface KafeSettings {
  configurationVersion: number;
  reservationsEnabled: boolean;
  reservationPauseMessage: string;
  depositThreshold: number;
  depositFixedAmount: number;
  defaultCapacity: number;
  slotDurationMinutes: number;
  slotIntervalMinutes: number;
  slots: string[];
  scheduleRules: ScheduleRule[];
  seatingAreas: SeatingArea[];
  closedWeekdays: number[];
  kitchenClosingTime: string;
  lateArrivalGraceMinutes: number;
  cancellationNoticeHours: number;
  groupDepositForfeitHours: number;
  minimumBookingLeadDays: number;
  bookingCutoffTime: string;
  reservationFieldRequirements: ReservationFieldRequirements;
  manualConfirmationThreshold: number;
  groupOutsideFoodNotice: string;
  signatureRequiredOnArrival: boolean;
  walkInCafeEnabled: boolean;
  walkInNoticeText: string;
  reservationConditionsText: string;
  guideAcceptanceText: string;
  confirmationEmailText: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  contactMapUrl: string;
  adminNotificationEmail: string;
  pinterestUrl: string;
  guestbookEnabled: boolean;
  googleReviewUrl: string;
  giftCardContactEmail: string;
  giftCardPaymentsEnabled: boolean;
  giftCardValidityMonths: number;
  giftCardCustomEnabled: boolean;
  giftCardCustomMin: number;
  giftCardOptions: GiftCardOption[];
  maximumVisitHours: number;
  sharedTableNotice: string;
  takeawayNotice: string;
  consumptionMandatoryNotice: string;
  groupCeramicRateMin: number;
  groupCeramicRateMax: number;
  groupMealRateMin: number;
  groupMealRateMax: number;
  sumupPaymentsEnabled: boolean;
  creationInspirations: CreationInspiration[];
  pageImages: PageImageSetting[];
}

export const pageImagesSeed: PageImageSetting[] = [
  {
    id: "home-hero",
    page: "Accueil",
    label: "Grande photo d'ouverture",
    imageUrl: "/photos/manika/atelier-table.jpg",
    alt: "Peinture sur céramique au Kafé Céramik",
  },
  {
    id: "home-artist",
    page: "Accueil",
    label: "Mosaïque - artiste",
    imageUrl: "/photos/manika/artiste-peinture.jpg",
    alt: "Une participante peint sa céramique",
  },
  {
    id: "home-food",
    page: "Accueil",
    label: "Mosaïque - assiette",
    imageUrl: "/photos/manika/brunch-bowl.jpg",
    alt: "Une assiette gourmande servie au Kafé",
  },
  {
    id: "home-desserts",
    page: "Accueil",
    label: "Mosaïque - comptoir",
    imageUrl: "/photos/manika/comptoir-desserts.jpg",
    alt: "Le comptoir et les pâtisseries maison",
  },
  {
    id: "home-detail",
    page: "Accueil",
    label: "Photo du bloc déroulement",
    imageUrl: "/photos/manika/detail-peinture.jpg",
    alt: "Une pièce en train d'être peinte",
  },
  {
    id: "story-intro",
    page: "Le Kafé",
    label: "Présentation du lieu",
    imageUrl: "/photos/manika/interieur-comptoir.jpg",
    alt: "L'intérieur du Kafé Céramik à Saint-François",
  },
  {
    id: "story-process",
    page: "Le Kafé",
    label: "Déroulement de l'atelier",
    imageUrl: "/photos/manika/pages/atelier-partage.jpg",
    alt: "Un atelier de peinture partagé autour d'une table",
  },
  {
    id: "story-team",
    page: "Le Kafé",
    label: "Galerie - moment en groupe",
    imageUrl: "/photos/manika/pages/table-groupe.jpg",
    alt: "Un moment convivial en groupe au Kafé",
  },
  {
    id: "story-artist",
    page: "Le Kafé",
    label: "Galerie - jeune artiste",
    imageUrl: "/photos/manika/pages/enfant-atelier.jpg",
    alt: "Une jeune artiste peint sa céramique",
  },
  {
    id: "story-brunch",
    page: "Le Kafé",
    label: "Galerie - table gourmande",
    imageUrl: "/photos/manika/pages/brunch-partage.jpg",
    alt: "Une table gourmande partagée au Kafé",
  },
  {
    id: "menu-food-1",
    page: "Carte",
    label: "Galerie gourmande 1",
    imageUrl: "/photos/manika/pages/patisseries-chocolat.jpg",
    alt: "Pâtisseries au chocolat préparées au Kafé",
  },
  {
    id: "menu-food-2",
    page: "Carte",
    label: "Galerie gourmande 2",
    imageUrl: "/photos/manika/pages/plat-gourmand.jpg",
    alt: "Un plat gourmand servi au Kafé",
  },
  {
    id: "menu-food-3",
    page: "Carte",
    label: "Galerie gourmande 3",
    imageUrl: "/photos/manika/pages/paniers-fruits.jpg",
    alt: "Des fruits frais utilisés dans la cuisine du Kafé",
  },
  {
    id: "menu-food-4",
    page: "Carte",
    label: "Galerie gourmande 4",
    imageUrl: "/photos/manika/pages/serveuse-cafe.jpg",
    alt: "Le service chaleureux du Kafé Céramik",
  },
  {
    id: "menu-food-5",
    page: "Carte",
    label: "Galerie gourmande 5",
    imageUrl: "/photos/manika/pages/table-boissons.jpg",
    alt: "Boissons fraîches et gourmandises sur une table du Kafé",
  },
  {
    id: "menu-food-6",
    page: "Carte",
    label: "Galerie gourmande 6",
    imageUrl: "/photos/manika/gateau.jpg",
    alt: "Gâteau maison servi au Kafé Céramik",
  },
  {
    id: "gift-hero",
    page: "Carte cadeau",
    label: "Grande photo d'ouverture",
    imageUrl: "/photos/atelier-mains.webp",
    alt: "Peinture d'une tasse en céramique au Kafé",
  },
];

export const settingsSeed: KafeSettings = {
  configurationVersion: 13,
  reservationsEnabled: true,
  reservationPauseMessage: "",
  depositThreshold: 10,
  depositFixedAmount: 100,
  defaultCapacity: 60,
  slotDurationMinutes: 120,
  slotIntervalMinutes: 60,
  slots: ["09:30", "10:30", "11:30", "12:30", "13:30", "14:30", "15:30", "16:30"],
  scheduleRules: [
    {
      id: "rule-standard",
      label: "Semaine type",
      weekdays: [2, 3, 4, 5, 6, 0],
      startTime: "09:30",
      endTime: "16:30",
      validFrom: "2026-01-01",
      validUntil: "2030-12-31",
    },
  ],
  seatingAreas: [
    { id: "carbet", label: "Carbet", capacity: 12, quantity: 1, zone: "carbet" },
    {
      id: "pique-nique",
      label: "Table de pique-nique",
      capacity: 5,
      quantity: 8,
      zone: "exterieur",
    },
    { id: "table-2", label: "Table de 2", capacity: 2, quantity: 2, zone: "interieur" },
    { id: "salon-2", label: "Espace salon", capacity: 2, quantity: 2, zone: "interieur" },
  ],
  closedWeekdays: [1],
  kitchenClosingTime: "17:30",
  lateArrivalGraceMinutes: 30,
  cancellationNoticeHours: 48,
  groupDepositForfeitHours: 24,
  minimumBookingLeadDays: 1,
  bookingCutoffTime: "18:00",
  reservationFieldRequirements: {
    emailRequired: true,
    childrenAgesRequired: false,
    messageRequired: false,
  },
  manualConfirmationThreshold: 10,
  groupOutsideFoodNotice:
    "Pour les groupes, les boissons et la nourriture provenant de l'extérieur ne peuvent pas être consommées au Kafé.",
  signatureRequiredOnArrival: true,
  walkInCafeEnabled: true,
  walkInNoticeText:
    "Réserve ta venue pour garantir ta place. Sans réservation, l'accueil reste possible uniquement selon les places disponibles, sans aucune garantie.",
  reservationConditionsText:
    "Annulation possible jusqu'à 48 h avant. Au-delà, merci d'appeler le Kafé. Une réservation est libérée après plus de 30 minutes de retard. Pour les groupes, l'acompte est conservé si l'annulation intervient moins de 24 h avant.",
  guideAcceptanceText:
    "J'ai pris connaissance du guide. Le Kafé ne pourra en aucun cas être tenu responsable des suites malheureuses d'un non-respect de ses consignes.",
  confirmationEmailText:
    "Votre réservation est enregistrée. Vous retrouverez les informations pratiques dans cette confirmation.",
  instagramUrl: "https://www.instagram.com/kafeceramik_guadeloupe/",
  facebookUrl: "",
  tiktokUrl: "",
  contactEmail: "",
  contactPhone: "0690 28 47 88",
  contactAddress: "Lieu dit Loyette, 97118 Saint-François, Guadeloupe",
  contactMapUrl: "https://www.google.com/maps?q=16.286364%2C-61.288357",
  adminNotificationEmail: "ceramikkafe@gmail.com",
  pinterestUrl: "",
  guestbookEnabled: true,
  googleReviewUrl: "https://share.google/s8MOPkUla7xtu7zQL",
  giftCardContactEmail: "ceramikkafe@gmail.com",
  giftCardPaymentsEnabled: false,
  giftCardValidityMonths: 6,
  giftCardCustomEnabled: true,
  giftCardCustomMin: 20,
  giftCardOptions: [
    {
      id: "petit-plaisir",
      title: "Le Petit Plaisir",
      amount: 35,
      description:
        "Une boisson signature, chaude ou fraîche, et une céramique à peindre jusqu'à 25 €.",
      visible: true,
      visual: "rose",
    },
    {
      id: "joli-moment",
      title: "Le Joli Moment",
      amount: 60,
      description: "Une boisson signature, un brunch et une céramique à peindre jusqu'à 35 €.",
      visible: true,
      visual: "tropical",
    },
    {
      id: "parenthese-parfaite",
      title: "La Parenthèse Parfaite",
      amount: 80,
      description: "Une boisson signature, un brunch et une céramique à peindre jusqu'à 55 €.",
      visible: true,
      visual: "confetti",
    },
  ],
  maximumVisitHours: 4,
  sharedTableNotice:
    "Le Kafé est un lieu convivial : selon l'affluence, votre groupe peut partager une grande table avec d'autres artistes.",
  takeawayNotice: "Pour une commande à emporter, appelle directement le Kafé.",
  consumptionMandatoryNotice:
    "Une consommation sur place est obligatoire pour chaque personne participant à l'atelier.",
  groupCeramicRateMin: 18,
  groupCeramicRateMax: 80,
  groupMealRateMin: 15,
  groupMealRateMax: 25,
  sumupPaymentsEnabled: false,
  creationInspirations: creationInspirationsSeed,
  pageImages: pageImagesSeed,
};

export function getPageImage(settings: KafeSettings, id: PageImageKey): PageImageSetting {
  return (
    settings.pageImages?.find((image) => image.id === id) ??
    pageImagesSeed.find((image) => image.id === id) ??
    pageImagesSeed[0]
  );
}

export function useCeramicObjects() {
  return useStoredList<CeramicObject>("kafe-ceramik-objects", ceramicObjectsSeed, {
    table: "kafe_ceramic_objects",
  });
}

export function useContentDocuments() {
  return useStoredList<ContentDocument>("kafe-ceramik-documents", contentDocumentsSeed, {
    table: "kafe_content_documents",
  });
}

export function useWaiverSignatures() {
  return useStoredList<WaiverSignature>("kafe-ceramik-waiver-signatures", waiverSignaturesSeed, {
    table: "kafe_waiver_signatures",
    authLoad: true,
    hasSortOrder: false,
    toRow: (signature) => ({
      id: signature.id,
      value: signature,
      reservation_ref: signature.reservationRef ?? null,
      document_version: signature.documentVersion,
      signed_at: signature.signedAt,
      updated_at: new Date().toISOString(),
    }),
  });
}

function normalizeKafeSettings(value?: Partial<KafeSettings> | null): KafeSettings {
  const pageImages = pageImagesSeed.map((seedImage) => ({
    ...seedImage,
    ...value?.pageImages?.find((image) => image.id === seedImage.id),
    id: seedImage.id,
    page: seedImage.page,
    label: seedImage.label,
  }));
  const merged: KafeSettings = {
    ...settingsSeed,
    ...value,
    reservationFieldRequirements: {
      ...settingsSeed.reservationFieldRequirements,
      ...value?.reservationFieldRequirements,
    },
    giftCardOptions: value?.giftCardOptions ?? settingsSeed.giftCardOptions,
    pageImages,
  };

  if ((value?.configurationVersion ?? 0) >= settingsSeed.configurationVersion) {
    return merged;
  }

  if ((value?.configurationVersion ?? 0) >= 12) {
    return {
      ...merged,
      configurationVersion: settingsSeed.configurationVersion,
      pageImages,
    };
  }

  if ((value?.configurationVersion ?? 0) >= 2) {
    return {
      ...merged,
      configurationVersion: settingsSeed.configurationVersion,
      depositFixedAmount: settingsSeed.depositFixedAmount,
      reservationFieldRequirements: settingsSeed.reservationFieldRequirements,
      reservationConditionsText: settingsSeed.reservationConditionsText,
      giftCardOptions: settingsSeed.giftCardOptions,
      giftCardCustomMin: settingsSeed.giftCardCustomMin,
      giftCardValidityMonths: settingsSeed.giftCardValidityMonths,
      googleReviewUrl: value?.googleReviewUrl || settingsSeed.googleReviewUrl,
      contactPhone: value?.contactPhone ?? settingsSeed.contactPhone,
      contactAddress: value?.contactAddress ?? settingsSeed.contactAddress,
      contactMapUrl: value?.contactMapUrl ?? settingsSeed.contactMapUrl,
    };
  }

  // Apply the first validated operating rules once to settings saved before the client cadrage.
  return {
    ...merged,
    configurationVersion: settingsSeed.configurationVersion,
    defaultCapacity: settingsSeed.defaultCapacity,
    slotDurationMinutes: settingsSeed.slotDurationMinutes,
    slotIntervalMinutes: settingsSeed.slotIntervalMinutes,
    slots: settingsSeed.slots,
    scheduleRules: settingsSeed.scheduleRules,
    seatingAreas: settingsSeed.seatingAreas,
    closedWeekdays: settingsSeed.closedWeekdays,
    kitchenClosingTime: settingsSeed.kitchenClosingTime,
    lateArrivalGraceMinutes: settingsSeed.lateArrivalGraceMinutes,
    cancellationNoticeHours: settingsSeed.cancellationNoticeHours,
    groupDepositForfeitHours: settingsSeed.groupDepositForfeitHours,
    reservationFieldRequirements: settingsSeed.reservationFieldRequirements,
    manualConfirmationThreshold: settingsSeed.manualConfirmationThreshold,
    depositThreshold: settingsSeed.depositThreshold,
    depositFixedAmount: settingsSeed.depositFixedAmount,
    signatureRequiredOnArrival: settingsSeed.signatureRequiredOnArrival,
    reservationConditionsText: settingsSeed.reservationConditionsText,
  };
}

function readKafeSettings() {
  if (typeof window === "undefined") return settingsSeed;
  try {
    const raw = localStorage.getItem("kafe-ceramik-settings");
    const next = normalizeKafeSettings(raw ? (JSON.parse(raw) as Partial<KafeSettings>) : null);
    localStorage.setItem("kafe-ceramik-settings", JSON.stringify(next));
    return next;
  } catch {
    return settingsSeed;
  }
}

export function useKafeSettings() {
  const [settings, setSettings] = useState<KafeSettings>(() =>
    typeof window === "undefined" ? settingsSeed : settingsSeed,
  );
  const [ready, setReady] = useState(() => !isSupabaseConfigured());
  const remoteSaveQueue = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    let alive = true;
    const update = () => setSettings(readKafeSettings());
    update();
    const unsubscribe = subscribe("kafe-ceramik-settings", update);

    if (isSupabaseConfigured()) {
      selectRows<{ id: string; value: KafeSettings }>(
        "kafe_settings",
        "?id=eq.main&select=id,value&limit=1",
      )
        .then((rows) => {
          if (!alive || !rows[0]?.value) return;
          const next = normalizeKafeSettings(rows[0].value);
          writeStore("kafe-ceramik-settings", next);
          setSettings(next);
        })
        .catch((error) => {
          console.warn("Remote settings load skipped:", error);
        })
        .finally(() => {
          if (alive) setReady(true);
        });
    } else {
      setReady(true);
    }

    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  const save = (next: KafeSettings) => {
    const normalized = normalizeKafeSettings({
      ...next,
      configurationVersion: settingsSeed.configurationVersion,
    });
    writeStore("kafe-ceramik-settings", normalized);
    if (isSupabaseConfigured()) {
      remoteSaveQueue.current = remoteSaveQueue.current
        .catch(() => undefined)
        .then(() =>
          upsertRows(
            "kafe_settings",
            [{ id: "main", value: normalized, updated_at: new Date().toISOString() }],
            true,
          ),
        )
        .catch((error) => {
          console.warn("Remote settings save skipped:", error);
        });
    }
  };
  return [settings, save, ready] as const;
}
