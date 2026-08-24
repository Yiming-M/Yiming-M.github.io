import type { Locale, LocalizedText } from "./site";

export type PostTagGroup = "series" | "topic" | "lens";

export const postTagTaxonomy: Record<string, { group: PostTagGroup; label: LocalizedText }> = {
  "post:series:transformer-upgrade": {
    group: "series",
    label: { en: "Series · Transformer upgrade path", zh: "系列 · Transformer 升级之路" },
  },
  "post:topic:position-encoding": {
    group: "topic",
    label: { en: "Topic · Position encoding", zh: "主题 · 位置编码" },
  },
  "post:topic:transformer": {
    group: "topic",
    label: { en: "Topic · Transformer", zh: "主题 · Transformer" },
  },
  "post:lens:mathematical-derivation": {
    group: "lens",
    label: { en: "Approach · Mathematical derivation", zh: "方式 · 数学推导" },
  },
};

export const postTagGroupLabels: Record<PostTagGroup, LocalizedText> = {
  series: { en: "Series", zh: "系列" },
  topic: { en: "Topics", zh: "主题" },
  lens: { en: "Approach", zh: "方式" },
};

export function postTagLabel(tag: string, locale: Locale) {
  return postTagTaxonomy[tag]?.label[locale] ?? tag.replace(/^post:/, "");
}
