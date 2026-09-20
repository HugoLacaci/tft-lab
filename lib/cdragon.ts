/**
 * CommunityDragon asset URL helper. This is the ONLY place in the codebase
 * that builds a CDragon URL. See docs/cdragon-schema.md for the rules.
 *
 * In-game paths look like:
 *   /lol-game-data/assets/ASSETS/Characters/TFT18_Ivern/HUD/TFT18_Ivern_Square.TFT_Set18.dds
 *   assets/characters/tft18_sentinel/tft18_sentinel_square.tex
 *   assets/ux/traiticons/trait_icon_18_elderwood.tex
 *
 * Rules: lowercase everything, strip a leading "/lol-game-data/assets/" prefix,
 * swap a trailing .dds/.tex for .png, prefix with the CDragon game root.
 */
export const CDRAGON_ROOT = "https://raw.communitydragon.org/latest";
export const CDRAGON_GAME = `${CDRAGON_ROOT}/game/`;
export const CDRAGON_TFT_JSON = `${CDRAGON_ROOT}/cdragon/tft/en_us.json`;
export const CDRAGON_METADATA = `${CDRAGON_ROOT}/content-metadata.json`;

export function cdragonAsset(path: string): string {
  if (!path || path === "None") {
    throw new Error(`cdragonAsset: empty or placeholder path "${path}"`);
  }
  let p = path.trim().toLowerCase().replace(/\\/g, "/");
  p = p.replace(/^\/?lol-game-data\/assets\//, "");
  p = p.replace(/^\//, "");
  p = p.replace(/\.(dds|tex)$/i, ".png");
  if (!p.endsWith(".png")) p = `${p}.png`;
  return CDRAGON_GAME + p;
}

/** Stable local filename for a mirrored asset: keep the basename, force .png. */
export function localAssetName(path: string): string {
  const url = cdragonAsset(path);
  const base = url.slice(url.lastIndexOf("/") + 1);
  return base.replace(/[^a-z0-9._-]/g, "_");
}
