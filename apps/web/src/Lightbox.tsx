import { FlameIcon } from "./FlameIcon";

export function Lightbox({
  src,
  onClose,
  like
}: {
  src: string;
  onClose: () => void;
  like?: { count: number; liked: boolean; onToggle: () => void };
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/80 text-2xl text-slate-200"
      >
        ×
      </button>
      <div className="relative max-h-full max-w-full" onClick={(e) => e.stopPropagation()}>
        <img src={src} alt="" className="max-h-full max-w-full rounded-md object-contain" />
        {like && (
          <button
            onClick={like.onToggle}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-2 backdrop-blur-sm"
          >
            <FlameIcon active={like.liked} className={`h-6 w-6 ${like.liked ? "" : "text-slate-200"}`} />
            <span className="text-sm font-medium text-slate-100">{like.count}</span>
          </button>
        )}
      </div>
    </div>
  );
}
