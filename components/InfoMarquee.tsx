const items = [
  { icon: "💬", text: "Describe it in words, or upload a reference image" },
  { icon: "🧩", text: "AI generates a 3D mesh in minutes" },
  { icon: "📐", text: "Converted to editable NURBS surfaces" },
  { icon: "♾️", text: "Infinite resolution — no polygon facets, ever" },
  { icon: "🏭", text: "Watertight geometry, ready for manufacturing" },
  { icon: "🖨️", text: "Export for 3D printing, CNC, or injection molding" },
  { icon: "🌐", text: "Publish finished models to the public gallery" },
  { icon: "📁", text: "Organize your models into albums" },
];

function Chip({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex shrink-0 items-center gap-2.5 rounded-full border border-stone-200/70 bg-white px-4 py-2 shadow-sm shadow-rose-900/[0.04] dark:border-white/10 dark:bg-zinc-900/60">
      <span className="text-base" aria-hidden>{icon}</span>
      <span className="whitespace-nowrap text-sm text-stone-700 dark:text-zinc-300">{text}</span>
    </div>
  );
}

// Infinite horizontal ticker — the item list is rendered twice back-to-back
// and the wrapper animates from 0 to -50%, so the loop point is invisible.
export default function InfoMarquee() {
  return (
    <div
      className="overflow-hidden py-6"
      style={{ maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)" }}
    >
      <div className="flex w-max animate-marquee gap-3">
        {[...items, ...items].map((item, i) => (
          <Chip key={i} icon={item.icon} text={item.text} />
        ))}
      </div>
    </div>
  );
}
