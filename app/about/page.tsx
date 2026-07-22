import TeamCard from "@/components/TeamCard";
import { mockTeam } from "@/lib/mockTeam";

export default function AboutPage() {
  return (
    <section className="mx-auto w-full max-w-6xl flex-1 px-6 py-16">
      <div className="mb-12 text-center">
        <h1 className="bg-gradient-to-br from-white to-violet-200 bg-clip-text text-3xl font-semibold text-transparent sm:text-4xl">
          About us
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-zinc-400">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
          ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
          aliquip ex ea commodo consequat. Duis aute irure dolor in
          reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
          pariatur.
        </p>
      </div>

      <h2 className="mb-8 flex items-center justify-center gap-2.5 text-center text-xl font-semibold text-zinc-50">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
        Our team
      </h2>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {mockTeam.map((member) => (
          <TeamCard key={member.id} member={member} />
        ))}
      </div>
    </section>
  );
}
