import type { Metadata } from 'next';
import { examples } from '../../lib/content';
import { ContentPage } from '../../components/content-page';

export const metadata: Metadata = { title: 'Lean examples — leanlab', description: 'Runnable Lean programs and proofs with source code and explanations.', alternates: { canonical: '/examples' } };
export default function Examples() {
  return <ContentPage><h1>Lean examples</h1><p>Read the source and explanations, then open a file in the editor to run it. These examples use the included core library.</p>{[...new Set(examples.map(example => example.category))].map(category => <section key={category}><h2>{category}</h2><ul>{examples.filter(example => example.category === category).map(example => <li key={example.id}><a href={`/examples/${example.id}`}>{example.title}</a><p>{example.description}</p></li>)}</ul></section>)}</ContentPage>;
}
