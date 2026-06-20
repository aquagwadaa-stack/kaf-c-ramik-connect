export function OrganicShapes({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      {/* Sage leaf top-left */}
      <svg className="absolute -left-10 -top-16 w-56 sm:w-72" viewBox="0 0 200 200" fill="none">
        <path
          d="M30 90 C20 40 70 10 120 20 C170 30 190 80 170 130 C150 170 100 190 60 170 C25 155 35 120 30 90 Z"
          fill="var(--color-sage)"
        />
      </svg>
      {/* Brick blob top-right */}
      <svg className="absolute -right-12 -top-10 w-56 sm:w-72" viewBox="0 0 200 200" fill="none">
        <path
          d="M50 30 C100 0 170 20 180 70 C195 130 150 180 90 170 C30 160 10 100 30 60 C38 45 42 38 50 30 Z"
          fill="var(--color-brick)"
        />
      </svg>
      {/* Lavender shape bottom-left */}
      <svg className="absolute -left-8 bottom-0 w-48 sm:w-64 translate-y-1/3" viewBox="0 0 200 200" fill="none">
        <path
          d="M40 40 C90 20 160 50 170 110 C175 170 110 200 60 180 C20 165 10 110 25 75 C30 60 32 50 40 40 Z"
          fill="var(--color-lavender)"
        />
      </svg>
      {/* Mustard shape bottom-right */}
      <svg className="absolute -right-6 -bottom-10 w-56 sm:w-72" viewBox="0 0 200 200" fill="none">
        <path
          d="M60 30 C120 10 180 60 180 120 C180 180 100 200 60 170 C20 145 15 90 35 60 C45 45 50 38 60 30 Z"
          fill="var(--color-mustard)"
        />
      </svg>
    </div>
  );
}
