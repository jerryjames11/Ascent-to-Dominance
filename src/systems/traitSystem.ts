// Trait earning — Sec 17. Checks real career-stat thresholds against the catalog and awards
// newly-qualified traits. Threshold traits go through evaluateNewTraits(); one-off traits
// triggered by a discrete event (Broken Promise, Kept Faith, Clean Hands) are awarded directly
// via awardTrait() at their trigger site in the store.
import type { ProfileState } from "../types/player";

export function awardTrait(profile: ProfileState, traitId: string): boolean {
  if (profile.earnedTraitIds.includes(traitId)) return false;
  profile.earnedTraitIds.push(traitId);
  return true;
}

/** Mutates profile.earnedTraitIds in place; returns the trait ids newly earned this call so the
 *  caller can log timeline entries for them. */
export function evaluateNewTraits(profile: ProfileState): string[] {
  const s = profile.careerStats;
  const newly: string[] = [];
  const maybe = (id: string, condition: boolean) => {
    if (condition && awardTrait(profile, id)) newly.push(id);
  };

  maybe("debate-killer", s.debateWins >= 3);
  maybe("natural-fundraiser", s.bigFundraisingHauls >= 3);
  maybe("ground-game-master", s.highTurnoutWins >= 2);
  maybe("gaffe-prone", s.gaffeEvents >= 3);
  maybe("media-darling", s.endorsementsSecured >= 3);
  maybe("attack-dog", s.negativeCampaignWins >= 1);
  maybe("coalition-builder", s.bipartisanBillsPassed >= 5);
  maybe("maverick", s.crossPartyHeavyBillsPassed >= 3);
  maybe(
    "party-loyalist",
    s.sponsoredBillsTotal >= 5 && s.crossPartyHeavyBillsPassed === 0 && s.bipartisanBillsPassed <= s.sponsoredBillsTotal * 0.2
  );
  maybe("legislative-workhorse", s.sponsoredBillsTotal >= 10);
  maybe("scandal-scarred", s.scandalEvents >= 2);
  maybe("untouchable", s.highCorruptionStreakWeeks >= 20);

  return newly;
}
