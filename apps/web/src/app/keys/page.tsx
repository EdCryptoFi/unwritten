'use client';

import { Badge, Card, Kpi, Meta, Page, Rule } from '@/components/primitives';
import { useApp } from '@/lib/state';
import { useState } from 'react';

export default function Keys() {
  const { role } = useApp();
  const [counter, setCounter] = useState(1);
  const [delegate, setDelegate] = useState(true);
  const [frozen, setFrozen] = useState(false);
  const [confirm, setConfirm] = useState<'revoke' | 'freeze' | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const add = (s: string) => setLog((l) => [s, ...l].slice(0, 8));

  if (role !== 'owner') {
    return <Page title="Keys" lede="Owner-only surface.">
      <Card><Meta>Only the account owner manages keys. An approver cannot add, remove or freeze.</Meta></Card>
    </Page>;
  }

  const revoke = () => {
    setDelegate(false); setCounter((c) => c + 1); setConfirm(null);
    add(`removeDelegateKey → access_counter_version ${counter} → ${counter + 1}`);
    add('the application lost access to the house memory and cannot stop it');
    add(`the owner can still decrypt; memories under counter ${counter} stay readable with the older key`);
  };
  const freeze = () => {
    setFrozen((f) => !f); setConfirm(null);
    add(frozen ? 'account reactivated — possible unless an AdminCap quarantine is active'
               : 'Seal denies decryption to everyone, the owner included');
  };
  const write = () => {
    if (frozen) return add('remember() FAILED — account frozen, Seal denied, nobody can decrypt');
    if (!delegate) return add('remember() FAILED — no valid delegate, the key was revoked and the counter moved');
    add(`remember() ok — counter read FRESH from chain (${counter}), never cached, then encrypted`);
  };

  if (confirm) {
    return (
      <Page
        title={confirm === 'revoke' ? 'Revoke the delegate' : frozen ? 'Reactivate the account' : 'Freeze the account'}
        lede="Destructive and owner-only, so it gets an explicit confirm step."
      >
        <Card tone="alert">
          <Rule>
            {confirm === 'revoke'
              ? "The application will lose access to this house's memory immediately."
              : frozen
                ? 'Decryption will be restored for the owner and every delegate.'
                : 'Decryption will be denied to everyone — including you.'}
          </Rule>
          <Meta>
            {confirm === 'revoke'
              ? `The rotation counter moves from ${counter} to ${counter + 1}. Memories already written under ${counter} stay readable with the older key; retracting those would need re-encryption.`
              : 'Reversible, unless an AdminCap quarantine is active.'}
          </Meta>
          <div className="mt-3 flex gap-2">
            <B danger onClick={confirm === 'revoke' ? revoke : freeze}>Yes, {confirm} it</B>
            <B ghost onClick={() => setConfirm(null)}>Cancel</B>
          </div>
        </Card>
      </Page>
    );
  }

  return (
    <Page title="Keys" lede="Two keys in the whole system. Owner-only surface.">
      <Kpi items={[
        ['Rotation counter', String(counter)],
        ['Delegate', delegate ? 'active' : 'revoked', delegate ? 'text-utility-success-700' : 'text-text-error-primary'],
        ['Account', frozen ? 'frozen' : 'active', frozen ? 'text-text-error-primary' : 'text-utility-success-700'],
      ]} />

      <Card>
        <div className="flex items-start justify-between gap-3.5">
          <Rule>owner · house</Rule><Badge tone="success">owner</Badge>
        </div>
        <Meta>
          held in the admin&apos;s browser, shown once, never sent to our server
          <br />
          used for: create · register delegate · revoke · freeze
        </Meta>
      </Card>

      <Card>
        <div className="flex items-start justify-between gap-3.5">
          <Rule>house · server</Rule>
          <Badge tone={delegate ? 'brand' : 'error'}>{delegate ? 'delegate' : 'revoked'}</Badge>
        </div>
        <Meta>held in the server environment<br />used for: all memory reads and writes</Meta>
        <div className="mt-3">
          {delegate
            ? <B danger onClick={() => setConfirm('revoke')}>Revoke</B>
            : <B onClick={() => { setDelegate(true); add(`addDelegateKey — new 'house · server' registered under counter ${counter}, writes resume`); }}>Register a new delegate</B>}
        </div>
      </Card>

      <Card>
        <div className="flex items-start justify-between gap-3.5">
          <div>
            <Rule>{frozen ? 'Account is frozen' : 'Emergency freeze'}</Rule>
            <Meta>Denies Seal decryption to everyone, the owner included. The kill switch.</Meta>
          </div>
          <Badge tone={frozen ? 'error' : 'gray'}>{frozen ? 'frozen' : 'available'}</Badge>
        </div>
        <div className="mt-3"><B danger={!frozen} onClick={() => setConfirm('freeze')}>{frozen ? 'Reactivate' : 'Freeze'}</B></div>
      </Card>

      <Card>
        <Meta>Try writing a memory in the current key state.</Meta>
        <div className="mt-3"><B onClick={write}>remember()</B></div>
      </Card>

      {log.length > 0 && <Card>{log.map((l, i) => <Meta key={`${i}-${l}`}>{l}</Meta>)}</Card>}

      <Card tone="note">
        <Meta>
          Revoking the delegate bumps the rotation counter and the application loses access to the
          house&apos;s own memory — and cannot stop it. The two actions have different blast radii:
          a revoke locks out the app while the owner can still decrypt; a freeze locks out everyone.
        </Meta>
      </Card>
    </Page>
  );
}

function B({ children, onClick, ghost, danger }: { children: React.ReactNode; onClick: () => void; ghost?: boolean; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick}
      className={`rounded-lg px-3.5 py-2 text-[13px] ${
        ghost ? 'border-border-primary text-text-tertiary border'
        : danger ? 'bg-utility-warning-700 text-bg-primary font-semibold'
        : 'bg-bg-brand-solid text-text-primary-on-brand font-semibold'}`}>
      {children}
    </button>
  );
}
