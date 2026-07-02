export function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
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
      <img src={src} alt="" className="max-h-full max-w-full rounded-md object-contain" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}
