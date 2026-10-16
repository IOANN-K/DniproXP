import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { useSkills } from "../../features/skill-progress/hooks";
import { useSession } from "../../features/session/store";
import { useVolunteerState } from "../../shared/lib/use-volunteer";
import { selectSkills } from "../../mocks/identity-selectors";
import { publicQuests, getQuestSnapshot } from "../../mocks/repository";
import { skillDefinitions } from "../../entities/skill/catalog";
import { recommendedSkillQuests } from "../../entities/skill/calculator";
import {
  SkillTree,
  SkillCategoryTabs,
  SkillDetailsPanel,
} from "../../entities/skill/components";
import { Sheet, SheetContent } from "../../shared/ui/sheet";
import { Badge } from "../../shared/ui/primitives";
import {
  ExplorationSkeleton,
  ExplorationError,
} from "../../shared/ui/exploration-states";
export function SkillsPage() {
  const user = useSession((s) => s.user)!;
  const state = useVolunteerState();
  const query = useSkills(user.id);
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState(skillDefinitions[0].id);
  const [open, setOpen] = useState(false);
  if (query.isPending)
    return (
      <div className="container page-section">
        <ExplorationSkeleton />
      </div>
    );
  if (query.isError)
    return (
      <div className="container page-section">
        <ExplorationError retry={() => void query.refetch()} />
      </div>
    );
  const progress = selectSkills(state, user.id);
  const definition = skillDefinitions.find((d) => d.id === selected)!;
  const current = progress.find((p) => p.skillId === selected)!;
  const quests = recommendedSkillQuests(
    definition,
    publicQuests(state).map((q) => getQuestSnapshot(q.id, state)!),
    state.participations,
    user.id,
  );
  const details = (
    <SkillDetailsPanel
      definition={definition}
      progress={current}
      quests={quests}
    />
  );
  return (
    <div className="container page-section skills-page">
      <section className="identity-page-heading">
        <div>
          <Badge>
            <Sparkles size={15} />
            ЗРОСТАЙ ЗАВДЯКИ ДОБРИМ СПРАВАМ
          </Badge>
          <h1>Твоя сила має багато напрямів</h1>
          <p>
            Обирай компетенцію, досліджуй підтверджений досвід і знаходь
            наступну можливість.
          </p>
        </div>
        <Link to="/passport" className="text-link">
          Мій паспорт <ArrowUpRight size={17} />
        </Link>
      </section>
      <div className="skills-summary">
        <strong>
          {progress.filter((p) => p.level > 0).length} / {progress.length}
        </strong>
        <span>навичок із досягнутим рівнем · лише підтверджені справи</span>
      </div>
      <SkillCategoryTabs value={category} onChange={setCategory} />
      <div className="skill-workspace">
        <SkillTree
          definitions={skillDefinitions}
          progress={progress}
          category={category}
          selected={selected}
          onSelect={(id) => {
            setSelected(id);
            if (window.matchMedia("(max-width: 900px)").matches) setOpen(true);
          }}
        />
        <aside className="skill-desktop-panel">{details}</aside>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          title={definition.name}
          description="Передумови, підтверджений досвід та наступні квести"
        >
          <div className="skill-mobile-details">{details}</div>
        </SheetContent>
      </Sheet>
      <p className="demo-caption">
        Демонстраційні компетенції, не професійна сертифікація. Використовуй Tab
        або стрілки для навігації між вузлами.
      </p>
    </div>
  );
}
