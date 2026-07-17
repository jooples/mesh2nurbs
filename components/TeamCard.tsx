import type { TeamMember } from "@/lib/mockTeam";

export default function TeamCard({ member }: { member: TeamMember }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-zinc-900 p-6 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-violet-500/20 text-2xl font-semibold text-violet-300">
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
