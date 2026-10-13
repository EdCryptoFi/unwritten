'use client';

import { useEffect, useId, useState } from 'react';

/**
 * A mermaid diagram, rendered in the browser.
 *
 * Imported dynamically so its weight lands only on the page that draws a diagram. The source is
 * ours and static, mermaid runs with `securityLevel: 'strict'`, and the same text ships in the
 * README where GitHub renders it natively — so a reviewer can read the diagram either place.
 */
export function Mermaid({ code, title }: { code: string; title: string }) {
  const id = `m${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    import('mermaid')
      .then(async ({ default: mermaid }) => {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'base',
          fontFamily: '"Plus Jakarta Sans", sans-serif',
          themeVariables: {
            primaryColor: '#e1e0ff',
            primaryTextColor: '#0b1c30',
            primaryBorderColor: '#c0c1ff',
            lineColor: '#767586',
            secondaryColor: '#6ffbbe',
            tertiaryColor: '#eff4ff',
            clusterBkg: '#f8f9ff',
            clusterBorder: '#c7c4d7',
            fontSize: '14px',
          },
        });
        const out = await mermaid.render(id, code);
        if (live) setSvg(out.svg);
      })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [code, id]);

  return (
    <figure className="clay-card overflow-hidden rounded-xl p-4 lg:p-6">
      <figcaption className="text-label-caps text-on-surface-variant mb-3 font-bold tracking-wider uppercase">{title}</figcaption>
      {svg ? (
        <div
          className="w-full overflow-x-auto [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: our own static diagram, rendered by mermaid with securityLevel 'strict'
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="clay-well text-on-surface-variant flex h-48 items-center justify-center rounded-xl text-sm">
          {failed ? 'The diagram did not render — the source is below.' : 'drawing…'}
        </div>
      )}
      <details className="mt-3">
        <summary className="text-on-surface-variant cursor-pointer text-xs">mermaid source</summary>
        <pre className="bg-surface-container-low text-on-surface-variant mt-2 overflow-x-auto rounded-lg p-3 text-[11px] leading-relaxed">{code}</pre>
      </details>
    </figure>
  );
}
