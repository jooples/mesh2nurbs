import type { TeamMember } from "@/lib/mockTeam";

export default function TeamCard({ member }: { member: TeamMember }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-zinc-900/60 p-6 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-400/30 hover:shadow-lg hover:shadow-violet-950/40">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/25 to-cyan-500/20 text-2xl font-semibold text-violet-200 ring-1 ring-white/10">
        {member.initials}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-zinc-50">{member.name}</h3>
        <p className="text-sm text-zinc-400">{member.role}</p>
      </div>
      <p className="text-xs text-zinc-500">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
        eiusmod tempor incididunt ut labore et dolore magna aliqua.
      </p>
    </div>
  );
}
