import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { lessons, examples } from '../../../lib/content';
import { ProofCards } from '../../../components/proof-cards';
import { ContentPage } from '../../../components/content-page';

export const dynamicParams = false;
export function generateStaticParams() { return lessons.map(lesson => ({ id: lesson.id })); }
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params, lesson = lessons.find(item => item.id === id);
  return lesson ? { title: `${lesson.title} — Learn Lean — leanlab`, description: lesson.description, alternates: { canonical: `/learn/${id}` } } : {};
}
export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params, lesson = lessons.find(item => item.id === id);
  if (!lesson) notFound();
  return <ContentPage><p className="content-category">{lesson.track} · {lesson.duration}</p><h1>{lesson.title}</h1>{lesson.comparison && <ProofCards />}{lesson.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}<h2>Exercise</h2><p>{lesson.task}</p><a className="button button-primary" href={`/#lesson=${id}`}>Open exercise in editor</a><pre><code>{lesson.starter}</code></pre><details><summary>Hint</summary><p>{lesson.hint}</p></details><details><summary>Solution</summary><pre><code>{lesson.solution}</code></pre></details><h2>Related example</h2><a href={`/examples/${lesson.exampleId}`}>{examples.find(example => example.id === lesson.exampleId)?.title}</a></ContentPage>;
}
