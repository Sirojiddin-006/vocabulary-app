import "dotenv/config";
import * as db from "../server/db";

const TOPICS: Array<{
  folder: string;
  description: string;
  words: Array<{ english: string; uzbek: string; example?: string }>;
}> = [
  {
    folder: "Food & Drinks",
    description: "Common food and beverage vocabulary",
    words: [
      { english: "apple", uzbek: "olma" },
      { english: "bread", uzbek: "non" },
      { english: "cheese", uzbek: "pishloq" },
      { english: "rice", uzbek: "guruch" },
      { english: "meat", uzbek: "go'sht" },
      { english: "fish", uzbek: "baliq" },
      { english: "tea", uzbek: "choy" },
      { english: "coffee", uzbek: "qahva" },
      { english: "water", uzbek: "suv" },
      { english: "salt", uzbek: "tuz" },
      { english: "sugar", uzbek: "shakar" },
      { english: "milk", uzbek: "sut" },
      { english: "butter", uzbek: "sariyog'" },
      { english: "egg", uzbek: "tuxum" },
      { english: "soup", uzbek: "sho'rva" },
      { english: "salad", uzbek: "salat" },
      { english: "fruit", uzbek: "meva" },
      { english: "vegetable", uzbek: "sabzavot" },
      { english: "chicken", uzbek: "tovuq" },
      { english: "juice", uzbek: "sharbat" },
    ],
  },
  {
    folder: "Travel",
    description: "Travel and transportation basics",
    words: [
      { english: "airport", uzbek: "aeroport" },
      { english: "ticket", uzbek: "chipta" },
      { english: "passport", uzbek: "pasport" },
      { english: "hotel", uzbek: "mehmonxona" },
      { english: "reservation", uzbek: "bron" },
      { english: "luggage", uzbek: "yuk" },
      { english: "train", uzbek: "poezd" },
      { english: "bus", uzbek: "avtobus" },
      { english: "taxi", uzbek: "taksi" },
      { english: "subway", uzbek: "metro" },
      { english: "station", uzbek: "bekat" },
      { english: "map", uzbek: "xarita" },
      { english: "destination", uzbek: "manzil" },
      { english: "guide", uzbek: "gid" },
      { english: "tour", uzbek: "sayohat" },
      { english: "departure", uzbek: "jo'nash" },
      { english: "arrival", uzbek: "kelish" },
      { english: "delay", uzbek: "kechikish" },
      { english: "border", uzbek: "chegara" },
      { english: "currency", uzbek: "valyuta" },
    ],
  },
  {
    folder: "Technology",
    description: "Everyday tech words",
    words: [
      { english: "computer", uzbek: "kompyuter" },
      { english: "phone", uzbek: "telefon" },
      { english: "screen", uzbek: "ekran" },
      { english: "keyboard", uzbek: "klaviatura" },
      { english: "mouse", uzbek: "sichqoncha" },
      { english: "internet", uzbek: "internet" },
      { english: "website", uzbek: "veb-sayt" },
      { english: "password", uzbek: "parol" },
      { english: "email", uzbek: "elektron pochta" },
      { english: "download", uzbek: "yuklab olish" },
      { english: "upload", uzbek: "yuklash" },
      { english: "file", uzbek: "fayl" },
      { english: "folder", uzbek: "papka" },
      { english: "camera", uzbek: "kamera" },
      { english: "battery", uzbek: "batareya" },
      { english: "charger", uzbek: "quvvatlagich" },
      { english: "software", uzbek: "dasturiy ta'minot" },
      { english: "hardware", uzbek: "qurilma" },
      { english: "update", uzbek: "yangilash" },
      { english: "security", uzbek: "xavfsizlik" },
    ],
  },
  {
    folder: "Health",
    description: "Health and body vocabulary",
    words: [
      { english: "doctor", uzbek: "shifokor" },
      { english: "nurse", uzbek: "hamshira" },
      { english: "hospital", uzbek: "kasalxona" },
      { english: "medicine", uzbek: "dori" },
      { english: "pain", uzbek: "og'riq" },
      { english: "fever", uzbek: "isitma" },
      { english: "headache", uzbek: "bosh og'rig'i" },
      { english: "cough", uzbek: "yo'tal" },
      { english: "health", uzbek: "sog'liq" },
      { english: "exercise", uzbek: "mashq" },
      { english: "sleep", uzbek: "uyqu" },
      { english: "diet", uzbek: "parhez" },
      { english: "blood", uzbek: "qon" },
      { english: "heart", uzbek: "yurak" },
      { english: "stomach", uzbek: "oshqozon" },
      { english: "injury", uzbek: "jarohat" },
      { english: "appointment", uzbek: "qabul" },
      { english: "clinic", uzbek: "klinika" },
      { english: "vaccine", uzbek: "vaksina" },
      { english: "recovery", uzbek: "tiklanish" },
    ],
  },
  {
    folder: "Business",
    description: "Work and business basics",
    words: [
      { english: "company", uzbek: "kompaniya" },
      { english: "job", uzbek: "ish" },
      { english: "salary", uzbek: "maosh" },
      { english: "meeting", uzbek: "uchrashuv" },
      { english: "project", uzbek: "loyiha" },
      { english: "deadline", uzbek: "muddat" },
      { english: "contract", uzbek: "shartnoma" },
      { english: "client", uzbek: "mijoz" },
      { english: "invoice", uzbek: "hisob-faktura" },
      { english: "budget", uzbek: "byudjet" },
      { english: "profit", uzbek: "foyda" },
      { english: "loss", uzbek: "zarar" },
      { english: "market", uzbek: "bozor" },
      { english: "strategy", uzbek: "strategiya" },
      { english: "report", uzbek: "hisobot" },
      { english: "presentation", uzbek: "taqdimot" },
      { english: "manager", uzbek: "menejer" },
      { english: "employee", uzbek: "xodim" },
      { english: "goal", uzbek: "maqsad" },
      { english: "promotion", uzbek: "lavozim oshishi" },
    ],
  },
];

async function main() {
  for (const topic of TOPICS) {
    const existingFolders = await db.getAllFolders();
    const existing = existingFolders.find(f => f.name === topic.folder);

    let folderId: number;
    if (existing) {
      folderId = existing.id;
    } else {
      const created = await db.createFolder(topic.folder, topic.description, null);
      folderId = (created as any).insertId ?? (created as any).id ?? 0;
    }

    const existingWords = await db.getGlobalWordsByFolderId(folderId);
    if (existingWords.length >= topic.words.length) {
      continue;
    }

    const wordsToAdd = topic.words.filter(word =>
      !existingWords.some(existingWord =>
        existingWord.english.toLowerCase() === word.english.toLowerCase()
      )
    );

    if (wordsToAdd.length > 0) {
      await db.importWords(folderId, wordsToAdd, null);
    }
  }

  console.log("Global seed data ready.");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
