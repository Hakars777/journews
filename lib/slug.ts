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

export function slugify(input: string, opts?: { maxLen?: number }) {
  const maxLen = opts?.maxLen ?? 80;

  const base = translit(input)
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  const slug = (base || "news").slice(0, maxLen).replace(/-+$/g, "");
  return slug || "news";
}

