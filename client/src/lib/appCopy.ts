import type { AppLocale } from "@/contexts/AppLocaleContext";

type CopyTree = {
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
  };
};

const copy: Record<AppLocale, CopyTree> = {
  en: {
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
    },
  },
  uz: {
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
    },
  },
};

export function getCopy(locale: AppLocale) {
  return copy[locale];
}
