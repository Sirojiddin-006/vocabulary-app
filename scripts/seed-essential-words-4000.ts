import "dotenv/config";
import { readFile } from "node:fs/promises";
import { eq, inArray } from "drizzle-orm";
import * as db from "../server/db";
import { userProgress, words } from "../drizzle/schema";

const BOOK_TITLE = "Essential Words 4000";
const BOOK_DESCRIPTION =
  "Foundational vocabulary book organized by units with core words and examples.";

const UNIT_TOPICS = [
  "Daily Life",
  "People & Character",
  "Education",
  "Work & Career",
  "Business Basics",
  "Travel",
  "Transportation",
  "Health",
  "Food & Nutrition",
  "Technology",
  "Communication",
  "Environment",
  "Government & Law",
  "Science",
  "Culture",
  "Economics",
  "Media",
  "Society",
  "Problem Solving",
  "Academic Vocabulary",
];

const BOOK_SOURCE_PATH = new URL("../book.txt", import.meta.url);

type ParsedWord = {
  english: string;
  uzbek: string;
  description: string | null;
  example: string | null;
};

function parseBookText(text: string) {
  const units = new Map<number, ParsedWord[]>();
  const lines = text.split(/\r?\n/).map(line => line.trim());
  const unitHeader = /Book\s+(\d+)\s*\|\s*Unit\s+(\d+)/i;
  const wordLine = /^⚡️\/(.+?)\s*—\s*(.+)$/;

  let currentUnit: number | null = null;
  let pendingWord: ParsedWord | null = null;

  const pushPending = () => {
    if (!pendingWord || currentUnit === null) return;
    const list = units.get(currentUnit) ?? [];
    list.push(pendingWord);
    units.set(currentUnit, list);
    pendingWord = null;
  };

  for (const rawLine of lines) {
    if (!rawLine) continue;

    const headerMatch = rawLine.match(unitHeader);
    if (headerMatch) {
      pushPending();
      currentUnit = Number(headerMatch[2]);
      if (!units.has(currentUnit)) units.set(currentUnit, []);
      continue;
    }

    const wordMatch = rawLine.match(wordLine);
    if (wordMatch) {
      pushPending();
      const english = wordMatch[1].trim();
      const uzbek = wordMatch[2].trim();
      pendingWord = { english, uzbek, description: null, example: null };
      continue;
    }

    if (rawLine.startsWith("— ") && pendingWord) {
      pendingWord.description = rawLine.replace(/^—\s*/, "").trim() || null;
      pushPending();
    }
  }

  pushPending();

  return units;
}

async function main() {
  const globalBooks = await db.getGlobalBooks();
  const existingBook = globalBooks.find(book => book.title === BOOK_TITLE);

  let bookId: number;
  if (existingBook) {
    bookId = existingBook.id;
  } else {
    await db.createBook(BOOK_TITLE, BOOK_DESCRIPTION, null);
    const refreshedBooks = await db.getGlobalBooks();
    const createdBook = refreshedBooks.find(book => book.title === BOOK_TITLE);
    bookId = createdBook?.id ?? 0;
  }

  if (!bookId) {
    throw new Error("Failed to resolve book id for Essential Words 4000");
  }

  const bookText = await readFile(BOOK_SOURCE_PATH, "utf-8");
  const parsedUnits = parseBookText(bookText);
  if (parsedUnits.size === 0) {
    throw new Error("No units parsed from book.txt");
  }

  const globalFolders = await db.getAllFolders();
  const database = await db.getDb();

  const unitNumbers = Array.from(parsedUnits.keys()).sort((a, b) => a - b);
  const maxUnit = unitNumbers[unitNumbers.length - 1];

  for (let unit = 1; unit <= maxUnit; unit += 1) {
    const requiredWords = parsedUnits.get(unit);
    if (!requiredWords || requiredWords.length === 0) {
      throw new Error(`Missing words for unit ${unit} in book.txt`);
    }

    const folderName = `${BOOK_TITLE} - Unit ${unit}`;
    const unitTopic = UNIT_TOPICS[unit - 1] || `Unit ${unit}`;

    const existingFolder = globalFolders.find(
      folder => folder.bookId === bookId && folder.unitNumber === unit
    );

    let folderId: number;
    if (existingFolder) {
      folderId = existingFolder.id;
    } else {
      await db.createFolder(
        folderName,
        `${unitTopic} vocabulary`,
        null,
        { bookId, unitNumber: unit }
      );
      const refreshedFolders = await db.getAllFolders();
      const createdFolder = refreshedFolders.find(
        folder => folder.bookId === bookId && folder.unitNumber === unit
      );
      folderId = createdFolder?.id ?? 0;
    }

    if (!folderId) {
      throw new Error(`Failed to create or resolve folder for unit ${unit}`);
    }

    const currentWords = await db.getGlobalWordsByFolderId(folderId);
    if (currentWords.length > 0) {
      const wordIds = currentWords.map(word => word.id);
      await database.delete(userProgress).where(inArray(userProgress.wordId, wordIds));
      await database.delete(words).where(eq(words.folderId, folderId));
    }

    await db.importWords(folderId, requiredWords, null);
  }

  console.log(
    `Essential Words 4000 seeded from book.txt (${unitNumbers.length} units, ${unitNumbers.reduce((sum, unit) => sum + (parsedUnits.get(unit)?.length ?? 0), 0)} words).`
  );
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
