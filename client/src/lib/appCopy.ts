import type { AppLocale } from "@/contexts/AppLocaleContext";

type CopyTree = {
  common: {
    open: string;
    save: string;
    saved: string;
    back: string;
    words: string;
    units: string;
    known: string;
    loading: string;
    searchWords: string;
    notFound: string;
    of: string;
    active: string;
    errorTitle: string;
    errorMessage: string;
    errorRetry: string;
  };
  shell: {
    personal: string;
    global: string;
    profile: string;
    language: string;
    appearance: string;
    light: string;
    dark: string;
  };
  home: {
    eyebrow: string;
    title: string;
    welcome: string;
    folders: string;
    totalWords: string;
    known: string;
    unknown: string;
    progress: string;
    noFolders: string;
    createFolder: string;
    newFolder: string;
    dailyStreak: string;
    wordsToday: string;
    keepSimple: string;
    simpleText: string;
    signIn: string;
    createAccount: string;
    heroEyebrow: string;
    heroDescription: string;
    foldersTrend: string;
    foldersTrendEmpty: string;
    mastered: string;
    keepGoing: string;
    greatMomentum: string;
    wordsMastered: string;
    startWithFolder: string;
    addFirstFolder: string;
    noSavedBooks: string;
    defaultBookDescription: string;
    createNewFolder: string;
    folderNamePlaceholder: string;
    failedCreateFolder: string;
    bookFallback: string;
  };
  auth: {
    signInSubtitle: string;
    username: string;
    password: string;
    yourUsername: string;
    yourPassword: string;
    signingIn: string;
    createAnAccount: string;
    signUpSubtitle: string;
    name: string;
    yourName: string;
      emailOptional: string;
      emailPlaceholder: string;
      chooseUsername: string;
    createPassword: string;
    confirmPassword: string;
    repeatPassword: string;
    passwordMismatch: string;
    creatingAccount: string;
    alreadyHaveAccount: string;
  };
  global: {
    title: string;
    subtitle: string;
    overview: string;
    books: string;
    folders: string;
    totalWords: string;
    activeTopics: string;
    mostWords: string;
    searchPlaceholder: string;
    noWords: string;
    noBooks: string;
    noFolders: string;
    open: string;
    hide: string;
    units: string;
    words: string;
    failedSavedFolder: string;
    failedSavedBook: string;
    sortAZ: string;
    sortZA: string;
  };
  globalFolder: {
    folderNotFound: string;
    review: string;
    memorize: string;
    noWords: string;
    sortAZ: string;
    sortZA: string;
  };
  folder: {
    failedAddWord: string;
    wordUpdated: string;
    failedUpdateWord: string;
    wordsImported: string;
    failedImportWords: string;
    folderDeleted: string;
    failedDeleteFolder: string;
    savedFolderAdded: string;
    savedFolderRemoved: string;
    failedSavedFolder: string;
    unsaveFolder: string;
    deleteFolder: string;
    unsaveDescription: string;
    deleteDescription: string;
    bookReadOnly: string;
    personalCopyNote: string;
    folderNotFound: string;
    readOnly: string;
    personalCopy: string;
    addWord: string;
    bulkImport: string;
    editWord: string;
    addNewWord: string;
    englishWord: string;
    englishPlaceholder: string;
    uzbekTranslation: string;
    uzbekPlaceholder: string;
    descriptionOptional: string;
    descriptionPlaceholder: string;
    exampleOptional: string;
    examplePlaceholder: string;
    saveChanges: string;
    bulkImportTitle: string;
    bulkImportLabel: string;
    bulkImportPlaceholder: string;
    bulkImportHint: string;
    enterAtLeastOneWord: string;
    importWords: string;
  };
  review: {
    noWords: string;
    completed: string;
    completedBody: string;
    repeatAgain: string;
    title: string;
    directionEnglish: string;
    directionUzbek: string;
    directionMixed: string;
    directionEnglishToUzbek: string;
    directionUzbekToEnglish: string;
    progress: string;
    wordOf: string;
    showTranslation: string;
    dontKnow: string;
    iKnow: string;
  };
  memorize: {
    noWords: string;
    sessionComplete: string;
    correct: string;
    incorrect: string;
    removedFromKnown: string;
    stillUnknown: string;
    correctWords: string;
    incorrectWords: string;
    retryIncorrect: string;
    done: string;
    title: string;
    modeTest: string;
    modeType: string;
    directionEnglish: string;
    directionUzbek: string;
    directionMixed: string;
    directionEnglishToUzbek: string;
    directionUzbekToEnglish: string;
    hideStats: string;
    showStats: string;
    chooseCorrectAnswer: string;
    typeTranslation: string;
    typeAnswer: string;
    checkAnswer: string;
    answerCorrect: string;
    answerWrong: string;
    timeLeft: string;
    nextIn: string;
    tapToSkip: string;
  };
  bookUnits: {
    title: string;
    invalidBook: string;
    invalidBookId: string;
    loadingBook: string;
    bookNotFound: string;
    noUnits: string;
    unitLabel: string;
  };
  profile: {
    title: string;
    statistics: string;
    themeSettings: string;
    dayPalettes: string;
    nightPalettes: string;
    activeMode: string;
    account: string;
    globalProgress: string;
    edit: string;
    logout: string;
    deleteAccount: string;
    username: string;
    email: string;
    loginMethod: string;
    memberSince: string;
    total: string;
    totalWords: string;
    known: string;
    unknown: string;
    folders: string;
    updated: string;
    updateFailed: string;
    deleted: string;
    deleteFailed: string;
    editProfile: string;
    namePlaceholder: string;
    emailPlaceholder: string;
    emptyName: string;
    save: string;
    deleteConfirmTitle: string;
    deleteConfirmBody: string;
    delete: string;
    defaultName: string;
    defaultEmail: string;
    knownOfTotal: string;
  };
  notFound: {
    title: string;
    body: string;
    goHome: string;
  };
};

const copy: Record<AppLocale, CopyTree> = {
  en: {
    common: {
      open: "Open",
      save: "Save",
      saved: "Saved",
      back: "Back",
      words: "words",
      units: "units",
      known: "known",
      loading: "Loading",
      searchWords: "Search words...",
      notFound: "Not found",
      of: "of",
      active: "ACTIVE",
      errorTitle: "Something went wrong",
      errorMessage: "Please refresh the page.",
      errorRetry: "Try again",
    },
    shell: {
      personal: "Personal",
      global: "Global",
      profile: "Profile",
      language: "Language",
      appearance: "Appearance",
      light: "Day",
      dark: "Night",
    },
    home: {
      eyebrow: "Personal Space",
      title: "Your vocabulary",
      welcome: "Welcome back",
      folders: "Folders",
      totalWords: "Total Words",
      known: "Known",
      unknown: "Unknown",
      progress: "Learning progress",
      noFolders: "No folders yet. Create one to get started!",
      createFolder: "Create Folder",
      newFolder: "New Folder",
      dailyStreak: "Daily streak",
      wordsToday: "Words today",
      keepSimple: "Keep it simple",
      simpleText: "Focus on one topic at a time and memorize faster.",
      signIn: "Sign In",
      createAccount: "Create Account",
      heroEyebrow: "Vocabulary",
      heroDescription: "Learn words with folders, books, and measurable progress.",
      foldersTrend: "+2 this week",
      foldersTrendEmpty: "Start by creating one",
      mastered: "mastered",
      keepGoing: "Keep going",
      greatMomentum: "Great momentum",
      wordsMastered: "words mastered",
      startWithFolder: "Start with \"{name}\" folder.",
      addFirstFolder: "Add your first folder to begin.",
      noSavedBooks: "No saved books yet.",
      defaultBookDescription: "Foundational vocabulary collection.",
      createNewFolder: "Create New Folder",
      folderNamePlaceholder: "Folder name",
      failedCreateFolder: "Failed to create folder",
      bookFallback: "Book",
    },
    auth: {
      signInSubtitle: "Sign in to continue learning.",
      username: "Username",
      password: "Password",
      yourUsername: "Your username",
      yourPassword: "Your password",
      signingIn: "Signing in...",
      createAnAccount: "Create an account",
      signUpSubtitle: "Create your account.",
      name: "Name",
      yourName: "Your name",
      emailOptional: "Email (optional)",
      emailPlaceholder: "you@email.com",
      chooseUsername: "Choose a username",
      createPassword: "Create a password",
      confirmPassword: "Confirm Password",
      repeatPassword: "Repeat password",
      passwordMismatch: "Passwords do not match.",
      creatingAccount: "Creating account...",
      alreadyHaveAccount: "Already have an account? Sign in",
    },
    global: {
      title: "Global library",
      subtitle: "Shared folders, books, and units from everyone",
      overview: "Overview",
      books: "Books",
      folders: "Folders",
      totalWords: "Total Words",
      activeTopics: "Active Topics",
      mostWords: "Most words",
      searchPlaceholder: "Search folders or words...",
      noWords: "No words found.",
      noBooks: "No books available.",
      noFolders: "No folders found.",
      open: "Open",
      hide: "Hide",
      units: "units",
      words: "words",
      failedSavedFolder: "Failed to update saved folder",
      failedSavedBook: "Failed to update saved book",
      sortAZ: "A-Z",
      sortZA: "Z-A",
    },
    globalFolder: {
      folderNotFound: "Folder not found",
      review: "Review",
      memorize: "Memorize",
      noWords: "No words found.",
      sortAZ: "A - Z",
      sortZA: "Z - A",
    },
    folder: {
      failedAddWord: "Failed to add word",
      wordUpdated: "Word updated",
      failedUpdateWord: "Failed to update word",
      wordsImported: "Words imported successfully",
      failedImportWords: "Failed to import words",
      folderDeleted: "Folder deleted",
      failedDeleteFolder: "Failed to delete folder",
      savedFolderAdded: "Saved to personal folders",
      savedFolderRemoved: "Removed from personal folders",
      failedSavedFolder: "Failed to update saved folder",
      unsaveFolder: "Unsave Folder",
      deleteFolder: "Delete Folder",
      unsaveDescription: "This saved global folder will be removed from your personal folders.",
      deleteDescription: "This will permanently delete this folder and all words inside it. This action cannot be undone.",
      bookReadOnly: "Book units are read-only. Only admins can manage book words.",
      personalCopyNote: "This is your personal copy. Any edits here do not affect the global version.",
      folderNotFound: "Folder not found",
      readOnly: "Read only",
      personalCopy: "Personal copy",
      addWord: "Add Word",
      bulkImport: "Bulk Import",
      editWord: "Edit",
      addNewWord: "Add New Word",
      englishWord: "English Word",
      englishPlaceholder: "e.g., beautiful",
      uzbekTranslation: "Uzbek Translation",
      uzbekPlaceholder: "e.g., go'zal",
      descriptionOptional: "Description (Optional)",
      descriptionPlaceholder: "e.g., Used to describe something pleasant to look at.",
      exampleOptional: "Example (Optional)",
      examplePlaceholder: "e.g., She has a beautiful smile.",
      saveChanges: "Save Changes",
      bulkImportTitle: "Bulk Import Words",
      bulkImportLabel: "Enter words (one per line, format: English | Uzbek | Description | Example)",
      bulkImportPlaceholder: "beautiful | go'zal | pleasant to look at | She has a beautiful smile.",
      bulkImportHint: "Separate values with | (pipe). Description and Example are optional.",
      enterAtLeastOneWord: "Please enter at least one word",
      importWords: "Import Words",
    },
    review: {
      noWords: "No words in this folder",
      completed: "Review completed",
      completedBody: "Session finished.",
      repeatAgain: "Repeat Again",
      title: "Review",
      directionEnglish: "ENG",
      directionUzbek: "UZB",
      directionMixed: "Mix",
      directionEnglishToUzbek: "ENG -> UZB",
      directionUzbekToEnglish: "UZB -> ENG",
      progress: "Review progress",
      wordOf: "Word {current} of {total}",
      showTranslation: "Show translation",
      dontKnow: "Don't Know",
      iKnow: "I Know",
    },
    memorize: {
      noWords: "No words in this folder",
      sessionComplete: "Session Complete",
      correct: "Correct",
      incorrect: "Incorrect",
      removedFromKnown: "Removed from known",
      stillUnknown: "Still unknown",
      correctWords: "Correct words",
      incorrectWords: "Incorrect words",
      retryIncorrect: "Retry incorrect",
      done: "Done",
      title: "Memorize",
      modeTest: "Test",
      modeType: "Type",
      directionEnglish: "ENG",
      directionUzbek: "UZB",
      directionMixed: "Mix",
      directionEnglishToUzbek: "ENG -> UZB",
      directionUzbekToEnglish: "UZB -> ENG",
      hideStats: "Hide stats",
      showStats: "Show stats",
      chooseCorrectAnswer: "Choose the correct answer",
      typeTranslation: "Type the translation",
      typeAnswer: "Type your answer",
      checkAnswer: "Check Answer",
      answerCorrect: "Correct",
      answerWrong: "Wrong. Correct: {answer}",
      timeLeft: "Time left",
      nextIn: "Next in {countdown}...",
      tapToSkip: "(tap to skip)",
    },
    bookUnits: {
      title: "Book units",
      invalidBook: "Invalid book",
      invalidBookId: "Invalid book id.",
      loadingBook: "Loading book",
      bookNotFound: "Book not found.",
      noUnits: "No units found for this book.",
      unitLabel: "Unit",
    },
    profile: {
      title: "Profile",
      statistics: "Learning Statistics",
      themeSettings: "Theme Settings",
      dayPalettes: "Day Palettes",
      nightPalettes: "Night Palettes",
      activeMode: "Active mode",
      account: "Account",
      globalProgress: "Global Progress",
      edit: "Edit",
      logout: "Logout",
      deleteAccount: "Delete Account",
      username: "Username",
      email: "Email",
      loginMethod: "Login Method",
      memberSince: "Member Since",
      total: "Total",
      totalWords: "Total words",
      known: "Known",
      unknown: "Unknown",
      folders: "Folders",
      updated: "Profile updated",
      updateFailed: "Failed to update profile",
      deleted: "Account deleted",
      deleteFailed: "Failed to delete account",
      editProfile: "Edit Profile",
      namePlaceholder: "Name",
      emailPlaceholder: "Email",
      emptyName: "Name cannot be empty",
      save: "Save",
      deleteConfirmTitle: "Delete Account",
      deleteConfirmBody: "This action cannot be undone.",
      delete: "Delete",
      defaultName: "Admin",
      defaultEmail: "name@gmail.com",
      knownOfTotal: "Known / Total",
    },
    notFound: {
      title: "Page Not Found",
      body: "Sorry, the page you are looking for doesn't exist. It may have been moved or deleted.",
      goHome: "Go Home",
    },
  },
  uz: {
    common: {
      open: "Ochish",
      save: "Saqlash",
      saved: "Saqlangan",
      back: "Orqaga",
      words: "so'z",
      units: "unit",
      known: "bilinadi",
      loading: "Yuklanmoqda",
      searchWords: "So'zlarni qidiring...",
      notFound: "Topilmadi",
      of: "dan",
      active: "FAOL",
      errorTitle: "Xatolik yuz berdi",
      errorMessage: "Iltimos sahifani yangilang.",
      errorRetry: "Qaytadan urinib ko'ring",
    },
    shell: {
      personal: "Shaxsiy",
      global: "Global",
      profile: "Profil",
      language: "Til",
      appearance: "Ko'rinish",
      light: "Kunduz",
      dark: "Tungi",
    },
    home: {
      eyebrow: "Shaxsiy bo'lim",
      title: "Lug'atlaringiz",
      welcome: "Xush kelibsiz",
      folders: "Papkalar",
      totalWords: "Jami so'zlar",
      known: "Biladigan",
      unknown: "Bilmaydigan",
      progress: "O'rganish progressi",
      noFolders: "Hali papkalar yo'q. Boshlash uchun yangi papka yarating.",
      createFolder: "Papka yaratish",
      newFolder: "Yangi papka",
      dailyStreak: "Kunlik seriya",
      wordsToday: "Bugungi so'zlar",
      keepSimple: "Soddalashtiring",
      simpleText: "Bir mavzuga e'tibor qarating va tezroq yod oling.",
      signIn: "Kirish",
      createAccount: "Hisob yaratish",
      heroEyebrow: "Lug'at",
      heroDescription: "So'zlarni papkalar, kitoblar va o'lchanadigan progress bilan o'rganing.",
      foldersTrend: "+2 shu hafta",
      foldersTrendEmpty: "Avval bittasini yarating",
      mastered: "o'zlashtirilgan",
      keepGoing: "Davom eting",
      greatMomentum: "Yaxshi sur'at",
      wordsMastered: "so'z o'zlashtirilgan",
      startWithFolder: "\"{name}\" papkasidan boshlang.",
      addFirstFolder: "Boshlash uchun birinchi papkangizni qo'shing.",
      noSavedBooks: "Hali saqlangan kitoblar yo'q.",
      defaultBookDescription: "Asosiy lug'at to'plami.",
      createNewFolder: "Yangi papka yaratish",
      folderNamePlaceholder: "Papka nomi",
      failedCreateFolder: "Papkani yaratib bo'lmadi",
      bookFallback: "Kitob",
    },
    auth: {
      signInSubtitle: "O'rganishni davom ettirish uchun kiring.",
      username: "Username",
      password: "Parol",
      yourUsername: "Username kiriting",
      yourPassword: "Parolingiz",
      signingIn: "Kirilmoqda...",
      createAnAccount: "Hisob yarating",
      signUpSubtitle: "Hisobingizni yarating.",
      name: "Ism",
      yourName: "Ismingiz",
      emailOptional: "Email (ixtiyoriy)",
      emailPlaceholder: "you@email.com",
      chooseUsername: "Username tanlang",
      createPassword: "Parol yarating",
      confirmPassword: "Parolni tasdiqlang",
      repeatPassword: "Parolni takrorlang",
      passwordMismatch: "Parollar mos emas.",
      creatingAccount: "Hisob yaratilmoqda...",
      alreadyHaveAccount: "Hisobingiz bormi? Kiring",
    },
    global: {
      title: "Global kutubxona",
      subtitle: "Barcha foydalanuvchilardan umumiy papka, kitob va unitlar",
      overview: "Umumiy ko'rinish",
      books: "Kitoblar",
      folders: "Papkalar",
      totalWords: "Jami so'zlar",
      activeTopics: "Faol mavzular",
      mostWords: "Eng ko'p so'z",
      searchPlaceholder: "Papka yoki so'zni qidiring...",
      noWords: "So'z topilmadi.",
      noBooks: "Kitoblar mavjud emas.",
      noFolders: "Papkalar topilmadi.",
      open: "Ochish",
      hide: "Yopish",
      units: "unit",
      words: "so'z",
      failedSavedFolder: "Saqlangan papkani yangilab bo'lmadi",
      failedSavedBook: "Saqlangan kitobni yangilab bo'lmadi",
      sortAZ: "A-Z",
      sortZA: "Z-A",
    },
    globalFolder: {
      folderNotFound: "Papka topilmadi",
      review: "Takrorlash",
      memorize: "Yodlash",
      noWords: "So'z topilmadi.",
      sortAZ: "A - Z",
      sortZA: "Z - A",
    },
    folder: {
      failedAddWord: "So'zni qo'shib bo'lmadi",
      wordUpdated: "So'z yangilandi",
      failedUpdateWord: "So'zni yangilab bo'lmadi",
      wordsImported: "So'zlar muvaffaqiyatli import qilindi",
      failedImportWords: "So'zlarni import qilib bo'lmadi",
      folderDeleted: "Papka o'chirildi",
      failedDeleteFolder: "Papkani o'chirib bo'lmadi",
      savedFolderAdded: "Shaxsiy papkalarga saqlandi",
      savedFolderRemoved: "Shaxsiy papkalardan olib tashlandi",
      failedSavedFolder: "Saqlangan papkani yangilab bo'lmadi",
      unsaveFolder: "Papkani saqlashdan chiqarish",
      deleteFolder: "Papkani o'chirish",
      unsaveDescription: "Bu saqlangan global papka shaxsiy papkalaringizdan olib tashlanadi.",
      deleteDescription: "Bu amal papkani va uning ichidagi barcha so'zlarni butunlay o'chiradi. Bu amalni ortga qaytarib bo'lmaydi.",
      bookReadOnly: "Kitob unitlari faqat o'qish uchun. So'zlarni faqat admin boshqarishi mumkin.",
      personalCopyNote: "Bu sizning shaxsiy nusxangiz. Bu yerdagi o'zgarishlar global versiyaga ta'sir qilmaydi.",
      folderNotFound: "Papka topilmadi",
      readOnly: "Faqat o'qish",
      personalCopy: "Shaxsiy nusxa",
      addWord: "So'z qo'shish",
      bulkImport: "Ommaviy import",
      editWord: "Tahrirlash",
      addNewWord: "Yangi so'z qo'shish",
      englishWord: "Inglizcha so'z",
      englishPlaceholder: "masalan, beautiful",
      uzbekTranslation: "O'zbekcha tarjima",
      uzbekPlaceholder: "masalan, go'zal",
      descriptionOptional: "Tavsif (ixtiyoriy)",
      descriptionPlaceholder: "masalan, Ko'rinishga yoqimli narsani tasvirlash uchun ishlatiladi.",
      exampleOptional: "Misol (ixtiyoriy)",
      examplePlaceholder: "masalan, She has a beautiful smile.",
      saveChanges: "O'zgarishlarni saqlash",
      bulkImportTitle: "So'zlarni ommaviy import qilish",
      bulkImportLabel: "So'zlarni kiriting (har qatorda bittadan, format: English | Uzbek | Description | Example)",
      bulkImportPlaceholder: "beautiful | go'zal | pleasant to look at | She has a beautiful smile.",
      bulkImportHint: "Qiymatlarni | belgisi bilan ajrating. Tavsif va misol ixtiyoriy.",
      enterAtLeastOneWord: "Kamida bitta so'z kiriting",
      importWords: "So'zlarni import qilish",
    },
    review: {
      noWords: "Bu papkada so'zlar yo'q",
      completed: "Takrorlash yakunlandi",
      completedBody: "Sessiya yakunlandi.",
      repeatAgain: "Yana takrorlash",
      title: "Takrorlash",
      directionEnglish: "ENG",
      directionUzbek: "UZB",
      directionMixed: "Aralash",
      directionEnglishToUzbek: "ENG -> UZB",
      directionUzbekToEnglish: "UZB -> ENG",
      progress: "Takrorlash progressi",
      wordOf: "{total} tadan {current}-so'z",
      showTranslation: "Tarjimani ko'rsatish",
      dontKnow: "Bilmayman",
      iKnow: "Bilaman",
    },
    memorize: {
      noWords: "Bu papkada so'zlar yo'q",
      sessionComplete: "Sessiya yakunlandi",
      correct: "To'g'ri",
      incorrect: "Noto'g'ri",
      removedFromKnown: "Bilinadiganlardan olindi",
      stillUnknown: "Hali noma'lum",
      correctWords: "To'g'ri so'zlar",
      incorrectWords: "Noto'g'ri so'zlar",
      retryIncorrect: "Noto'g'rilarni qayta ishlash",
      done: "Tugatish",
      title: "Yodlash",
      modeTest: "Test",
      modeType: "Yozish",
      directionEnglish: "ENG",
      directionUzbek: "UZB",
      directionMixed: "Aralash",
      directionEnglishToUzbek: "ENG -> UZB",
      directionUzbekToEnglish: "UZB -> ENG",
      hideStats: "Statistikani yashirish",
      showStats: "Statistikani ko'rsatish",
      chooseCorrectAnswer: "To'g'ri javobni tanlang",
      typeTranslation: "Tarjimani yozing",
      typeAnswer: "Javobingizni yozing",
      checkAnswer: "Javobni tekshirish",
      answerCorrect: "To'g'ri",
      answerWrong: "Noto'g'ri. To'g'ri javob: {answer}",
      timeLeft: "Qolgan vaqt",
      nextIn: "Keyingisi {countdown} soniyadan so'ng...",
      tapToSkip: "(o'tkazish uchun bosing)",
    },
    bookUnits: {
      title: "Kitob unitlari",
      invalidBook: "Noto'g'ri kitob",
      invalidBookId: "Kitob identifikatori noto'g'ri.",
      loadingBook: "Kitob yuklanmoqda",
      bookNotFound: "Kitob topilmadi.",
      noUnits: "Bu kitob uchun unitlar topilmadi.",
      unitLabel: "Unit",
    },
    profile: {
      title: "Profil",
      statistics: "O'rganish statistikasi",
      themeSettings: "Tema sozlamalari",
      dayPalettes: "Kunduzgi to'plamlar",
      nightPalettes: "Tungi to'plamlar",
      activeMode: "Faol rejim",
      account: "Hisob",
      globalProgress: "Global progress",
      edit: "Tahrirlash",
      logout: "Chiqish",
      deleteAccount: "Hisobni o'chirish",
      username: "Username",
      email: "Email",
      loginMethod: "Kirish usuli",
      memberSince: "Qo'shilgan sana",
      total: "Jami",
      totalWords: "Barcha so'zlar",
      known: "Yodlangan",
      unknown: "Yodlanmagan",
      folders: "Papkalar",
      updated: "Profil yangilandi",
      updateFailed: "Profilni yangilab bo'lmadi",
      deleted: "Hisob o'chirildi",
      deleteFailed: "Hisobni o'chirib bo'lmadi",
      editProfile: "Profilni tahrirlash",
      namePlaceholder: "Ism",
      emailPlaceholder: "Email",
      emptyName: "Ism bo'sh bo'lishi mumkin emas",
      save: "Saqlash",
      deleteConfirmTitle: "Hisobni o'chirish",
      deleteConfirmBody: "Bu amalni ortga qaytarib bo'lmaydi.",
      delete: "O'chirish",
      defaultName: "Admin",
      defaultEmail: "name@gmail.com",
      knownOfTotal: "Bilinadigan / Jami",
    },
    notFound: {
      title: "Sahifa topilmadi",
      body: "Kechirasiz, qidirayotgan sahifa mavjud emas. U ko'chirilgan yoki o'chirilgan bo'lishi mumkin.",
      goHome: "Bosh sahifa",
    },
  },
};

export function getCopy(locale: AppLocale) {
  return copy[locale];
}
