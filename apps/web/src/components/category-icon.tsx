import type { Category } from '@unwritten/fixtures';

/* Four categories have a claymorphism illustration from templates/; the rest fall back to a
   Material Symbol on a tinted disc, so every category in CATEGORIES renders something. Plain
   <img>, never next/image — keeps `sharp` out of the deploy's reachable surface. */
const ART: Partial<Record<Category, string>> = {
  groceries: '/design/icon-groceries.webp',
  fastfood: '/design/icon-fastfood.webp',
  games: '/design/icon-games.webp',
  subscriptions: '/design/icon-subscriptions.webp',
};

const GLYPH: Record<Category, string> = {
  groceries: 'shopping_bag',
  fastfood: 'local_pizza',
  games: 'sports_esports',
  subscriptions: 'event_repeat',
  pets: 'pets',
  household: 'home_repair_service',
  unclassified: 'help',
};

export const CATEGORY_LABEL: Record<Category, string> = {
  groceries: 'Groceries',
  fastfood: 'Fast food',
  games: 'Games',
  subscriptions: 'Subscriptions',
  pets: 'Pets',
  household: 'Household',
  unclassified: 'Unclassified',
};

export function CategoryIcon({ category, size = 40 }: { category: Category; size?: number }) {
  const art = ART[category];
  if (art) {
    return (
      // plain <img>, not next/image — next/image would invoke sharp
      <img src={art} alt="" width={size} height={size} className="shrink-0 object-contain" style={{ width: size, height: size }} />
    );
  }
  return (
    <span
      className="bg-surface-container text-primary flex shrink-0 items-center justify-center rounded-full shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)]"
      style={{ width: size, height: size }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: Math.round(size * 0.5) }}>
        {GLYPH[category]}
      </span>
    </span>
  );
}
