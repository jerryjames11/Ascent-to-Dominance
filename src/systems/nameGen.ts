// Generated-politician name pools, per country flavor. Sec 20: never real named officials.
import { Rng } from "./rng";

const NAME_POOLS: Record<string, { first: string[]; last: string[] }> = {
  US: {
    first: ["James", "Maria", "Robert", "Linda", "Michael", "Patricia", "David", "Karen", "Marcus", "Angela", "Thomas", "Deborah"],
    last: ["Hendricks", "Alvarez", "Whitfield", "Okafor", "Bennett", "Reyes", "Callahan", "Petrov", "Lindqvist", "Marsh", "Delgado", "Cho"],
  },
  UK: {
    first: ["Oliver", "Charlotte", "George", "Emily", "Harry", "Sophie", "Jack", "Alice", "Edward", "Grace", "Nigel", "Fiona"],
    last: ["Ashworth", "Pemberton", "Hargreaves", "Whitmore", "Sinclair", "Fairweather", "Osei", "Chakrabarti", "Lowry", "Beaumont"],
  },
  FR: {
    first: ["Antoine", "Camille", "Julien", "Amelie", "Nicolas", "Sophie", "Mathieu", "Claire", "Karim", "Fatou"],
    last: ["Moreau", "Lambert", "Girard", "Fontaine", "Rousseau", "Benali", "Traore", "Dubreuil", "Marchand", "Colin"],
  },
  DE: {
    first: ["Lukas", "Anna", "Felix", "Petra", "Stefan", "Katharina", "Jan", "Ines", "Mehmet", "Zeynep"],
    last: ["Brandt", "Hoffmann", "Reinhardt", "Vogel", "Ackermann", "Yildiz", "Krauss", "Lindemann", "Feldman", "Schuster"],
  },
  JP: {
    first: ["Hiroshi", "Yuki", "Kenji", "Aiko", "Takashi", "Naomi", "Ryo", "Sakura", "Daichi", "Emi"],
    last: ["Tanaka", "Watanabe", "Kobayashi", "Yamashita", "Kimura", "Saito", "Nakagawa", "Fujimoto", "Ishikawa", "Ono"],
  },
};

export function generateName(countryId: string, rng: Rng): string {
  const pool = NAME_POOLS[countryId] ?? NAME_POOLS.US;
  return `${rng.pick(pool.first)} ${rng.pick(pool.last)}`;
}
