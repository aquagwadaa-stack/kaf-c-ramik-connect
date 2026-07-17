import type { ReactNode } from "react";
import {
  AlertTriangle,
  Brush,
  CalendarDays,
  Camera,
  Check,
  Clock3,
  Coffee,
  ExternalLink,
  Flame,
  Gift,
  Heart,
  PackageCheck,
  Palette,
  Paintbrush,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { ContentResource } from "@/lib/admin-data";

export function OfficialGuideContent({ resource }: { resource: ContentResource }) {
  const href = resource.attachmentDataUrl || resource.attachmentUrl;

  return (
    <article className="overflow-hidden border border-primary/20 bg-[#fffaf7] shadow-[0_20px_50px_rgba(97,49,39,0.08)]">
      {resource.id === "guide-complet" && <CompleteGuide />}
      {resource.id === "nuancier-1" && <ColorChartOne />}
      {resource.id === "nuancier-2" && <ColorChartTwo />}
      {resource.id === "gaspillage-peinture" && <PaintWaste />}
      {resource.id === "casse-ceramique" && <CeramicBreakage />}
      {href && (
        <div className="flex justify-end border-t border-primary/15 bg-white/70 px-5 py-4">
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary underline underline-offset-4"
          >
            <ExternalLink className="h-4 w-4" /> Consulter le PDF officiel
          </a>
        </div>
      )}
    </article>
  );
}

function PosterHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="relative overflow-hidden bg-[#fff4f5] px-5 py-9 text-center sm:px-8 sm:py-12">
      <Sparkles className="absolute left-5 top-5 h-6 w-6 text-[#efa900]" />
      <Heart className="absolute bottom-6 right-6 h-7 w-7 text-[#e90061]" />
      {eyebrow && (
        <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#e90061]">
          {eyebrow}
        </div>
      )}
      <h3 className="mt-2 font-display text-4xl leading-none text-[#4a1b12] sm:text-6xl">
        {title}
      </h3>
      {children}
    </header>
  );
}

function CompleteGuide() {
  const process = [
    [Palette, "Choisissez", "votre céramique et vos couleurs"],
    [Paintbrush, "Peignez", "avec amour"],
    [Camera, "Photographiez", "votre céramique"],
    [Brush, "Appliquez", "le vernis adapté"],
    [Flame, "Cuisson", "par nos soins"],
    [Gift, "Récupérez", "votre création"],
  ] as const;

  return (
    <>
      <PosterHeader title="Guide complet Kafé Céramik">
        <div className="mx-auto mt-6 inline-flex items-center gap-3 rounded-full bg-[#ec2872] px-5 py-3 text-sm font-bold text-white sm:text-base">
          <CalendarDays className="h-5 w-5" /> 7 à 10 jours après cuisson pour récupérer votre
          création
        </div>
      </PosterHeader>

      <div className="grid grid-cols-2 border-y border-[#e90061]/15 bg-white sm:grid-cols-3 lg:grid-cols-6">
        {process.map(([Icon, title, detail], index) => (
          <div key={title} className="px-3 py-5 text-center">
            <span className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-[#e90061] text-sm font-bold text-white">
              {index + 1}
            </span>
            <Icon className="mx-auto mt-3 h-7 w-7 text-[#4a1b12]" />
            <div className="mt-2 text-sm font-bold">{title}</div>
            <div className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</div>
          </div>
        ))}
      </div>

      <div className="space-y-0">
        <GuideSection
          number="1"
          tone="blue"
          title="Choisissez votre céramique et vos couleurs"
          icon={<Palette className="h-8 w-8" />}
        >
          <GuideBullet>
            Choisissez votre ou vos céramiques. Le prix affiché comprend la céramique, le matériel
            et la cuisson.
          </GuideBullet>
          <GuideBullet>
            Servez-vous raisonnablement en peinture dans les palettes blanches. Ne prenez pas les
            peintures à table. Fiez-vous toujours au nuancier : la magie des couleurs s’opère
            pendant la cuisson.
          </GuideBullet>
          <GuideBullet>
            Appliquez 2 couches de peinture, tous nuanciers confondus, en laissant sécher
            complètement entre chaque couche.
          </GuideBullet>
          <GuideBullet>
            N’appliquez rien sur la zone de contact avec la table. Si vous avez débordé, un chiffon
            avec de l’eau effacera la peinture et/ou le vernis.
          </GuideBullet>
          <GuideBullet>
            Écrivez vos initiales sous la céramique à la peinture. Le crayon à papier s’efface à la
            cuisson.
          </GuideBullet>
        </GuideSection>

        <GuideSection
          number="2"
          tone="pink"
          title="Prenez votre céramique en photo"
          icon={<Camera className="h-8 w-8" />}
        >
          <GuideBullet>
            Prenez une photo de votre céramique lorsque vous avez terminé la peinture. La photo et
            les initiales sont obligatoires pour pouvoir récupérer votre céramique.
          </GuideBullet>
          <Important>
            Sans ces deux éléments, il sera impossible de récupérer votre création.
          </Important>
        </GuideSection>

        <GuideSection
          number="3"
          tone="green"
          title="Appliquez le vernis"
          icon={<Brush className="h-8 w-8" />}
        >
          <GuideBullet>
            Prenez un pot de vernis et un pinceau à table. Lorsque la peinture est sèche, appliquez
            le vernis sans en abuser et sans insister sur la peinture.
          </GuideBullet>
          <GuideBullet>
            Appliquez 2 couches et laissez sécher entre chaque couche. Une fois terminé, lavez et
            rangez tout votre matériel.
          </GuideBullet>
          <Important tone="green">
            Le vernis rend votre céramique étanche et alimentaire, même sur les zones non peintes.
            Les peintures à effets ne nécessitent pas de vernis.
          </Important>
        </GuideSection>
      </div>

      <div className="grid gap-px bg-[#e7cfa9] sm:grid-cols-2 lg:grid-cols-4">
        <Fact icon={<CalendarDays />} title="Délai de cuisson">
          7 à 10 jours pour récupérer votre création.
        </Fact>
        <Fact icon={<Heart />} title="Conservation">
          2 mois maximum. Passé ce délai, les créations sont données à des associations.
        </Fact>
        <Fact icon={<Paintbrush />} title="Nouvelle cuisson">
          30 % du prix si le non-respect des consignes impose un second passage au four.
        </Fact>
        <Fact icon={<AlertTriangle />} title="Céramique cassée">
          Une céramique brute cassée est facturée à la moitié de son prix.
        </Fact>
      </div>
      <div className="bg-[#e90061] px-5 py-4 text-center text-sm font-bold leading-6 text-white">
        Un excès de peinture ou de vernis peut coller la céramique aux plaques de cuisson et
        l’endommager. Les ateliers se déroulent en autonomie.
      </div>
    </>
  );
}

function GuideSection({
  number,
  title,
  tone,
  icon,
  children,
}: {
  number: string;
  title: string;
  tone: "blue" | "pink" | "green";
  icon: ReactNode;
  children: ReactNode;
}) {
  const colors = {
    blue: "bg-[#e8f7ff] border-[#1aa7d3] text-[#11698b]",
    pink: "bg-[#fff0f6] border-[#ec2872] text-[#b60d51]",
    green: "bg-[#f2f8dd] border-[#84ad29] text-[#587315]",
  }[tone];
  return (
    <section className={`grid border-b sm:grid-cols-[15rem_1fr] ${colors}`}>
      <div className="flex items-center gap-4 border-b border-current/20 p-5 sm:block sm:border-b-0 sm:border-r sm:p-7">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-current text-xl font-bold text-white">
          <span className="text-white">{number}</span>
        </span>
        <div className="sm:mt-6">{icon}</div>
        <h4 className="font-display text-2xl leading-tight sm:mt-3">{title}</h4>
      </div>
      <div className="space-y-4 bg-white/85 p-5 text-foreground sm:p-7">{children}</div>
    </section>
  );
}

function GuideBullet({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 border-b border-dotted border-primary/25 pb-4 text-sm leading-7 sm:text-base">
      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#e90061]" />
      <p>{children}</p>
    </div>
  );
}

function Important({ children, tone = "pink" }: { children: ReactNode; tone?: "pink" | "green" }) {
  return (
    <div
      className={`flex items-start gap-3 border p-4 text-sm font-semibold leading-6 ${
        tone === "green" ? "border-[#84ad29] bg-[#f2f8dd]" : "border-[#ec2872] bg-[#fff0f6]"
      }`}
    >
      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" /> {children}
    </div>
  );
}

function Fact({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="bg-[#fff9eb] p-5 text-center">
      <div className="mx-auto flex h-8 w-8 items-center justify-center text-[#e90061]">{icon}</div>
      <div className="mt-2 text-sm font-bold">{title}</div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{children}</p>
    </div>
  );
}

const chartOneSteps = [
  [
    Paintbrush,
    "Appliquez 1 couche de peinture",
    "Appliquez une couche régulière sur votre céramique.",
  ],
  [Clock3, "Laissez sécher 5 à 10 minutes", ""],
  [Palette, "Appliquez une 2ème couche", "Inscrivez vos initiales à la peinture."],
  [Clock3, "Laissez sécher 5 à 10 minutes", ""],
  [
    Camera,
    "Prenez votre céramique en photo",
    "La photo est obligatoire pour récupérer sa céramique.",
  ],
  [Brush, "Appliquez 1 couche de vernis", ""],
  [Clock3, "Laissez sécher 5 à 10 minutes", ""],
  [Brush, "Appliquez la 2ème couche de vernis", ""],
] as const;

const chartTwoSteps = [
  [
    Paintbrush,
    "Appliquez 1 couche de peinture",
    "Appliquez une couche régulière sur votre céramique.",
  ],
  [Clock3, "Laissez sécher 5 à 10 minutes", ""],
  [Palette, "Appliquez la 2ème couche", "Écrivez vos initiales avec une peinture basique."],
  [
    Camera,
    "Prenez votre céramique en photo",
    "La photo est obligatoire pour récupérer sa céramique.",
  ],
] as const;

function ColorChartOne() {
  return (
    <ColorChart number="1" steps={chartOneSteps}>
      <Important tone="green">
        Le vernis rend la céramique étanche et alimentaire et assure sa durabilité.
      </Important>
      <WarningLine />
    </ColorChart>
  );
}

function ColorChartTwo() {
  return (
    <ColorChart number="2" steps={chartTwoSteps}>
      <div className="bg-[#ffe25e] px-5 py-5 text-center text-xl font-bold uppercase text-[#b60d51] sm:text-2xl">
        Les peintures de ce nuancier ne nécessitent pas de vernis.
      </div>
      <div className="grid gap-4 bg-[#fff4f5] p-5 text-sm leading-6 sm:grid-cols-2 sm:p-7">
        <p>Pour vous servir dans les palettes, aidez-vous du dos de votre pinceau.</p>
        <p>
          Des billes se trouvent dans la peinture. Elles explosent en cuisson et forment les effets
          : plus vous appliquez de billes, plus il y aura d’effets.
        </p>
      </div>
      <WarningLine />
    </ColorChart>
  );
}

function ColorChart({
  number,
  steps,
  children,
}: {
  number: string;
  steps: readonly (readonly [typeof Paintbrush, string, string])[];
  children: ReactNode;
}) {
  return (
    <>
      <PosterHeader eyebrow={`Nuancier n°${number}`} title="Kafé Céramik">
        <p className="mx-auto mt-5 max-w-2xl text-sm font-bold uppercase leading-6 text-[#b60d51] sm:text-base">
          Fiez-vous toujours au nuancier, la magie des couleurs s’opère pendant la cuisson.
        </p>
      </PosterHeader>
      <div className="space-y-2 bg-[#fff4f5] p-4 sm:p-7">
        {steps.map(([Icon, title, detail], index) => (
          <div
            key={`${number}-${index}`}
            className="grid grid-cols-[3rem_2.5rem_1fr] items-center gap-3 bg-white px-4 py-4 sm:grid-cols-[4rem_4rem_1fr]"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#e90061] text-lg font-bold text-white sm:h-12 sm:w-12">
              {index + 1}
            </span>
            <Icon className="h-7 w-7 text-[#4a1b12] sm:h-9 sm:w-9" />
            <div>
              <div className="text-sm font-bold uppercase text-[#d10b50] sm:text-lg">{title}</div>
              {detail && (
                <div className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
                  {detail}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-3 bg-[#fff4f5] px-4 pb-6 sm:px-7">{children}</div>
    </>
  );
}

function WarningLine() {
  return (
    <div className="flex items-start gap-3 border border-[#e90061]/30 bg-white p-4 text-sm font-semibold leading-6">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#e90061]" />
      Un excès de peinture ou de vernis collera la céramique à nos plaques de cuisson et risquera de
      l’endommager.
    </div>
  );
}

function PaintWaste() {
  return (
    <>
      <PosterHeader eyebrow="Prévention" title="Gaspillage peinture">
        <Paintbrush className="mx-auto mt-5 h-10 w-10 text-[#e90061]" />
      </PosterHeader>
      <div className="space-y-5 bg-[#fff4f5] px-5 py-7 text-center sm:px-10 sm:py-10">
        <PreventionLine>
          Merci de vous servir en petite quantité dans les palettes blanches.
        </PreventionLine>
        <PreventionLine>La peinture sèche très vite avec la chaleur.</PreventionLine>
        <PreventionLine>Il est conseillé de se servir plusieurs fois si besoin.</PreventionLine>
        <div className="border-2 border-[#ef8cac] bg-white px-5 py-6 text-lg font-bold leading-8 text-[#14365a]">
          Un abus ou gaspillage de peinture peut être facturé 2 € par compartiment de palette jeté.
        </div>
        <div className="inline-flex items-center justify-center gap-2 text-sm font-bold text-[#e90061]">
          <Heart className="h-5 w-5" /> Merci de votre compréhension. L’équipe du Kafé.
        </div>
      </div>
    </>
  );
}

function CeramicBreakage() {
  return (
    <>
      <header className="bg-[#103f40] px-5 py-10 text-center text-[#fff9eb] sm:px-10 sm:py-14">
        <AlertTriangle className="mx-auto h-10 w-10 text-[#d2744b]" />
        <h3 className="mt-4 font-display text-5xl sm:text-6xl">Fragile</h3>
        <p className="mx-auto mt-5 max-w-2xl text-base font-semibold uppercase leading-7">
          Merci de ne pas toucher les céramiques si vous ne participez pas à l’atelier.
        </p>
      </header>
      <div className="bg-[#fff9eb] px-5 py-9 text-center sm:px-10 sm:py-12">
        <p className="mx-auto max-w-2xl text-xl font-bold uppercase leading-9 text-[#bd5c39] sm:text-2xl">
          Pour toute céramique brute cassée, 50 % du prix de la céramique sera facturé.
        </p>
        <div className="mx-auto mt-8 h-px w-24 bg-[#bd5c39]" />
        <p className="mt-8 text-sm font-bold uppercase text-[#103f40]">
          Merci de votre compréhension. L’équipe du Kafé.
        </p>
      </div>
    </>
  );
}

function PreventionLine({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-3 text-base font-bold uppercase leading-7 text-[#14365a]">
      <Check className="h-5 w-5 shrink-0 text-[#e90061]" /> <span>{children}</span>
    </div>
  );
}
