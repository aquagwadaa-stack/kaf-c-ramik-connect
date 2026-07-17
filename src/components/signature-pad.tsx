import { useEffect, useRef } from "react";
import type { PointerEvent } from "react";
import { Trash2 } from "lucide-react";

export function SignaturePad({
  value,
  onChange,
  label = "Signature",
}: {
  value?: string;
  onChange: (value?: string) => void;
  label?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (!value) return;
    const image = new Image();
    image.onload = () => context.drawImage(image, 0, 0, canvas.width, canvas.height);
    image.src = value;
  }, [value]);

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function start(event: PointerEvent<HTMLCanvasElement>) {
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    isDrawing.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const position = point(event);
    context.beginPath();
    context.moveTo(position.x, position.y);
  }

  function move(event: PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const position = point(event);
    context.lineWidth = 4;
    context.lineCap = "round";
    context.strokeStyle = "#2d2421";
    context.lineTo(position.x, position.y);
    context.stroke();
  }

  function stop(event: PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    onChange(event.currentTarget.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    onChange(undefined);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Trash2 className="h-3.5 w-3.5" /> Effacer
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={900}
        height={300}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={stop}
        onPointerCancel={stop}
        onPointerLeave={stop}
        className="h-44 w-full touch-none border-2 border-dashed border-primary/35 bg-white"
        aria-label="Zone de signature tactile"
      />
      <div className="mt-1 text-xs text-muted-foreground">
        {value ? "Signature enregistrée dans le formulaire." : "Signez avec le doigt ou le stylet."}
      </div>
    </div>
  );
}
