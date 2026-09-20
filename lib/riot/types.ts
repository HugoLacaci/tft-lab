/** The slice of the Riot TFT API we read. Field names are Riot's. */

export type Platform = "euw1" | "eun1" | "na1" | "br1" | "la1" | "la2" | "oc1" | "kr" | "jp1" | "tr1" | "ru" | "ph2" | "sg2" | "th2" | "tw2" | "vn2" | "me1";
export type Region = "americas" | "europe" | "asia" | "sea";

export const PLATFORMS: { id: Platform; label: string; region: Region }[] = [
  { id: "euw1", label: "EUW", region: "europe" },
  { id: "eun1", label: "EUNE", region: "europe" },
  { id: "na1", label: "NA", region: "americas" },
  { id: "br1", label: "BR", region: "americas" },
  { id: "la1", label: "LAN", region: "americas" },
  { id: "la2", label: "LAS", region: "americas" },
  { id: "kr", label: "KR", region: "asia" },
  { id: "jp1", label: "JP", region: "asia" },
  { id: "oc1", label: "OCE", region: "sea" },
  { id: "tr1", label: "TR", region: "europe" },
  { id: "ru", label: "RU", region: "europe" },
  { id: "me1", label: "ME", region: "europe" },
  { id: "ph2", label: "PH", region: "sea" },
  { id: "sg2", label: "SG", region: "sea" },
  { id: "th2", label: "TH", region: "sea" },
  { id: "tw2", label: "TW", region: "sea" },
  { id: "vn2", label: "VN", region: "sea" },
];

export interface AccountDto {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export interface SummonerDto {
  puuid: string;
  profileIconId: number;
  summonerLevel: number;
}

export interface LeagueEntryDto {
  queueType: string; // RANKED_TFT, RANKED_TFT_TURBO, RANKED_TFT_DOUBLE_UP
  tier?: string;
  rank?: string;
  leaguePoints?: number;
  wins?: number;
  losses?: number;
  ratedTier?: string;
  ratedRating?: number;
}

export interface MatchTraitDto {
  name: string;
  num_units: number;
  style: number; // 0 none, 1 bronze, 2 silver, 3 gold, 4 prismatic (Riot's scale)
  tier_current: number;
  tier_total: number;
}

export interface MatchUnitDto {
  character_id: string;
  itemNames?: string[];
  name?: string;
  rarity: number;
  tier: number; // star level
}

export interface ParticipantDto {
  puuid: string;
  placement: number;
  level: number;
  last_round: number;
  gold_left: number;
  players_eliminated: number;
  time_eliminated: number;
  total_damage_to_players: number;
  traits: MatchTraitDto[];
  units: MatchUnitDto[];
  augments?: string[];
  riotIdGameName?: string;
  riotIdTagline?: string;
  win?: boolean;
  partner_group_id?: number;
}

export interface MatchDto {
  metadata: { match_id: string; participants: string[] };
  info: {
    game_datetime: number;
    game_length: number;
    game_version?: string;
    queue_id?: number;
    queueId?: number;
    tft_game_type?: string;
    tft_set_number?: number;
    tft_set_core_name?: string;
    participants: ParticipantDto[];
  };
}

/** Ranked-TFT queue ids (info.queue_id). */
export const QUEUES: Record<number, string> = {
  1090: "Normal",
  1100: "Ranked",
  1130: "Hyper Roll",
  1160: "Double Up",
  1170: "Fortune's Favor",
  1180: "Soul Brawl",
  1190: "Choncc's Treasure",
  6120: "Tocker's Trials",
};
