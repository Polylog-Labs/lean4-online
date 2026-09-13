import type { Metadata } from 'next';
import { lessons, lessonTracks } from '../../lib/content';
import { ContentPage } from '../../components/content-page';

export const metadata: Metadata = { title: 'Learn Lean — leanlab', description: 'Guided Lean lessons with explanations, editable exercises, hints, and solutions.', alternates: { canonical: '/learn' } };
export default function Lessons() {
  return <ContentPage><h1>Learn Lean</h1><p>Read each lesson here, then open its exercise in the editor to check your work.</p>{lessonTracks.map(track => <section key={track}><h2>{track}</h2><ul>{lessons.filter(lesson => lesson.track === track).map(lesson => <li key={lesson.id}><a href={`/learn/${lesson.id}`}>{lesson.title}</a><p>{lesson.description}</p></li>)}</ul></section>)}</ContentPage>;
}
