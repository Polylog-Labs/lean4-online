import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { examples } from '../../../lib/content';
import { ContentPage } from '../../../components/content-page';

export const dynamicParams = false;
export function generateStaticParams() { return examples.map(example => ({ id: example.id })); }
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params, item = examples.find(example => example.id === id);
  return item ? { title: `${item.title} — leanlab`, description: item.description, alternates: { canonical: `/examples/${id}` } } : {};
}
export default async function ExamplePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params, example = examples.find(item => item.id === id);
  if (!example) notFound();
  return <ContentPage><p className="content-category">{example.category}</p><h1>{example.title}</h1><p>{example.description}</p><a className="button button-primary" href={`/#example=${id}`}>Open {example.file} in editor</a>{example.incomplete && <p className="warning-color">This example intentionally contains sorry. Replace it to complete the proof.</p>}<pre><code>{example.code}</code></pre><h2>Explanation</h2>{example.concepts.map(concept => <section key={concept.token}><h3><code>{concept.token}</code></h3><p>{concept.explanation}</p></section>)}{example.history && <section><h2>Background and proof scope</h2><p>{example.history.milestone}</p><p>{example.history.fact}</p><p>{example.history.scope}</p><a href={example.history.source}>{example.history.sourceTitle}</a></section>}<h2>Expected output</h2><p>Reference only. Run the file to check its actual result.</p><pre>{example.expected}</pre><h2>Exercise</h2><p>{example.challenge}</p>{example.related && <section><h2>Related examples</h2><ul>{example.related.map(id => <li key={id}><a href={`/examples/${id}`}>{examples.find(item => item.id === id)?.title}</a></li>)}</ul></section>}{example.references && <section><h2>Further reading</h2><ul>{example.references.map(reference => <li key={reference.url}><a href={reference.url}>{reference.title}</a></li>)}</ul></section>}</ContentPage>;
}
