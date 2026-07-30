export type TeamMember = {
  id: string;
  name: string;
  role: string;
  initials: string;
  // Omitted for real members without a bio yet — TeamCard skips the
  // paragraph entirely rather than showing filler text under a real name.
  bio?: string;
};

// Roster fills in as the team grows — the trailing placeholders keep the
// grid from looking sparse with just two people on it.
export const mockTeam: TeamMember[] = [
  { id: "derek-wu", name: "Derek Wu", role: "Co-Founder", initials: "DW" },
  { id: "austin-gu", name: "Austin Gu", role: "Co-Founder", initials: "AG" },
  {
    id: "member-3",
    name: "Name Placeholder",
    role: "Role Placeholder",
    initials: "?",
    bio: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  },
  {
    id: "member-4",
    name: "Name Placeholder",
    role: "Role Placeholder",
    initials: "?",
    bio: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  },
  {
    id: "member-5",
    name: "Name Placeholder",
    role: "Role Placeholder",
    initials: "?",
    bio: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  },
  {
    id: "member-6",
    name: "Name Placeholder",
    role: "Role Placeholder",
    initials: "?",
    bio: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  },
];
