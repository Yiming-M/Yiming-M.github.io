export type Locale = "en" | "zh";

export type LocalizedText = {
  en: string;
  zh: string;
};

export const site = {
  name: "Yiming Ma",
  nameZh: "马一铭",
  displayName: "Dr Yiming Ma",
  displayNameZh: "马一铭博士",
  email: "yiming.m@proton.me",
  scholar: "https://scholar.google.com/citations?user=gC0aZsAAAAAJ&hl=en",
  github: "https://github.com/Yiming-M",
  linkedin: "https://www.linkedin.com/in/yiming-ma-5b401a201/",
};

export const taxonomy: Record<string, { group: "task" | "method" | "goal"; label: LocalizedText }> = {
  "task:crowd-counting": { group: "task", label: { en: "Task · Crowd counting", zh: "任务 · 人群计数" } },
  "task:human-behaviour": { group: "task", label: { en: "Task · Human behaviour", zh: "任务 · 人类行为" } },
  "method:probabilistic": { group: "method", label: { en: "Method · Probabilistic models", zh: "方法 · 概率模型" } },
  "method:vision-language": { group: "method", label: { en: "Method · Vision–language", zh: "方法 · 视觉–语言" } },
  "method:multimodal-fusion": { group: "method", label: { en: "Method · Multimodal fusion", zh: "方法 · 多模态融合" } },
  "method:feature-fusion": { group: "method", label: { en: "Method · Feature fusion", zh: "方法 · 特征融合" } },
  "method:skeleton-graphs": { group: "method", label: { en: "Method · Skeleton graphs", zh: "方法 · 骨架图建模" } },
  "goal:scalability": { group: "goal", label: { en: "Goal · Scalability", zh: "目标 · 可扩展性" } },
  "goal:accuracy": { group: "goal", label: { en: "Goal · Accuracy", zh: "目标 · 准确性" } },
  "goal:robustness": { group: "goal", label: { en: "Goal · Robustness", zh: "目标 · 稳健性" } },
  "goal:efficiency": { group: "goal", label: { en: "Goal · Efficiency", zh: "目标 · 高效性" } },
  "goal:anticipation": { group: "goal", label: { en: "Goal · Anticipation", zh: "目标 · 行为预判" } },
};

export function localize(locale: Locale, value: LocalizedText) {
  return value[locale];
}

export function localePath(locale: Locale, path = "/") {
  const cleanPath = path === "/" ? "/" : `/${path.replace(/^\/+|\/+$/g, "")}/`;
  return locale === "zh" ? `/zh${cleanPath}` : cleanPath;
}

export function routeDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function publicationPath(id: string, date: Date) {
  return `/publications/${routeDate(date)}/${id}`;
}

export function writingPath(route: string, date: Date) {
  return `/writing/${routeDate(date)}/${route}`;
}

export function formatDate(locale: Locale, date: Date) {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}
