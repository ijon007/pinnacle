import { Link, type Href } from 'expo-router';
import type { ReactElement } from 'react';

/** Row-to-detail zoom on iOS 18+. Other platforms keep the stack slide. */
export function ZoomLink({ href, children }: { href: Href; children: ReactElement }) {
  return (
    <Link href={href} asChild>
      <Link.Trigger withAppleZoom>{children}</Link.Trigger>
    </Link>
  );
}
