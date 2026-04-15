import { RoadmapView } from "./roadmap-view";
import { PEOPLE, MONTHS, PHASES, TEAMS } from "./roadmap-data";

export default function Page() {
  return <RoadmapView people={PEOPLE} months={MONTHS} phases={PHASES} teams={TEAMS} />;
}
