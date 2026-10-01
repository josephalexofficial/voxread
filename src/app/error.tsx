'use client';

interface AppErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Shown when the reader shell throws. The digest is omitted because it is not useful to a reader.
 *
 * @param props.error - The thrown error.
 * @param props.reset - Next.js reset for this segment.
 * @returns A recoverable error screen.
 */
export default function AppErrorPage({ error, reset }: AppErrorPageProps) {
  return (
    <main className="welcome">
      <p className="eyebrow">VoxRead</p>
      <h1>The reader stopped.</h1>
      <p>{error.message || 'Something unexpected happened.'}</p>
      <button type="button" className="button button-primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
