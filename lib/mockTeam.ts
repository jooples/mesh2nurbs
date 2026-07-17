export type TeamMember = {
  id: string;
  name: string;
  role: string;
  initials: string;
};

/** Placeholder team roster — replace with real bios/photos later. */
export const mockTeam: TeamMember[] = [
  { id: "member-1", name: "Name Placeholder", role: "Role Placeholder", initials: "AA" },
  { id: "member-2", name: "Name Placeholder", role: "Role Placeholder", initials: "BB" },
  { id: "member-3", name: "Name Placeholder", role: "Role Placeholder", initials: "CC" },
  { id: "member-4", name: "Name Placeholder", role: "Role Placeholder", initials: "DD" },
];
