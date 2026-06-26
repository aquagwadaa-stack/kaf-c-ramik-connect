import { CeramicPiece } from "./ceramic-piece";

export function OrganicShapes({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <div className="absolute -left-10 -top-12 h-52 w-52 rotate-[-14deg] opacity-70 sm:h-64 sm:w-64">
        <CeramicPiece kind="plate" />
      </div>
      <div className="absolute -right-12 -top-8 h-48 w-48 rotate-[12deg] opacity-75 sm:h-64 sm:w-64">
        <CeramicPiece kind="vase" />
      </div>
      <div className="absolute -left-6 bottom-0 h-40 w-40 translate-y-1/3 rotate-[9deg] opacity-55 sm:h-52 sm:w-52">
        <CeramicPiece kind="bowl" />
      </div>
      <div className="absolute -right-2 bottom-2 hidden h-44 w-44 translate-y-1/4 rotate-[-8deg] opacity-60 sm:block">
        <CeramicPiece kind="mug" />
      </div>
    </div>
  );
}
