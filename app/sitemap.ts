import type { MetadataRoute } from 'next';
import { examples, lessons } from '../lib/content';
import { siteURL } from '../lib/site';
export default function sitemap(): MetadataRoute.Sitemap {
  return ['', '/examples', '/learn', ...examples.map(example => `/examples/${example.id}`), ...lessons.map(lesson => `/learn/${lesson.id}`)].map(path => ({ url: `${siteURL}${path}` }));
}
