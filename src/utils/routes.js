/** @param {{ slug: string, isHome?: boolean }} matchup */
export const matchupHref = (matchup) => (matchup.isHome ? '/' : `/${matchup.slug}/`);
