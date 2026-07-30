import type { TeamMember } from "@/lib/mockTeam";

export default function TeamCard({ member }: { member: TeamMember }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-stone-200/70 bg-white shadow-sm shadow-rose-900/[0.05] p-6 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-400/30 hover:shadow-lg hover:shadow-violet-950/10 dark:border-white/10 dark:bg-zinc-900/60 dark:hover:shadow-violet-950/40">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/25 to-cyan-500/20 text-2xl font-semibold text-violet-700 ring-1 ring-stone-200 dark:text-violet-200 dark:ring-white/10">
        {member.initials}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-stone-900 dark:text-zinc-50">{member.name}</h3>
        <p className="text-sm text-stone-600 dark:text-zinc-400">{member.role}</p>
      </div>
      {member.bio && <p className="text-xs text-stone-500">{member.bio}</p>}
    </div>
  );
}
