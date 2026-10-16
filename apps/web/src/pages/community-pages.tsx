import { Link } from "react-router-dom";
import { Users, MapPin, Trophy, ArrowUpRight } from "lucide-react";
import { organizations } from "../mocks/data";
import { Button } from "../shared/ui/button";
import { Card, Badge } from "../shared/ui/primitives";
import { SectionHeading } from "../shared/ui/section-heading";
export function OrganizersPage() {
  return (
    <div className="container page-section">
      <div className="page-intro">
        <p className="eyebrow">РАЗОМ ДІЄМО МАСШТАБНІШЕ</p>
        <h1>Добра ідея шукає команду</h1>
        <p>DniproXP допоможе ініціативам знаходити людей, яким не байдуже.</p>
      </div>
      <div className="organizer-benefits">
        {[
          [
            Users,
            "Збирай спільноту",
            "Зрозумілі квести допомагають людям знайти свою роль.",
          ],
          [
            MapPin,
            "Дій локально",
            "Об’єднуй мешканців навколо потреб свого району.",
          ],
          [
            Trophy,
            "Відзначай внесок",
            "Підтверджуй участь і допомагай волонтерам зростати.",
          ],
        ].map(([Icon, title, text]) => {
          const I = Icon as typeof Users;
          return (
            <Card key={String(title)}>
              <I size={32} />
              <h2>{String(title)}</h2>
              <p>{String(text)}</p>
            </Card>
          );
        })}
      </div>
      <Card className="organizer-info">
        <Badge>ДЕМОНСТРАЦІЙНА ВЕРСІЯ</Badge>
        <h2>Публікація квестів з’явиться згодом</h2>
        <p>
          Зараз можна дослідити каталог і спробувати шлях волонтера. Створення
          подій та перевірка організацій потребуватимуть підключення серверної
          частини.
        </p>
        <Button asChild>
          <Link to="/quests">
            Подивитися приклади квестів <ArrowUpRight size={18} />
          </Link>
        </Button>
      </Card>
      <section className="section">
        <SectionHeading
          title="Знайомся з демоспільнотою"
          description="Ці вигадані організації показують різні напрями волонтерства."
        />
        <div className="organization-grid">
          {organizations.map((o) => (
            <Card key={o.id}>
              <span className="organization-avatar">{o.initials}</span>
              <h3>{o.name}</h3>
              <p>{o.description}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
