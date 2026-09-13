import Workspace from '../components/workspace';
import { desktopMedia } from '../lib/layout';
export default function Home() { return <><link rel="preload" href="/editor/editor.js" as="script" media={desktopMedia} /><Workspace /></>; }
