import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-sm font-semibold tracking-wide text-zinc-50">
          mesh2nurbs
        </Link>
        <div className="flex items-center gap-6 text-sm text-zinc-300">
          <Link href="/about" className="transition-colors hover:text-white">
            About
          </Link>
          <Link href="/gallery" className="transition-colors hover:text-white">
            Gallery
          </Link>
          <Link
            href="/create"
            className="rounded-full bg-white px-4 py-2 font-medium text-black transition-colors hover:bg-zinc-200"
          >
            Get Started
          </Link>
        </div>
      </nav>
    </header>
  );
}
