import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const localizedText = z.object({
  en: z.string(),
  zh: z.string(),
});

const publications = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/publications" }),
  schema: z.object({
    title: z.string(),
    shortTitle: z.string(),
    date: z.coerce.date(),
    publishedOn: z.coerce.date(),
    venue: z.string(),
    authors: z.array(z.string()),
    tags: z.array(z.string()),
    selected: z.boolean().default(false),
    image: z.string().optional(),
    links: z.object({
      paper: z.string(),
      code: z.string().optional(),
      demo: z.string().optional(),
    }),
    question: localizedText,
    oneLine: localizedText,
    problem: localizedText,
    idea: localizedText,
    evidence: localizedText,
    caveat: localizedText,
  }),
});

const posts = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    route: z.string(),
    image: z.string(),
    imageAlt: z.string(),
    locale: z.enum(["en", "zh"]),
    date: z.coerce.date(),
    readingTime: z.string(),
    tags: z.array(z.string().regex(/^post:/)),
    seriesKey: z.string(),
    seriesTitle: z.string(),
    seriesPart: z.number().int().positive(),
  }),
});

export const collections = { publications, posts };
