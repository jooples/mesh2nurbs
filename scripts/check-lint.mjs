import { ESLint } from "eslint";

const files = [
  "app/page.tsx", "app/create/page.tsx", "app/gallery/page.tsx", "app/billing/page.tsx",
  "app/admin/users/[id]/page.tsx", "app/jobs/[id]/page.tsx", "app/api/generate/route.ts",
  "components/Navbar.tsx", "components/Popover.tsx", "components/ModelPreview.tsx",
  "components/TimeEstimate.tsx", "components/GalleryPreview.tsx",
  "lib/api.ts", "lib/credits.tsx", "lib/image-upload.ts", "lib/retryable-request.ts",
  "lib/use-remote-data.ts", "lib/job-status.ts", "tests/*.test.mjs", "scripts/check-lint.mjs",
];

// Existing job-page progress rendering predates these changes. Keep its debt
// visible and fail on additional findings, instead of disabling these rules.
const baseline = new Map([
  ["react-hooks/refs", 9],
  ["react-hooks/purity", 2],
  ["react-hooks/immutability", 1],
  ["react-hooks/set-state-in-effect", 1],
]);
let existing = 0;
let failures = 0;
const results = await new ESLint().lintFiles(files);
for (const result of results) {
  const knownPage = result.filePath.replaceAll("\\", "/").endsWith("/app/jobs/[id]/page.tsx");
  for (const message of result.messages) {
    const remaining = knownPage ? baseline.get(message.ruleId) ?? 0 : 0;
    if (remaining > 0) {
      baseline.set(message.ruleId, remaining - 1);
      existing += 1;
    } else {
      failures += 1;
      console.error(`${result.filePath}:${message.line} ${message.ruleId}: ${message.message}`);
    }
  }
}
console.log(`Lint: ${failures} new findings; ${existing} known job-page React Hooks findings (baseline: 13).`);
process.exitCode = failures ? 1 : 0;
