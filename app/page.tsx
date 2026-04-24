import { RoadmapView } from "./roadmap-view";
import { PEOPLE, MONTHS, PHASES, TEAMS } from "./roadmap-data";
import { readOverrides } from "~/lib/roadmap-storage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page() {
  let initialOverrides;
  try {
    initialOverrides = await readOverrides();
  } catch (err) {
    console.error("SSR: failed to read roadmap overrides:", err);
    initialOverrides = undefined;
  }
  return (
    <RoadmapView
      people={PEOPLE}
      months={MONTHS}
      phases={PHASES}
      teams={TEAMS}
      initialOverrides={initialOverrides}
    />
  );
}
