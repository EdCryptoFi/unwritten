import { Card, Meta, Page } from '@/components/primitives';
import Link from 'next/link';

export default function NotFound() {
  return (
    <Page title="Nothing here" lede="That address does not belong to anything in this house.">
      <Card>
        <Meta>
          <Link href="/" className="text-text-brand-primary">Back to the start</Link>
          {' · '}
          <Link href="/agreement" className="text-text-brand-primary">The Agreement</Link>
          {' · '}
          <Link href="/judge" className="text-text-brand-primary">Reviewing this?</Link>
        </Meta>
      </Card>
    </Page>
  );
}
