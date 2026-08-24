import { getCollection } from "astro:content";
import { localePath, publicationPath, writingPath } from "../lib/site";

export async function GET({ site }: { site: URL }) {
  const publications = await getCollection("publications");
  const posts = await getCollection("posts");
  const uniquePosts = [...new Map(posts.map((post) => [`${post.data.route}:${post.data.date.toISOString()}`, post])).values()];
  const fixed = ["", "publications", "writing", "topics", "about", "cv"];
  const paths = [
    ...fixed.flatMap((path) => [`/${path}${path ? "/" : ""}`, `/zh/${path}${path ? "/" : ""}`]),
    ...publications.flatMap((publication) => [
      localePath("en", publicationPath(publication.id, publication.data.date)),
      localePath("zh", publicationPath(publication.id, publication.data.date)),
    ]),
    ...uniquePosts.flatMap((post) => [
      localePath("en", writingPath(post.data.route, post.data.date)),
      localePath("zh", writingPath(post.data.route, post.data.date)),
    ]),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((path) => `  <url><loc>${new URL(path, site).href}</loc></url>`).join("\n")}\n</urlset>`;
  return new Response(body, { headers: { "Content-Type": "application/xml" } });
}
