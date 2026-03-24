import { createContext, useContext, useState, ReactNode } from "react";

export type Language = "en" | "sv";

const translations = {
  en: {
    // Common
    loading: "Loading...",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    create: "Create",
    error: "Error",
    actions: "Actions",

    // Auth / Login
    loginTitle: "TalentTrack",
    loginSubtitle: "Sign in to manage your recruitment",
    emailLabel: "Email",
    emailPlaceholder: "you@email.com",
    passwordLabel: "Password",
    passwordPlaceholder: "••••••••",
    signIn: "Sign in",
    signingIn: "Signing in...",
    loginError: "Login error",
    signOut: "Sign out",

    // Sidebar
    pipeline: "Pipeline",
    jobs: "Jobs",
    candidates: "Candidates",
    manageAccounts: "Manage accounts",
    admin: "Admin",

    // Kanban
    kanbanTitle: "Pipeline",
    kanbanSubtitle: "Drag candidates between stages to update their status",
    searchCandidate: "Search candidate...",
    filterByJob: "Filter by job",
    allJobs: "All jobs",
    stageNew: "New",
    stageScreening: "Screening",
    stageInterview: "Interview",
    stageOffer: "Offer",
    stageHired: "Hired",
    stageRejected: "Rejected",

    // Jobs
    jobsTitle: "Jobs",
    jobsSubtitle: "Manage your job openings",
    newJob: "New job",
    editJob: "Edit job",
    createNewJob: "Create new job",
    jobTitle: "Title",
    jobTitlePlaceholder: "e.g. Frontend Developer",
    jobLocation: "Location",
    jobLocationPlaceholder: "e.g. Stockholm",
    jobDescription: "Description",
    jobDescriptionPlaceholder: "Describe the position...",
    jobStatus: "Status",
    statusOpen: "Open",
    statusDraft: "Draft",
    statusClosed: "Closed",
    saveChanges: "Save changes",
    createJob: "Create job",
    noJobsYet: "No jobs yet. Create your first job to get started!",
    jobUpdated: "Job updated",
    jobCreated: "Job created",

    // Candidates
    candidatesTitle: "Candidates",
    candidatesSubtitle: "Manage your candidate database",
    newCandidate: "New candidate",
    editCandidate: "Edit candidate",
    addCandidate: "Add candidate",
    nameLabel: "Name",
    namePlaceholder: "First Last",
    phoneLabel: "Phone",
    linkedinLabel: "LinkedIn URL",
    notesLabel: "Notes",
    notesPlaceholder: "Additional information...",
    add: "Add",
    assignToJob: "Assign to job",
    selectJob: "Select job",
    assign: "Assign",
    profile: "Profile",
    noCandidatesYet: "No candidates yet. Add your first candidate!",
    candidateUpdated: "Candidate updated",
    candidateCreated: "Candidate created",
    candidateAssigned: "Candidate assigned to job",
    alreadyAssigned: "Candidate is already assigned to this job",
    fillAllFields: "Fill in all fields",

    // Admin
    adminTitle: "Manage accounts",
    adminSubtitle: "Create new admin and customer accounts",
    createNewAccount: "Create new account",
    accountEmailConfirm: "The user will receive an email to confirm the account",
    roleLabel: "Role",
    roleCustomer: "Customer",
    roleAdmin: "Admin",
    createAccount: "Create account",
    creatingAccount: "Creating...",
    accountCreated: "Account created",
    accountCreatedDesc: (name: string, role: string) => `${name} (${role}) has been created`,
    existingUsers: "Existing users",
    existingUsersDesc: "View and manage all user accounts",
    userDeleted: "User deleted",
    confirmDeleteUser: "Delete user?",
    confirmDeleteUserDesc: (email: string) => `Are you sure you want to delete ${email}? This action cannot be undone.`,
    resetPassword: "Reset password",
    resetPasswordFor: (email: string) => `Reset password for ${email}`,
    changeRole: "Change role",
    changeRoleFor: (email: string) => `Change role for ${email}`,
    roleUpdated: "Role updated",
    noUsersFound: "No users found",

    // AI Assessment
    assessCandidate: "AI Assessment",
    assessing: "Assessing...",
    aiAssessment: "AI Assessment",
    assessmentFor: "Assessment for",
    close: "Close",
    noAssessmentData: "No data available for assessment. Add notes or LinkedIn URL to the candidate.",

    // Language
    language: "Language",
    english: "English",
    swedish: "Svenska",

    // Settings
    settings: "Settings",
    settingsTitle: "Settings",
    settingsSubtitle: "Manage your account and preferences",
    profileInfo: "Profile Information",
    profileInfoDesc: "Update your personal details",
    companyLabel: "Company",
    companyPlaceholder: "Your company name",
    emailCannotChange: "Email cannot be changed here",
    changePassword: "Change Password",
    changePasswordDesc: "Update your account password",
    newPassword: "New password",
    confirmPassword: "Confirm password",
    settingsSaved: "Settings saved",
    passwordChanged: "Password changed",
    passwordTooShort: "Password must be at least 6 characters",
    passwordsMismatch: "Passwords do not match",
  },
  sv: {
    loading: "Laddar...",
    save: "Spara",
    cancel: "Avbryt",
    delete: "Radera",
    edit: "Redigera",
    create: "Skapa",
    error: "Fel",
    actions: "Åtgärder",

    loginTitle: "TalentTrack",
    loginSubtitle: "Logga in för att hantera dina rekryteringar",
    emailLabel: "E-post",
    emailPlaceholder: "din@email.se",
    passwordLabel: "Lösenord",
    passwordPlaceholder: "••••••••",
    signIn: "Logga in",
    signingIn: "Loggar in...",
    loginError: "Inloggningsfel",
    signOut: "Logga ut",

    pipeline: "Kanban",
    jobs: "Jobb",
    candidates: "Kandidater",
    manageAccounts: "Hantera konton",
    admin: "Admin",

    kanbanTitle: "Pipeline",
    kanbanSubtitle: "Drag kandidater mellan steg för att uppdatera deras status",
    searchCandidate: "Sök kandidat...",
    filterByJob: "Filtrera på jobb",
    allJobs: "Alla jobb",
    stageNew: "Ny",
    stageScreening: "Screening",
    stageInterview: "Intervju",
    stageOffer: "Erbjudande",
    stageHired: "Anställd",
    stageRejected: "Avvisad",

    jobsTitle: "Jobb",
    jobsSubtitle: "Hantera dina lediga tjänster",
    newJob: "Nytt jobb",
    editJob: "Redigera jobb",
    createNewJob: "Skapa nytt jobb",
    jobTitle: "Titel",
    jobTitlePlaceholder: "T.ex. Frontend-utvecklare",
    jobLocation: "Plats",
    jobLocationPlaceholder: "T.ex. Stockholm",
    jobDescription: "Beskrivning",
    jobDescriptionPlaceholder: "Beskriv tjänsten...",
    jobStatus: "Status",
    statusOpen: "Öppen",
    statusDraft: "Utkast",
    statusClosed: "Stängd",
    saveChanges: "Spara ändringar",
    createJob: "Skapa jobb",
    noJobsYet: "Inga jobb ännu. Skapa ditt första jobb för att komma igång!",
    jobUpdated: "Jobb uppdaterat",
    jobCreated: "Jobb skapat",

    candidatesTitle: "Kandidater",
    candidatesSubtitle: "Hantera din kandidatdatabas",
    newCandidate: "Ny kandidat",
    editCandidate: "Redigera kandidat",
    addCandidate: "Lägg till kandidat",
    nameLabel: "Namn",
    namePlaceholder: "Förnamn Efternamn",
    phoneLabel: "Telefon",
    linkedinLabel: "LinkedIn URL",
    notesLabel: "Anteckningar",
    notesPlaceholder: "Övrig information...",
    add: "Lägg till",
    assignToJob: "Koppla till jobb",
    selectJob: "Välj jobb",
    assign: "Koppla",
    profile: "Profil",
    noCandidatesYet: "Inga kandidater ännu. Lägg till din första kandidat!",
    candidateUpdated: "Kandidat uppdaterad",
    candidateCreated: "Kandidat skapad",
    candidateAssigned: "Kandidat kopplad till jobb",
    alreadyAssigned: "Kandidaten är redan kopplad till detta jobb",
    fillAllFields: "Fyll i alla fält",

    adminTitle: "Hantera konton",
    adminSubtitle: "Skapa nya admin- och kundkonton",
    createNewAccount: "Skapa nytt konto",
    accountEmailConfirm: "Användaren får ett e-postmeddelande för att bekräfta kontot",
    roleLabel: "Roll",
    roleCustomer: "Kund",
    roleAdmin: "Admin",
    createAccount: "Skapa konto",
    creatingAccount: "Skapar...",
    accountCreated: "Konto skapat",
    accountCreatedDesc: (name: string, role: string) => `${name} (${role}) har skapats`,
    existingUsers: "Befintliga användare",
    existingUsersDesc: "Visa och hantera alla användarkonton",
    userDeleted: "Användare raderad",
    confirmDeleteUser: "Radera användare?",
    confirmDeleteUserDesc: (email: string) => `Är du säker på att du vill radera ${email}? Detta kan inte ångras.`,
    resetPassword: "Återställ lösenord",
    resetPasswordFor: (email: string) => `Återställ lösenord för ${email}`,
    changeRole: "Ändra roll",
    changeRoleFor: (email: string) => `Ändra roll för ${email}`,
    roleUpdated: "Roll uppdaterad",
    noUsersFound: "Inga användare hittades",

    assessCandidate: "AI-bedömning",
    assessing: "Bedömer...",
    aiAssessment: "AI-bedömning",
    assessmentFor: "Bedömning för",
    close: "Stäng",
    noAssessmentData: "Ingen data tillgänglig för bedömning. Lägg till anteckningar eller LinkedIn-URL till kandidaten.",

    language: "Språk",
    english: "English",
    swedish: "Svenska",

    settings: "Inställningar",
    settingsTitle: "Inställningar",
    settingsSubtitle: "Hantera ditt konto och dina preferenser",
    profileInfo: "Profilinformation",
    profileInfoDesc: "Uppdatera dina personuppgifter",
    companyLabel: "Företag",
    companyPlaceholder: "Ditt företagsnamn",
    emailCannotChange: "E-post kan inte ändras här",
    changePassword: "Byt lösenord",
    changePasswordDesc: "Uppdatera ditt kontolösenord",
    newPassword: "Nytt lösenord",
    confirmPassword: "Bekräfta lösenord",
    settingsSaved: "Inställningar sparade",
    passwordChanged: "Lösenord ändrat",
    passwordTooShort: "Lösenordet måste vara minst 6 tecken",
    passwordsMismatch: "Lösenorden matchar inte",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

type Translations = typeof translations.en;

interface LanguageContextType {
  lang: Language;
  setLang: (l: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const stored = localStorage.getItem("app-language");
    return (stored === "sv" ? "sv" : "en") as Language;
  });

  const setLang = (l: Language) => {
    setLangState(l);
    localStorage.setItem("app-language", l);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
