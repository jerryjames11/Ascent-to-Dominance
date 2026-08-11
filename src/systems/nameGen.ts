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
  SA: {
    first: ["Khalid", "Fahad", "Turki", "Noura", "Bandar", "Reema", "Saud", "Mishal", "Abdulaziz", "Haifa"],
    last: ["Al-Rashid", "Al-Otaibi", "Al-Harbi", "Al-Qahtani", "Al-Dossari", "Al-Shammari", "Al-Zahrani", "Al-Mutairi", "Al-Ghamdi", "Al-Subaie"],
  },
  CN: {
    first: ["Wei", "Jun", "Li", "Xin", "Hui", "Yan", "Cheng", "Mei", "Bo", "Lan"],
    last: ["Zhang", "Wang", "Chen", "Liu", "Zhao", "Sun", "Zhou", "Wu", "Xu", "Feng"],
  },
  BR: {
    first: ["Carlos", "Ana", "Rafael", "Beatriz", "Lucas", "Juliana", "Paulo", "Fernanda", "Diego", "Camila"],
    last: ["Silva", "Oliveira", "Santos", "Pereira", "Costa", "Almeida", "Nascimento", "Carvalho", "Araujo", "Ribeiro"],
  },
  IN: {
    first: ["Rajesh", "Priya", "Arjun", "Ananya", "Vikram", "Kavita", "Sanjay", "Meera", "Rohan", "Divya"],
    last: ["Sharma", "Patel", "Reddy", "Iyer", "Gupta", "Nair", "Rao", "Verma", "Krishnan", "Mehta"],
  },
  NG: {
    first: ["Chidi", "Ngozi", "Emeka", "Amara", "Tunde", "Folake", "Ibrahim", "Aisha", "Yusuf", "Chioma"],
    last: ["Okafor", "Adeyemi", "Balogun", "Eze", "Abubakar", "Nwosu", "Okonkwo", "Bello", "Ogunleye", "Musa"],
  },
  MX: {
    first: ["Miguel", "Sofia", "Alejandro", "Valentina", "Diego", "Ximena", "Fernando", "Regina", "Emilio", "Daniela"],
    last: ["Hernandez", "Garcia", "Martinez", "Lopez", "Gonzalez", "Ramirez", "Torres", "Flores", "Vazquez", "Cruz"],
  },
  KR: {
    first: ["Min-jun", "Seo-yeon", "Ji-hoon", "Ha-eun", "Dong-hyun", "Yoo-jin", "Sung-min", "Eun-ji", "Tae-yang", "Soo-ah"],
    last: ["Kim", "Lee", "Park", "Choi", "Jung", "Kang", "Cho", "Yoon", "Jang", "Lim"],
  },
  ID: {
    first: ["Budi", "Siti", "Agus", "Dewi", "Eko", "Rina", "Hendra", "Wulan", "Fajar", "Putri"],
    last: ["Wijaya", "Santoso", "Kusuma", "Pratama", "Hidayat", "Setiawan", "Suryadi", "Wibowo", "Gunawan", "Halim"],
  },
  CA: {
    first: ["Liam", "Emma", "Noah", "Olivia", "Jacob", "Chloe", "Ethan", "Mia", "Gabriel", "Zoe"],
    last: ["Tremblay", "Roy", "Gagnon", "MacDonald", "Campbell", "Nguyen", "Singh", "Wilson", "Bouchard", "Leblanc"],
  },
  ES: {
    first: ["Javier", "Lucia", "Pablo", "Carmen", "Alvaro", "Marta", "Sergio", "Elena", "Diego", "Paula"],
    last: ["Garcia", "Fernandez", "Lopez", "Martinez", "Gonzalez", "Rodriguez", "Sanchez", "Perez", "Gomez", "Diaz"],
  },
  SE: {
    first: ["Erik", "Astrid", "Lars", "Ingrid", "Anders", "Elin", "Gustav", "Sara", "Nils", "Karin"],
    last: ["Andersson", "Johansson", "Karlsson", "Nilsson", "Eriksson", "Larsson", "Olsson", "Persson", "Svensson", "Gustafsson"],
  },
  PL: {
    first: ["Piotr", "Anna", "Krzysztof", "Katarzyna", "Tomasz", "Magdalena", "Andrzej", "Agnieszka", "Marek", "Ewa"],
    last: ["Kowalski", "Nowak", "Wisniewski", "Wojcik", "Kaminski", "Lewandowski", "Zielinski", "Szymanski", "Wozniak", "Kozlowski"],
  },
  VN: {
    first: ["Minh", "Linh", "Hoang", "Huong", "Duc", "Mai", "Tuan", "Lan", "Nam", "Thao"],
    last: ["Nguyen", "Tran", "Le", "Pham", "Hoang", "Vu", "Dang", "Bui", "Do", "Ho"],
  },
};

export function generateName(countryId: string, rng: Rng): string {
  const pool = NAME_POOLS[countryId] ?? NAME_POOLS.US;
  return `${rng.pick(pool.first)} ${rng.pick(pool.last)}`;
}
