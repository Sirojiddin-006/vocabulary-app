import "dotenv/config";
import * as db from "../server/db";

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

function buildUnitWords(unit: number) {
  return Array.from({ length: 20 }, (_, index) => {
    const wordNo = index + 1;
    const english = `essential_u${unit}_w${wordNo}`;
    return {
      english,
      uzbek: `muhim so'z ${unit}-${wordNo}`,
      description: `Essential Words 4000, Unit ${unit}, item ${wordNo} explanation.`,
      example: `Unit ${unit} example ${wordNo}: We use '${english}' in context.`,
    };
  });
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

  const globalFolders = await db.getAllFolders();

  for (let unit = 1; unit <= 20; unit += 1) {
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
    const requiredWords = buildUnitWords(unit);
    const wordsToAdd = requiredWords.filter(
      item => !currentWords.some(existing => existing.english.toLowerCase() === item.english)
    );

    if (wordsToAdd.length > 0) {
      await db.importWords(folderId, wordsToAdd, null);
    }
  }

  console.log("Essential Words 4000 (20 units x 20 words) seeded.");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
