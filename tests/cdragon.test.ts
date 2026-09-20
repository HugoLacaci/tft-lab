import { describe, expect, it } from "vitest";
import { cdragonAsset, localAssetName } from "@/lib/cdragon";

// Five real paths pulled from en_us.json on 2026-09-20 (Set 18 build) plus the
// legacy /lol-game-data form from the spec. All of the CDragon URLs below were
// verified to return HTTP 200 image/png at the time of writing.
describe("cdragonAsset", () => {
  it("maps a champion tile icon", () => {
    expect(cdragonAsset("assets/characters/tft18_sentinel/tft18_sentinel_square.tex")).toBe(
      "https://raw.communitydragon.org/latest/game/assets/characters/tft18_sentinel/tft18_sentinel_square.png",
    );
  });
  it("maps a team-planner splash", () => {
    expect(
      cdragonAsset("assets/characters/tft18_sentinel/skins/base/images/t_18_sentinel_teamplannersplash.tex"),
    ).toBe(
      "https://raw.communitydragon.org/latest/game/assets/characters/tft18_sentinel/skins/base/images/t_18_sentinel_teamplannersplash.png",
    );
  });
  it("maps a trait icon", () => {
    expect(cdragonAsset("assets/ux/traiticons/trait_icon_18_elderwood.tex")).toBe(
      "https://raw.communitydragon.org/latest/game/assets/ux/traiticons/trait_icon_18_elderwood.png",
    );
  });
  it("maps an item icon", () => {
    expect(cdragonAsset("assets/maps/tft/icons/items/hexcore/tft_item_bfsword.tex")).toBe(
      "https://raw.communitydragon.org/latest/game/assets/maps/tft/icons/items/hexcore/tft_item_bfsword.png",
    );
  });
  it("maps an augment icon", () => {
    expect(cdragonAsset("assets/maps/tft/icons/augments/hexcore/branching-out-i.tex")).toBe(
      "https://raw.communitydragon.org/latest/game/assets/maps/tft/icons/augments/hexcore/branching-out-i.png",
    );
  });
  it("handles the /lol-game-data/assets/ + .dds form with mixed case", () => {
    expect(
      cdragonAsset("/lol-game-data/assets/ASSETS/Characters/TFT18_Ivern/HUD/TFT18_Ivern_Square.TFT_Set18.dds"),
    ).toBe(
      "https://raw.communitydragon.org/latest/game/assets/characters/tft18_ivern/hud/tft18_ivern_square.tft_set18.png",
    );
  });
  it("rejects the CDragon 'None' placeholder", () => {
    expect(() => cdragonAsset("None")).toThrow();
  });
  it("produces a safe local filename", () => {
    expect(localAssetName("assets/maps/tft/icons/augments/hexcore/caretaker_s-chosen-i.tex")).toBe(
      "caretaker_s-chosen-i.png",
    );
  });
});
