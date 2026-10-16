import type { Quest } from "../entities/types";
import type { QuestChain, QuestChainStatus } from "../entities/mission/types";
import type {
  CityChallenge,
  CityChallengeStatus,
} from "../entities/challenge/types";
import type { ExplorationState } from "../entities/exploration-types";
const start = "2026-09-01T00:00:00+03:00",
  end = "2026-11-30T23:59:59+02:00";
export function explorationSeed(quests: Quest[]): ExplorationState {
  const stories: Record<string, { summary: string; story: string }> = {
    "small-steps": {
      summary:
        "Знайомство з волонтерством через турботу про людей, тварин та довкілля.",
      story:
        "Не потрібно одразу змінювати весь світ. Почни зі знайомства з міськими командами: допоможи на березі, подаруй увагу тваринам і підготуй пакунки для сусідів. Кожен епізод відкриває інший бік Дніпра, а разом вони складаються у твою першу історію участі.",
    },
    "river-story": {
      summary: "Зелений парк і чистий берег — маршрут турботи про наше місто.",
      story:
        "Від першого прибирання берега прямуємо до озеленення парку, а потім повертаємося до води з новим досвідом. Ця місія поєднує турботу про зелені простори й річку. Додаткова зустріч на Монастирському острові продовжить історію, коли основний маршрут уже пройдено.",
    },
    "warm-routes": {
      summary:
        "Пакунок, доставка й теплий обід: підтримка, яку відчувають поруч.",
      story:
        "За кожним пакунком стоїть людина, якій важлива твоя увага. Допоможи команді підготувати набори, долучися до доставки покупок та підтримай сусідів наступною доброю справою. Додатковий епізод із гарячими обідами — ще один спосіб подарувати турботу.",
    },
    "paws-story": {
      summary: "Прогулянки, корм і безпечні іграшки для тих, хто чекає на дім.",
      story:
        "Довіра тварини зростає з маленьких зустрічей. Познайомся з підопічними на прогулянці, допоможи з кормом та створи безпечні іграшки для перетримок. Команда підкаже, як поводитися поруч із тваринами й зробити допомогу корисною.",
    },
    "city-makers": {
      summary:
        "Досліди доступність району й допоможи облаштувати спільний простір.",
      story:
        "Зручне місто починається з уваги до деталей. Досліди бар’єри на прогулянці-аудиті, долучися до облаштування дворика та онови лавки разом із сусідами. Спостереження перетворюються на дії, а звичні місця стають ближчими для кожного.",
    },
    memory: {
      summary: "Книжки, листівки та спогади зберігають голоси нашого міста.",
      story:
        "Це історія вже проведених культурних ініціатив. Волонтери впорядковували книжки, створювали листівки та оцифровували спогади містян. Особисті підтверджені епізоди залишаються в профілях навіть після завершення загальної ініціативи.",
    },
    september: {
      summary:
        "Архів вересневих зустрічей, які зробили райони трохи теплішими.",
      story:
        "Вересень об’єднав різні команди навколо щоденної турботи: сортування, спільних просторів і допомоги сусідам. Період місії завершився, але підтверджені добрі справи залишаються частиною особистої історії її учасників.",
    },
    "new-energy": {
      summary: "Майбутня освітня історія наставництва та обміну знаннями.",
      story:
        "Команда готує нову історію цифрової підтримки, мовної практики й першого знайомства з кодом. Це чернетка: нові етапи ще не відкриті. Перед публікацією визначено попередню місію та потрібний рівень досвіду.",
    },
    neighbors: {
      summary:
        "Ділися знаннями, знаходь спільну мову й підтримуй нових сусідів.",
      story:
        "Знання допомагають почуватися впевненіше у власному місті. Підтримай старших містян у користуванні смартфоном, долучися до розмовного клубу та допоможи підліткам на майстерні коду. Для цієї історії потрібні завершена місія маленьких кроків і третій рівень.",
    },
  };
  const title = (id: string) => quests.find((q) => q.id === id)?.title || id;
  const mission = (
    id: string,
    slug: string,
    name: string,
    category: string,
    organizationId: string,
    ids: string[],
    status: QuestChainStatus,
    extra: Partial<QuestChain> = {},
  ): QuestChain => ({
    id,
    slug,
    title: name,
    shortDescription: stories[id].summary,
    description: `${stories[id].story} Попередні підтвердження в межах періоду зараховуються. Основні етапи відкриваються за підтвердженнями організатора; бонусний етап не блокує фінал.`,
    coverImage:
      category === "eco"
        ? "/images/nature.jpg"
        : category === "animals"
          ? "/images/dogs.jpg"
          : category === "culture" || category === "education"
            ? "/images/books.jpg"
            : "/images/community.jpg",
    category,
    difficulty: "Легкий",
    organizationId,
    steps: ids.map((questId, i) => ({
      id: `${id}-step-${i + 1}`,
      chainId: id,
      questId,
      title: title(questId),
      description:
        i === 0
          ? "Почни історію з першої підтвердженої доброї справи."
          : i === 3
            ? "Додаткова можливість допомогти спільноті без обов’язкового проходження."
            : "Продовжуй історію: нова команда, новий досвід і користь для міста.",
      order: i + 1,
      isOptional: i === 3,
      prerequisiteStepIds: i === 0 ? [] : [`${id}-step-${i === 3 ? 1 : i}`],
    })),
    prerequisites: { chainIds: [], questIds: [], minLevel: 1 },
    rewards: {
      xp:
        category === "eco"
          ? 450
          : category === "city"
            ? 500
            : category === "education"
              ? 400
              : category === "animals"
                ? 300
                : 350,
      rewardPoints: 120,
      achievement: {
        id: `mission-badge-${id}`,
        title: `Історія: ${name}`,
        description: "Усі обов’язкові етапи підтверджені організаторами.",
      },
    },
    status,
    startsAt: start,
    endsAt: end,
    estimatedDuration: "3 зустрічі · у власному темпі",
    ...extra,
  });
  const missions: QuestChain[] = [
    mission(
      "small-steps",
      "syla-malykh-krokiv",
      "Сила маленьких кроків",
      "social",
      "care",
      ["history-1", "history-2", "history-3", "history-4"],
      "ACTIVE",
    ),
    mission(
      "river-story",
      "bereh-spilnykh-diy",
      "Берег спільних дій",
      "eco",
      "green",
      ["history-1", "demo-city-team", "quest-1", "quest-7"],
      "ACTIVE",
    ),
    mission(
      "warm-routes",
      "tepli-marshruty",
      "Теплі маршрути турботи",
      "social",
      "care",
      ["history-3", "quest-3", "quest-10", "quest-15"],
      "ACTIVE",
    ),
    mission(
      "paws-story",
      "dlia-tykh-u-koho-lapky",
      "Для тих, у кого лапки",
      "animals",
      "paws",
      ["quest-2", "quest-9", "quest-16", "history-2"],
      "PUBLISHED",
    ),
    mission(
      "city-makers",
      "misto-spilnykh-prostoriv",
      "Місто спільних просторів",
      "city",
      "urban",
      ["quest-20", "quest-14", "quest-5", "history-4"],
      "ACTIVE",
      {
        difficulty: "Середній",
        prerequisites: { chainIds: [], questIds: [], minLevel: 2 },
      },
    ),
    mission(
      "memory",
      "khranyteli-istoriy",
      "Хранителі міських історій",
      "culture",
      "urban",
      ["history-4", "history-11", "history-17", "history-9"],
      "COMPLETED",
    ),
    mission(
      "september",
      "veresnevyi-slid",
      "Теплий слід вересня",
      "eco",
      "green",
      ["history-13", "history-14", "history-15", "history-16"],
      "ARCHIVED",
      { endsAt: "2026-09-30T23:59:59+03:00" },
    ),
    mission(
      "new-energy",
      "nova-enerhiia",
      "Нова енергія району",
      "education",
      "learn",
      ["quest-6", "quest-12", "quest-18", "quest-24"],
      "DRAFT",
      {
        prerequisites: { chainIds: ["small-steps"], questIds: [], minLevel: 4 },
      },
    ),
    mission(
      "neighbors",
      "spilnota-bez-kordoniv",
      "Спільнота без кордонів",
      "education",
      "learn",
      ["quest-6", "quest-12", "quest-18", "history-6"],
      "ACTIVE",
      {
        difficulty: "Середній",
        prerequisites: { chainIds: ["small-steps"], questIds: [], minLevel: 3 },
      },
    ),
  ];
  const reward = (id: string) => ({
    xp: 250,
    rewardPoints: 100,
    achievement: {
      id: `challenge-badge-${id}`,
      title: "Сила спільного внеску",
      description:
        "Ти долучився підтвердженою справою до завершеного міського виклику.",
    },
  });
  const challenge = (
    id: string,
    slug: string,
    name: string,
    category: string,
    organizationId: string,
    relatedQuestIds: string[],
    status: CityChallengeStatus,
  ): CityChallenge => ({
    id,
    slug,
    title: name,
    description:
      (
        {
          river:
            "Пластик і побутове сміття залишаються на берегах після відпочинку. Об’єднуємо прибирання та сортування на пов’язаних локаціях: наша мета — чистіші прогулянки біля води й час, подарований довкіллю.",
          green:
            "Зелені простори потребують догляду та нових дерев. Разом із координаторами готуємо ділянки й висаджуємо погоджені саджанці. Рахуємо спільні дерева окремо від особистого часу кожного волонтера.",
          kind: "Уже завершена хвиля допомоги сусідам: команди сформували й передали пакунки підтримки. Зберігаємо весь підтверджений результат, зокрема допомогу понад початкову мету. Учасники з особистим внеском можуть отримати фінальну відзнаку.",
          paws: "Підопічним перетримок потрібні увага, прогулянки та щоденна турбота. Готуємо наступний спільний період допомоги: підтвердження до дати старту до цього виклику не зараховуються.",
          old: "Вереснева спроба об’єднати районні прибирання вже завершена. Загальної мети не досягли, але зберігаємо підтверджені години й спільно зібрані відходи: кожна добра справа залишається важливою.",
          courtyard:
            "Цю спільну ініціативу облаштування дворика скасовано до початку збору внесків. Нові долучення та фінальні бонуси закриті. Інші районні квести можна знайти в каталозі.",
          future:
            "Чернетка майбутнього освітнього виклику: цифрова грамотність і наставництво для нових учасників. Цілі ще не опубліковані для волонтерів, підтвердження не накопичують внесків.",
        } as Record<string, string>
      )[id] + " Усі цілі та вимірювання тут демонстраційні.",
    coverImage:
      category === "eco"
        ? "/images/nature.jpg"
        : category === "animals"
          ? "/images/dogs.jpg"
          : "/images/community.jpg",
    category,
    organizationId,
    startDate: start,
    endDate: end,
    status,
    goals: [],
    relatedQuestIds,
    participantIds: [],
    rewards: reward(id),
    createdAt: start,
  });
  const river = challenge(
    "river",
    "chystyi-bereh",
    "Повернемо берегу чистоту",
    "eco",
    "green",
    ["history-1", "history-8", "quest-1", "quest-7", "demo-city-team"],
    "ACTIVE",
  );
  river.goals = [
    {
      id: "river-hours",
      metric: "VOLUNTEER_HOURS",
      targetValue: 18,
      unit: "год",
      description: "Спільний час на турботу про берег",
      isOptional: false,
    },
    {
      id: "river-waste",
      metric: "LITTER_KG",
      targetValue: 60,
      unit: "кг",
      description: "Менше сміття у спільному просторі",
      isOptional: false,
    },
  ];
  const green = challenge(
    "green",
    "bilsh-zelenyi-dnipro",
    "Більше зеленого Дніпра",
    "eco",
    "green",
    ["history-5", "history-19", "quest-4", "demo-city-team"],
    "ACTIVE",
  );
  green.goals = [
    {
      id: "green-trees",
      metric: "TREES_PLANTED",
      targetValue: 18,
      unit: "дерев",
      description: "Нові дерева для майбутніх прогулянок",
      isOptional: false,
    },
    {
      id: "green-hours",
      metric: "VOLUNTEER_HOURS",
      targetValue: 12,
      unit: "год",
      description: "Час на озеленення й догляд",
      isOptional: false,
    },
  ];
  const care = challenge(
    "kind",
    "osinnia-khvylia-turboty",
    "Осіння хвиля турботи",
    "social",
    "care",
    ["history-3", "history-10"],
    "COMPLETED",
  );
  care.endDate = "2026-10-15T23:59:59+03:00";
  care.goals = [
    {
      id: "kind-units",
      metric: "HUMANITARIAN_UNITS",
      targetValue: 50,
      unit: "од.",
      description: "Сформовані одиниці гуманітарної допомоги",
      isOptional: false,
    },
    {
      id: "kind-hours",
      metric: "VOLUNTEER_HOURS",
      targetValue: 10,
      unit: "год",
      description: "Час, подарований сусідам",
      isOptional: false,
    },
  ];
  const paws = challenge(
    "paws",
    "tyzhni-khvostatykh",
    "Тижні турботи про хвостатих",
    "animals",
    "paws",
    ["quest-2", "quest-9", "quest-16"],
    "UPCOMING",
  );
  paws.startDate = "2026-10-25T00:00:00+03:00";
  paws.goals = [
    {
      id: "paws-hours",
      metric: "VOLUNTEER_HOURS",
      targetValue: 20,
      unit: "год",
      description: "Час для прогулянок і турботи",
      isOptional: false,
    },
  ];
  const old = challenge(
    "old",
    "veresneve-prybyrannia",
    "Вересневе прибирання районів",
    "eco",
    "green",
    ["history-13", "history-19", "history-20"],
    "EXPIRED",
  );
  old.endDate = "2026-09-30T23:59:59+03:00";
  old.goals = [
    {
      id: "old-hours",
      metric: "VOLUNTEER_HOURS",
      targetValue: 500,
      unit: "год",
      description: "Запланований час волонтерства",
      isOptional: false,
    },
    {
      id: "old-kg",
      metric: "LITTER_KG",
      targetValue: 200,
      unit: "кг",
      description: "Запланований обсяг прибирання",
      isOptional: false,
    },
  ];
  const cancelled = challenge(
    "courtyard",
    "zatysnyi-dvoryk",
    "Затишний дворик разом",
    "city",
    "urban",
    ["quest-5", "quest-14"],
    "CANCELLED",
  );
  cancelled.goals = [
    {
      id: "court-hours",
      metric: "VOLUNTEER_HOURS",
      targetValue: 30,
      unit: "год",
      description: "Час для облаштування дворика",
      isOptional: false,
    },
  ];
  const draft = challenge(
    "future",
    "misto-maibutnikh-idey",
    "Місто майбутніх ідей",
    "education",
    "learn",
    ["quest-6", "quest-18"],
    "DRAFT",
  );
  draft.goals = [
    {
      id: "future-hours",
      metric: "VOLUNTEER_HOURS",
      targetValue: 40,
      unit: "год",
      description: "Час на відкриті знання",
      isOptional: false,
    },
  ];
  const measurements: ExplorationState["measurements"] = [
    {
      id: "measure-history-1-kg",
      questId: "history-1",
      metric: "LITTER_KG",
      value: 12,
      unit: "кг",
    },
    {
      id: "measure-history-8-kg",
      questId: "history-8",
      metric: "LITTER_KG",
      value: 20,
      unit: "кг",
    },
    {
      id: "measure-history-5-trees",
      questId: "history-5",
      metric: "TREES_PLANTED",
      value: 5,
      unit: "дерев",
    },
    {
      id: "measure-history-19-kg",
      questId: "history-19",
      metric: "LITTER_KG",
      value: 18,
      unit: "кг",
    },
    {
      id: "measure-history-13-kg",
      questId: "history-13",
      metric: "LITTER_KG",
      value: 8,
      unit: "кг",
    },
    {
      id: "measure-history-3-units",
      questId: "history-3",
      metric: "HUMANITARIAN_UNITS",
      value: 40,
      unit: "од.",
    },
    {
      id: "measure-history-10-units",
      questId: "history-10",
      metric: "HUMANITARIAN_UNITS",
      value: 25,
      unit: "од.",
    },
    {
      id: "measure-quest-1-kg",
      questId: "quest-1",
      metric: "LITTER_KG",
      value: 30,
      unit: "кг",
    },
    {
      id: "measure-quest-7-kg",
      questId: "quest-7",
      metric: "LITTER_KG",
      value: 25,
      unit: "кг",
    },
    {
      id: "measure-quest-4-trees",
      questId: "quest-4",
      metric: "TREES_PLANTED",
      value: 8,
      unit: "дерев",
    },
    {
      id: "measure-demo-trees",
      questId: "demo-city-team",
      metric: "TREES_PLANTED",
      value: 6,
      unit: "дерев",
    },
  ];
  return {
    schemaVersion: 1,
    missions,
    challenges: [river, green, care, paws, old, cancelled, draft],
    measurements,
    missionEnrollments: [],
    challengeParticipants: [],
    contributions: [],
  };
}
