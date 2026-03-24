import { PrismaClient, type NewsStatus, type UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ruMap: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

function translit(input: string) {
  return input
    .split("")
    .map((ch) => {
      const lower = ch.toLowerCase();
      if (ruMap[lower] === undefined) return ch;
      return ruMap[lower];
    })
    .join("");
}

function slugify(input: string) {
  return (
    translit(input)
      .trim()
      .toLowerCase()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "") || "item"
  );
}

function sample<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function takeRandom<T>(arr: T[], count: number) {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < count && copy.length) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function buildHtml(title: string, i: number) {
  return `
    <h2>${title}</h2>
    <p><strong>Jour News</strong> demo-материал №${i}. Это пример контента, который хранится в базе как HTML (TipTap).</p>
    <p>Скорость, контекст и факты: короткие абзацы, подзаголовки и цитаты. Можно вставлять ссылки и изображения.</p>
    <blockquote>Важно: это демонстрационные данные, созданные сидером.</blockquote>
    <h3>Что произошло</h3>
    <p>В рамках тестового проекта мы показываем полноценный новостной сайт: лента, топ-материалы, поиск, категории, теги и админка.</p>
    <h3>Почему это важно</h3>
    <ul>
      <li>Проверка UI и SEO.</li>
      <li>Проверка пагинации и списков.</li>
      <li>Проверка редакторского workflow.</li>
    </ul>
    <p>Подробности будут обновляться по мере публикаций.</p>
  `.trim();
}

async function main() {
  // Clean up for repeatable seeding (dev only).
  await prisma.newsView.deleteMany();
  await prisma.newsTag.deleteMany();
  await prisma.news.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();
  await prisma.author.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  const categoriesData = [
    { name: "Политика", slug: "politics", description: "Внутренняя и внешняя политика" },
    { name: "Экономика", slug: "economy", description: "Рынки, финансы, бизнес" },
    { name: "Мир", slug: "world", description: "Новости мира" },
    { name: "Технологии", slug: "tech", description: "IT, наука, гаджеты" },
    { name: "Спорт", slug: "sport", description: "Главные спортивные события" },
  ];
  const categories = await Promise.all(
    categoriesData.map((c) => prisma.category.create({ data: c })),
  );

  const tagsData = [
    "Срочно",
    "Аналитика",
    "Интервью",
    "Эксклюзив",
    "Репортаж",
    "Мнение",
    "Рынки",
    "AI",
    "Кибербезопасность",
    "Футбол",
  ].map((name) => ({ name, slug: slugify(name) }));
  const tags = await Promise.all(tagsData.map((t) => prisma.tag.create({ data: t })));

  const authors = await Promise.all([
    prisma.author.create({
      data: {
        name: "Редакция Jour News",
        slug: "journews",
        bio: "Команда редакторов, работающих над ежедневной лентой.",
      },
    }),
    prisma.author.create({
      data: {
        name: "Анна Петрова",
        slug: "anna-petrova",
        bio: "Автор, специализация: технологии и экономика.",
      },
    }),
  ]);

  const adminPasswordHash = await bcrypt.hash("Admin123!", 10);
  const editorPasswordHash = await bcrypt.hash("Editor123!", 10);

  await prisma.user.create({
    data: {
      email: "admin@local.test",
      name: "Admin",
      passwordHash: adminPasswordHash,
      role: "ADMIN" as UserRole,
    },
  });
  await prisma.user.create({
    data: {
      email: "editor@local.test",
      name: "Editor",
      passwordHash: editorPasswordHash,
      role: "EDITOR" as UserRole,
    },
  });

  const now = new Date();

  // 26 published, 2 draft, 2 scheduled
  const total = 30;
  for (let i = 1; i <= total; i++) {
    const category = sample(categories);
    const author = sample(authors);
    const title = `Демо-новость #${i}: ${category.name} сегодня`;
    const slug = `demo-${i}-${category.slug}`;
    const lead = `Короткий лид для демо-новости #${i}. Здесь 1–2 предложения, чтобы показать карточки и SEO-описание.`;

    let status: NewsStatus = "PUBLISHED" as NewsStatus;
    let publishedAt: Date | null = new Date(now.getTime() - i * 3 * 60 * 60 * 1000);
    let scheduledAt: Date | null = null;

    if (i === 29 || i === 30) {
      status = "SCHEDULED" as NewsStatus;
      publishedAt = null;
      scheduledAt = new Date(now.getTime() + (i - 28) * 30 * 60 * 1000); // +30m, +60m
    } else if (i === 27 || i === 28) {
      status = "DRAFT" as NewsStatus;
      publishedAt = null;
    }

    const isTop = i <= 5;
    const isEditorsPick = i % 7 === 0;

    const chosenTags = takeRandom(tags, 3);

    await prisma.news.create({
      data: {
        title,
        slug,
        lead,
        contentHtml: buildHtml(title, i),
        status,
        publishedAt,
        scheduledAt,
        isTop,
        isEditorsPick,
        categoryId: category.id,
        authorId: author.id,
        sourceName: i % 5 === 0 ? "Jour News Desk" : null,
        sourceUrl: i % 5 === 0 ? "https://example.com" : null,
        tags: {
          create: chosenTags.map((t) => ({ tagId: t.id })),
        },
      },
    });
  }

  // Seed some view events for popularity (last 7 days).
  const published = await prisma.news.findMany({
    where: { status: "PUBLISHED" as NewsStatus },
    select: { id: true },
    take: 20,
  });
  for (const item of published) {
    const count = 5 + Math.floor(Math.random() * 40);
    for (let i = 0; i < count; i++) {
      const createdAt = new Date(now.getTime() - Math.floor(Math.random() * 6) * 24 * 60 * 60 * 1000);
      await prisma.newsView.create({
        data: { newsId: item.id, createdAt },
      });
    }
    await prisma.news.update({
      where: { id: item.id },
      data: { views: { increment: count } },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
