"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export type Language = "en" | "am"

export interface Translations {
  // Common
  common: {
    login: string
    signup: string
    logout: string
    submit: string
    cancel: string
    save: string
    delete: string
    edit: string
    view: string
    search: string
    loading: string
    error: string
    success: string
    confirm: string
    back: string
    next: string
    previous: string
    close: string
    select: string
    required: string
    optional: string
    yes: string
    no: string
    searchPlaceholder: string
    filterByStatus: string
    filterByDepartment: string
    filterByInvestigator: string
    allStatuses: string
    allDepartments: string
    allInvestigators: string
    pending: string
    assigned: string
    underInvestigation: string
    completed: string
    initialInvestigation: string
    inProgress: string
    evidenceCollection: string
    reportPending: string
    crNumber: string
    derNumber: string
    title: string
    department: string
    crime: string
    status: string
    registeredDate: string
    registeredBy: string
    actions: string
    noDataFound: string
    caseDetails: string
    investigator: string
    priority: string
    assignedDate: string
    dueDate: string
    assign: string
  }

  // Auth
  auth: {
    title: string
    subtitle: string
    fullName: string
    username: string
    password: string
    rememberMe: string
    forgotPassword: string
    alreadyHaveAccount: string
    dontHaveAccount: string
    signIn: string
    signUp: string
    role: string
    selectRole: string
  }

  // Roles
  roles: {
    admin: string
    preInvestigation: string
    departmentHead: string
    investigator: string
    prosecutor: string
  }

  // Navigation
  nav: {
    dashboard: string
    userManagement: string
    caseDepartments: string
    reports: string
    backup: string
    settings: string
    registerCase: string
    caseHistory: string
    assignInvestigators: string
    pendingCases: string
    myCases: string
    reviewCases: string
    caseDecisions: string
  }

  // Dashboard
  dashboard: {
    welcome: string
    totalUsers: string
    activeCases: string
    pendingCases: string
    completedCases: string
    recentActivity: string
    quickActions: string
    statistics: string
    overview: string
  }

  // Departments
  departments: {
    majorCrime: string
    specializedCrime: string
    financialCrime: string
    antiCorruption: string
    technologyCrime: string
  }

  // Crime Types
  crimes: {
    organizedCrimes: string
    humanTrafficking: string
    smuggling: string
    drugTrafficking: string
    terrorism: string
    financeFraud: string
    tax: string
    customCommission: string
    corruption: string
    techBasedCrimes: string
  }

  // Case Management
  cases: {
    caseNumber: string
    crNumber: string
    dernNumber: string
    title: string
    department: string
    crimeType: string
    status: string
    assignedTo: string
    createdAt: string
    updatedAt: string
    description: string
    priority: string
    evidence: string
    witnesses: string
    suspects: string
    victims: string
  }

  // Person Types
  personTypes: {
    accuser: string
    accused: string
    witness: string
  }

  // Forms
  forms: {
    demographicData: string
    personalInfo: string
    contactInfo: string
    address: string
    statement: string
    exhibit: string
    investigationLog: string
  }

  // User Management
  userManagement: {
    title: string
    manageSystemUsers: string
    createUser: string
    createNewUser: string
    users: string
    searchUsers: string
    fullName: string
    username: string
    email: string
    role: string
    department: string
    status: string
    actions: string
    active: string
    inactive: string
    selectRole: string
    selectDepartment: string
    password: string
  }

  // Department Management
  departmentManagement: {
    title: string
    manageDepartmentsAndCrimes: string
    createDepartment: string
    createNewDepartment: string
    departmentName: string
    description: string
    crimes: string
    separateWithCommas: string
    active: string
    inactive: string
  }

  // Case Registration
  caseRegistration: {
    registerCase: string
    registerNewCaseInvestigation: string
    caseInformation: string
    crNumber: string
    derNumber: string
    caseTitle: string
    enterCaseTitle: string
    selectDepartment: string
    crimeType: string
    selectCrimeType: string
    caseDescription: string
    enterCaseDescription: string
    location: string
    enterLocation: string
    reportedBy: string
    enterReporterName: string
    reportedDate: string
    caseRegisteredSuccessfully: string
  }

  // Investigation
  investigation: {
    myAssignedCases: string
    addInvestigationLog: string
    demographicDataForm: string
    registerStatement: string
    registerExhibit: string
    submitToDepartmentHead: string
    personType: string
    selectPersonType: string
  }

  // Case Assignment
  caseAssignment: {
    assignInvestigators: string
    viewCaseAndAssign: string
    selectInvestigator: string
    addNote: string
    assignCase: string
    pendingCases: string
    assignedCases: string
  }

  // Case Review
  caseReview: {
    reviewCases: string
    caseForReview: string
    acceptCase: string
    rejectCase: string
    requestModification: string
    caseDecisions: string
    listOfCaseDecisions: string
  }

  // Settings
  settings: {
    title: string
    general: string
    security: string
    notifications: string
    backup: string
    users: string
    systemConfiguration: string
    systemConfigurationDesc: string
    systemName: string
    timezone: string
    dateFormat: string
    sessionTimeout: string
    securitySettings: string
    securitySettingsDesc: string
    passwordMinLength: string
    maxLoginAttempts: string
    passwordComplexity: string
    passwordComplexityDesc: string
    twoFactorAuth: string
    twoFactorAuthDesc: string
    auditLog: string
    auditLogDesc: string
    notificationSettings: string
    notificationSettingsDesc: string
    enableNotifications: string
    enableNotificationsDesc: string
    backupSettings: string
    backupSettingsDesc: string
    enableBackup: string
    enableBackupDesc: string
    backupFrequency: string
    hourly: string
    daily: string
    weekly: string
    monthly: string
    userSettings: string
    userSettingsDesc: string
    maxFileSize: string
    allowedFileTypes: string
  }

  // Pre Investigation
  preInvestigation: {
    caseHistory: string
    caseHistoryTitle: string
    caseHistoryDesc: string
  }

  // Department Head
  departmentHead: {
    assignInvestigators: string
    pendingAssignment: string
    pendingAssignmentDesc: string
    assignInvestigator: string
    assignInvestigatorDesc: string
    selectInvestigator: string
    selectInvestigatorPlaceholder: string
    assignmentNote: string
    assignmentNotePlaceholder: string
    pendingCases: string
    assignedCases: string
    assignedCasesDesc: string
  }

  // Investigator
  investigator: {
    dashboard: string
    dashboardDescription: string
    assignedCases: string
    completedCases: string
    pendingReports: string
    recentCases: string
  }

  // Prosecutor
  prosecutor: {
    reviewCases: string
    reviewCasesDescription: string
    pendingReview: string
    underReview: string
    reviewed: string
    caseDetails: string
    caseSummary: string
    evidence: string
    witnesses: string
    reviewDecision: string
    accept: string
    reject: string
    requestModification: string
    reviewNote: string
    reviewNotePlaceholder: string
    submitReview: string
    caseDecisions: string
    caseDecisionsDescription: string
    acceptedCases: string
    rejectedCases: string
    modificationRequested: string
    decisionDate: string
    reviewNotes: string
  }
}

export const translations: Record<Language, Translations> = {
  en: {
    common: {
      login: "Login",
      signup: "Sign Up",
      logout: "Logout",
      submit: "Submit",
      cancel: "Cancel",
      save: "Save",
      delete: "Delete",
      edit: "Edit",
      view: "View",
      search: "Search",
      loading: "Loading...",
      error: "Error",
      success: "Success",
      confirm: "Confirm",
      back: "Back",
      next: "Next",
      previous: "Previous",
      close: "Close",
      select: "Select",
      required: "Required",
      optional: "Optional",
      yes: "Yes",
      no: "No",
      searchPlaceholder: "Search cases...",
      filterByStatus: "Filter by Status",
      filterByDepartment: "Filter by Department",
      filterByInvestigator: "Filter by Investigator",
      allStatuses: "All Statuses",
      allDepartments: "All Departments",
      allInvestigators: "All Investigators",
      pending: "Pending",
      assigned: "Assigned",
      underInvestigation: "Under Investigation",
      completed: "Completed",
      initialInvestigation: "Initial Investigation",
      inProgress: "In Progress",
      evidenceCollection: "Evidence Collection",
      reportPending: "Report Pending",
      crNumber: "CR Number",
      derNumber: "DER Number",
      title: "Title",
      department: "Department",
      crime: "Crime",
      status: "Status",
      registeredDate: "Registered Date",
      registeredBy: "Registered By",
      actions: "Actions",
      noDataFound: "No data found",
      caseDetails: "Case Details",
      investigator: "Investigator",
      priority: "Priority",
      assignedDate: "Assigned Date",
      dueDate: "Due Date",
      assign: "Assign",
    },
    auth: {
      title: "Ethiopia Federal Police",
      subtitle: "Crime Investigation System",
      fullName: "Full Name",
      username: "Username",
      password: "Password",
      rememberMe: "Remember me",
      forgotPassword: "Forgot Password?",
      alreadyHaveAccount: "Already have an account? Sign in",
      dontHaveAccount: "Don't have an account? Sign Up",
      signIn: "Sign in",
      signUp: "Sign up",
      role: "Role",
      selectRole: "Select Role",
    },
    roles: {
      admin: "Admin",
      preInvestigation: "Pre Investigation Unit",
      departmentHead: "Department Head",
      investigator: "Investigator",
      prosecutor: "Prosecutor",
    },
    nav: {
      dashboard: "Dashboard",
      userManagement: "User Management",
      caseDepartments: "Case Departments",
      reports: "Reports",
      backup: "Backup & Export",
      settings: "Settings",
      registerCase: "Register Case",
      caseHistory: "Case History",
      assignInvestigators: "Assign Investigators",
      pendingCases: "Pending Cases",
      myCases: "My Cases",
      reviewCases: "Review Cases",
      caseDecisions: "Case Decisions",
    },
    dashboard: {
      welcome: "Welcome",
      totalUsers: "Total Users",
      activeCases: "Active Cases",
      pendingCases: "Pending Cases",
      completedCases: "Completed Cases",
      recentActivity: "Recent Activity",
      quickActions: "Quick Actions",
      statistics: "Statistics",
      overview: "Overview",
    },
    departments: {
      majorCrime: "Major Crime Division",
      specializedCrime: "Specialized Crime Division",
      financialCrime: "Financial Crime Division",
      antiCorruption: "Anti-Corruption Division",
      technologyCrime: "Technology Crime Division",
    },
    crimes: {
      organizedCrimes: "Organized Unique Crimes",
      humanTrafficking: "Human Trafficking",
      smuggling: "Smuggling",
      drugTrafficking: "Drug Trafficking",
      terrorism: "Terrorism",
      financeFraud: "Finance Fraud",
      tax: "Tax",
      customCommission: "Custom Commission Case",
      corruption: "Corruption",
      techBasedCrimes: "Technology Based Crimes",
    },
    cases: {
      caseNumber: "Case Number",
      crNumber: "CR Number",
      dernNumber: "DERN Number",
      title: "Title",
      department: "Department",
      crimeType: "Crime Type",
      status: "Status",
      assignedTo: "Assigned To",
      createdAt: "Created At",
      updatedAt: "Updated At",
      description: "Description",
      priority: "Priority",
      evidence: "Evidence",
      witnesses: "Witnesses",
      suspects: "Suspects",
      victims: "Victims",
    },
    personTypes: {
      accuser: "Accuser",
      accused: "Accused",
      witness: "Witness",
    },
    forms: {
      demographicData: "Demographic Data",
      personalInfo: "Personal Information",
      contactInfo: "Contact Information",
      address: "Address",
      statement: "Statement",
      exhibit: "Exhibit",
      investigationLog: "Investigation Log",
    },
    userManagement: {
      title: "User Management",
      manageSystemUsers: "Manage system users and their roles",
      createUser: "Create User",
      createNewUser: "Create New User",
      users: "Users",
      searchUsers: "Search users...",
      fullName: "Full Name",
      username: "Username",
      email: "Email",
      role: "Role",
      department: "Department",
      status: "Status",
      actions: "Actions",
      active: "Active",
      inactive: "Inactive",
      selectRole: "Select Role",
      selectDepartment: "Select Department",
      password: "Password",
    },
    departmentManagement: {
      title: "Department Management",
      manageDepartmentsAndCrimes: "Manage departments and crime types",
      createDepartment: "Create Department",
      createNewDepartment: "Create New Department",
      departmentName: "Department Name",
      description: "Description",
      crimes: "Crimes",
      separateWithCommas: "Separate with commas",
      active: "Active",
      inactive: "Inactive",
    },
    caseRegistration: {
      registerCase: "Register Case",
      registerNewCaseInvestigation: "Register a new case for investigation",
      caseInformation: "Case Information",
      crNumber: "CR Number",
      derNumber: "DER Number",
      caseTitle: "Case Title",
      enterCaseTitle: "Enter case title",
      selectDepartment: "Select Department",
      crimeType: "Crime Type",
      selectCrimeType: "Select Crime Type",
      caseDescription: "Case Description",
      enterCaseDescription: "Enter case description",
      location: "Location",
      enterLocation: "Enter location",
      reportedBy: "Reported By",
      enterReporterName: "Enter reporter name",
      reportedDate: "Reported Date",
      caseRegisteredSuccessfully: "Case registered successfully!",
    },
    investigation: {
      myAssignedCases: "My Assigned Cases",
      addInvestigationLog: "Add Investigation Log",
      demographicDataForm: "Demographic Data Form",
      registerStatement: "Register Statement",
      registerExhibit: "Register Exhibit",
      submitToDepartmentHead: "Submit to Department Head",
      personType: "Person Type",
      selectPersonType: "Select Person Type",
    },
    caseAssignment: {
      assignInvestigators: "Assign Investigators",
      viewCaseAndAssign: "View case details and assign investigator",
      selectInvestigator: "Select Investigator",
      addNote: "Add Note",
      assignCase: "Assign Case",
      pendingCases: "Pending Cases",
      assignedCases: "Assigned Cases",
    },
    caseReview: {
      reviewCases: "Review Cases",
      caseForReview: "Cases for review",
      acceptCase: "Accept Case",
      rejectCase: "Reject Case",
      requestModification: "Request Modification",
      caseDecisions: "Case Decisions",
      listOfCaseDecisions: "List of case decisions",
    },
    settings: {
      title: "Settings",
      general: "General",
      security: "Security",
      notifications: "Notifications",
      backup: "Backup",
      users: "Users",
      systemConfiguration: "System Configuration",
      systemConfigurationDesc: "Configure general system settings",
      systemName: "System Name",
      timezone: "Timezone",
      dateFormat: "Date Format",
      sessionTimeout: "Session Timeout (minutes)",
      securitySettings: "Security Settings",
      securitySettingsDesc: "Configure security and authentication settings",
      passwordMinLength: "Password Minimum Length",
      maxLoginAttempts: "Max Login Attempts",
      passwordComplexity: "Password Complexity",
      passwordComplexityDesc: "Require uppercase, lowercase, numbers and special characters",
      twoFactorAuth: "Two-Factor Authentication",
      twoFactorAuthDesc: "Enable two-factor authentication for all users",
      auditLog: "Audit Log",
      auditLogDesc: "Enable system audit logging",
      notificationSettings: "Notification Settings",
      notificationSettingsDesc: "Configure system notifications",
      enableNotifications: "Enable Notifications",
      enableNotificationsDesc: "Enable system-wide notifications",
      backupSettings: "Backup Settings",
      backupSettingsDesc: "Configure automatic backup settings",
      enableBackup: "Enable Automatic Backup",
      enableBackupDesc: "Enable automatic system backups",
      backupFrequency: "Backup Frequency",
      hourly: "Hourly",
      daily: "Daily",
      weekly: "Weekly",
      monthly: "Monthly",
      userSettings: "User Settings",
      userSettingsDesc: "Configure user-related settings",
      maxFileSize: "Max File Size (MB)",
      allowedFileTypes: "Allowed File Types",
    },
    preInvestigation: {
      caseHistory: "Case History",
      caseHistoryTitle: "Pre-Investigation Case History",
      caseHistoryDesc: "View all registered cases from pre-investigation unit",
    },
    departmentHead: {
      assignInvestigators: "Assign Investigators",
      pendingAssignment: "Cases Pending Assignment",
      pendingAssignmentDesc: "View and assign investigators to pending cases",
      assignInvestigator: "Assign Investigator",
      assignInvestigatorDesc: "Select an investigator and add assignment notes",
      selectInvestigator: "Select Investigator",
      selectInvestigatorPlaceholder: "Choose an available investigator",
      assignmentNote: "Assignment Note",
      assignmentNotePlaceholder: "Add notes for the investigator...",
      pendingCases: "Pending Cases",
      assignedCases: "Assigned Cases",
      assignedCasesDesc: "View all cases assigned to investigators",
    },
    investigator: {
      dashboard: "Investigator Dashboard",
      dashboardDescription: "Manage your assigned cases and investigation activities",
      assignedCases: "Assigned Cases",
      completedCases: "Completed Cases",
      pendingReports: "Pending Reports",
      recentCases: "Recent Cases",
    },
    prosecutor: {
      reviewCases: "Review Cases",
      reviewCasesDescription: "Review submitted cases and make decisions",
      pendingReview: "Pending Review",
      underReview: "Under Review",
      reviewed: "Reviewed",
      caseDetails: "Case Details",
      caseSummary: "Case Summary",
      evidence: "Evidence",
      witnesses: "Witnesses",
      reviewDecision: "Review Decision",
      accept: "Accept",
      reject: "Reject",
      requestModification: "Request Modification",
      reviewNote: "Review Note",
      reviewNotePlaceholder: "Add your review notes here...",
      submitReview: "Submit Review",
      caseDecisions: "Case Decisions",
      caseDecisionsDescription: "View all case decisions and their status",
      acceptedCases: "Accepted Cases",
      rejectedCases: "Rejected Cases",
      modificationRequested: "Modification Requested",
      decisionDate: "Decision Date",
      reviewNotes: "Review Notes",
    },
  },
  am: {
    common: {
      login: "ግባ",
      signup: "ተመዝገብ",
      logout: "ውጣ",
      submit: "አስገባ",
      cancel: "ሰርዝ",
      save: "አስቀምጥ",
      delete: "ሰርዝ",
      edit: "አርም",
      view: "ተመልከት",
      search: "ፈልግ",
      loading: "በመጫን ላይ...",
      error: "ስህተት",
      success: "ተሳክቷል",
      confirm: "አረጋግጥ",
      back: "ተመለስ",
      next: "ቀጣይ",
      previous: "ቀዳሚ",
      close: "ዝጋ",
      select: "ምረጥ",
      required: "አስፈላጊ",
      optional: "አማራጭ",
      yes: "አዎ",
      no: "አይ",
      searchPlaceholder: "ጉዳዮችን ፈልግ...",
      filterByStatus: "በሁኔታ ማጣሪያ",
      filterByDepartment: "በክፍል ማጣሪያ",
      filterByInvestigator: "በመርማሪ ማጣሪያ",
      allStatuses: "ሁሉም ሁኔታዎች",
      allDepartments: "ሁሉም ክፍሎች",
      allInvestigators: "ሁሉም መርማሪዎች",
      pending: "በመጠባበቅ ላይ",
      assigned: "የተመደበ",
      underInvestigation: "በምርመራ ላይ",
      completed: "የተጠናቀቀ",
      initialInvestigation: "የመጀመሪያ ምርመራ",
      inProgress: "በሂደት ላይ",
      evidenceCollection: "የማስረጃ ስብስብ",
      reportPending: "ሪፖርት በመጠባበቅ ላይ",
      crNumber: "CR ቁጥር",
      derNumber: "DER ቁጥር",
      title: "ርዕስ",
      department: "ክፍል",
      crime: "ወንጀል",
      status: "ሁኔታ",
      registeredDate: "የተመዘገበበት ቀን",
      registeredBy: "የመዘገበው",
      actions: "እርምጃዎች",
      noDataFound: "ምንም መረጃ አልተገኘም",
      caseDetails: "የጉዳይ ዝርዝሮች",
      investigator: "መርማሪ",
      priority: "ቅድሚያ",
      assignedDate: "የተመደበበት ቀን",
      dueDate: "የመጨረሻ ቀን",
      assign: "ምደብ",
    },
    auth: {
      title: "የኢትዮጵያ ፌዴራል ፖሊስ",
      subtitle: "የወንጀል ምርመራ ስርዓት",
      fullName: "ሙሉ ስም",
      username: "የተጠቃሚ ስም",
      password: "የይለፍ ቃል",
      rememberMe: "አስታውሰኝ",
      forgotPassword: "የይለፍ ቃል ረሳህ?",
      alreadyHaveAccount: "መለያ አለህ? ግባ",
      dontHaveAccount: "መለያ የለህም? ተመዝገብ",
      signIn: "ግባ",
      signUp: "ተመዝገብ",
      role: "ሚና",
      selectRole: "ሚና ምረጥ",
    },
    roles: {
      admin: "አስተዳዳሪ",
      preInvestigation: "የቅድመ ምርመራ ክፍል",
      departmentHead: "የክፍል ኃላፊ",
      investigator: "መርማሪ",
      prosecutor: "አቃቤ ህግ",
    },
    nav: {
      dashboard: "ዳሽቦርድ",
      userManagement: "የተጠቃሚ አስተዳደር",
      caseDepartments: "የጉዳይ ክፍሎች",
      reports: "ሪፖርቶች",
      backup: "መጠባበቂያ እና ወደ ውጭ መላክ",
      settings: "ቅንብሮች",
      registerCase: "ጉዳይ መዝግብ",
      caseHistory: "የጉዳይ ታሪክ",
      assignInvestigators: "መርማሪዎች ምደባ",
      pendingCases: "በመጠባበቅ ላይ ያሉ ጉዳዮች",
      myCases: "የእኔ ጉዳዮች",
      reviewCases: "ጉዳዮች ግምገማ",
      caseDecisions: "የጉዳይ ውሳኔዎች",
    },
    dashboard: {
      welcome: "እንኳን ደህና መጣህ",
      totalUsers: "ጠቅላላ ተጠቃሚዎች",
      activeCases: "ንቁ ጉዳዮች",
      pendingCases: "በመጠባበቅ ላይ ያሉ ጉዳዮች",
      completedCases: "የተጠናቀቁ ጉዳዮች",
      recentActivity: "የቅርብ ጊዜ እንቅስቃሴ",
      quickActions: "ፈጣን እርምጃዎች",
      statistics: "ስታቲስቲክስ",
      overview: "አጠቃላይ እይታ",
    },
    departments: {
      majorCrime: "የዋና ወንጀል ክፍል",
      specializedCrime: "የተወሰነ ወንጀል ክፍል",
      financialCrime: "የፋይናንስ ወንጀል ክፍል",
      antiCorruption: "የፀረ ሙስና ክፍል",
      technologyCrime: "የቴክኖሎጂ ወንጀል ክፍል",
    },
    crimes: {
      organizedCrimes: "የተደራጁ ልዩ ወንጀሎች",
      humanTrafficking: "የሰው ዝውውር",
      smuggling: "ዝርፊያ",
      drugTrafficking: "የአደንዛዥ ዕፅ ዝውውር",
      terrorism: "ሽብርተኝነት",
      financeFraud: "የፋይናንስ ማጭበርበር",
      tax: "ግብር",
      customCommission: "የጉምሩክ ኮሚሽን ጉዳይ",
      corruption: "ሙስና",
      techBasedCrimes: "በቴክኖሎጂ ላይ የተመሰረቱ ወንጀሎች",
    },
    cases: {
      caseNumber: "የጉዳይ ቁጥር",
      crNumber: "CR ቁጥር",
      dernNumber: "DERN ቁጥር",
      title: "ርዕስ",
      department: "ክፍል",
      crimeType: "የወንጀል አይነት",
      status: "ሁኔታ",
      assignedTo: "የተመደበለት",
      createdAt: "የተፈጠረበት ጊዜ",
      updatedAt: "የተሻሻለበት ጊዜ",
      description: "መግለጫ",
      priority: "ቅድሚያ",
      evidence: "ማስረጃ",
      witnesses: "ምስክሮች",
      suspects: "ተጠርጣሪዎች",
      victims: "ተጎጂዎች",
    },
    personTypes: {
      accuser: "ተከሳሽ",
      accused: "ተከሳሽ",
      witness: "ምስክር",
    },
    forms: {
      demographicData: "የሕዝብ መረጃ",
      personalInfo: "የግል መረጃ",
      contactInfo: "የመገናኛ መረጃ",
      address: "አድራሻ",
      statement: "መግለጫ",
      exhibit: "ማሳያ",
      investigationLog: "የምርመራ ምዝገባ",
    },
    userManagement: {
      title: "የተጠቃሚ አስተዳደር",
      manageSystemUsers: "የስርዓት ተጠቃሚዎችን እና ሚናዎቻቸውን ያስተዳድሩ",
      createUser: "ተጠቃሚ ፍጠር",
      createNewUser: "አዲስ ተጠቃሚ ፍጠር",
      users: "ተጠቃሚዎች",
      searchUsers: "ተጠቃሚዎችን ፈልግ...",
      fullName: "ሙሉ ስም",
      username: "የተጠቃሚ ስም",
      email: "ኢሜይል",
      role: "ሚና",
      department: "ክፍል",
      status: "ሁኔታ",
      actions: "እርምጃዎች",
      active: "ንቁ",
      inactive: "ንቁ ያልሆነ",
      selectRole: "ሚና ምረጥ",
      selectDepartment: "ክፍል ምረጥ",
      password: "የይለፍ ቃል",
    },
    departmentManagement: {
      title: "የክፍል አስተዳደር",
      manageDepartmentsAndCrimes: "ክፍሎችን እና የወንጀል አይነቶችን ያስተዳድሩ",
      createDepartment: "ክፍል ፍጠር",
      createNewDepartment: "አዲስ ክፍል ፍጠር",
      departmentName: "የክፍል ስም",
      description: "መግለጫ",
      crimes: "ወንጀሎች",
      separateWithCommas: "በኮማ ይለዩ",
      active: "ንቁ",
      inactive: "ንቁ ያልሆነ",
    },
    caseRegistration: {
      registerCase: "ጉዳይ መዝግብ",
      registerNewCaseInvestigation: "ለምርመራ አዲስ ጉዳይ መዝግብ",
      caseInformation: "የጉዳይ መረጃ",
      crNumber: "CR ቁጥር",
      derNumber: "DER ቁጥር",
      caseTitle: "የጉዳይ ርዕስ",
      enterCaseTitle: "የጉዳይ ርዕስ አስገባ",
      selectDepartment: "ክፍል ምረጥ",
      crimeType: "የወንጀል አይነት",
      selectCrimeType: "የወንጀል አይነት ምረጥ",
      caseDescription: "የጉዳይ መግለጫ",
      enterCaseDescription: "የጉዳይ መግለጫ አስገባ",
      location: "ቦታ",
      enterLocation: "ቦታ አስገባ",
      reportedBy: "ሪፖርት ያደረገው",
      enterReporterName: "የሪፖርተር ስም አስገባ",
      reportedDate: "የሪፖርት ቀን",
      caseRegisteredSuccessfully: "ጉዳይ በተሳካ ሁኔታ ተመዝግቧል!",
    },
    investigation: {
      myAssignedCases: "የእኔ የተመደቡ ጉዳዮች",
      addInvestigationLog: "የምርመራ ምዝገባ አክል",
      demographicDataForm: "የሕዝብ መረጃ ቅጽ",
      registerStatement: "መግለጫ መዝግብ",
      registerExhibit: "ማሳያ መዝግብ",
      submitToDepartmentHead: "ለክፍል ኃላፊ አስገባ",
      personType: "የሰው አይነት",
      selectPersonType: "የሰው አይነት ምረጥ",
    },
    caseAssignment: {
      assignInvestigators: "መርማሪዎች ምደባ",
      viewCaseAndAssign: "የጉዳይ ዝርዝር ተመልከት እና መርማሪ ምደብ",
      selectInvestigator: "መርማሪ ምረጥ",
      addNote: "ማስታወሻ አክል",
      assignCase: "ጉዳይ ምደብ",
      pendingCases: "በመጠባበቅ ላይ ያሉ ጉዳዮች",
      assignedCases: "የተመደቡ ጉዳዮች",
    },
    caseReview: {
      reviewCases: "ጉዳዮች ግምገማ",
      caseForReview: "ለግምገማ ጉዳዮች",
      acceptCase: "ጉዳይ ተቀበል",
      rejectCase: "ጉዳይ ውድቅ አድርግ",
      requestModification: "ማሻሻያ ጠይቅ",
      caseDecisions: "የጉዳይ ውሳኔዎች",
      listOfCaseDecisions: "የጉዳይ ውሳኔዎች ዝርዝር",
    },
    settings: {
      title: "ቅንብሮች",
      general: "አጠቃላይ",
      security: "ደህንነት",
      notifications: "ማሳወቂያዎች",
      backup: "መጠባበቂያ",
      users: "ተጠቃሚዎች",
      systemConfiguration: "የስርዓት ውቅር",
      systemConfigurationDesc: "አጠቃላይ የስርዓት ቅንብሮችን ያዋቅሩ",
      systemName: "የስርዓት ስም",
      timezone: "የጊዜ ዞን",
      dateFormat: "የቀን ቅርጸት",
      sessionTimeout: "የክፍለ ጊዜ ማብቂያ (ደቂቃዎች)",
      securitySettings: "የደህንነት ቅንብሮች",
      securitySettingsDesc: "የደህንነት እና የማረጋገጫ ቅንብሮችን ያዋቅሩ",
      passwordMinLength: "የይለፍ ቃል ዝቅተኛ ርዝመት",
      maxLoginAttempts: "ከፍተኛ የመግቢያ ሙከራዎች",
      passwordComplexity: "የይለፍ ቃል ውስብስብነት",
      passwordComplexityDesc: "ትላልቅ፣ ትናንሽ፣ ቁጥሮች እና ልዩ ቁምፊዎች ያስፈልጋሉ",
      twoFactorAuth: "ባለሁለት ደረጃ ማረጋገጫ",
      twoFactorAuthDesc: "ለሁሉም ተጠቃሚዎች ባለሁለት ደረጃ ማረጋገጫን አንቃ",
      auditLog: "የኦዲት ምዝገባ",
      auditLogDesc: "የስርዓት ኦዲት ምዝገባን አንቃ",
      notificationSettings: "የማሳወቂያ ቅንብሮች",
      notificationSettingsDesc: "የስርዓት ማሳወቂያዎችን ያዋቅሩ",
      enableNotifications: "ማሳወቂያዎችን አንቃ",
      enableNotificationsDesc: "በስርዓት አቀፍ ማሳወቂያዎችን አንቃ",
      backupSettings: "የመጠባበቂያ ቅንብሮች",
      backupSettingsDesc: "አውቶማቲክ የመጠባበቂያ ቅንብሮችን ያዋቅሩ",
      enableBackup: "አውቶማቲክ መጠባበቂያን አንቃ",
      enableBackupDesc: "አውቶማቲክ የስርዓት መጠባበቂያዎችን አንቃ",
      backupFrequency: "የመጠባበቂያ ድግግሞሽ",
      hourly: "በሰዓት",
      daily: "በቀን",
      weekly: "በሳምንት",
      monthly: "በወር",
      userSettings: "የተጠቃሚ ቅንብሮች",
      userSettingsDesc: "ከተጠቃሚ ጋር የተያያዙ ቅንብሮችን ያዋቅሩ",
      maxFileSize: "ከፍተኛ የፋይል መጠን (MB)",
      allowedFileTypes: "የተፈቀዱ የፋይል አይነቶች",
    },
    preInvestigation: {
      caseHistory: "የጉዳይ ታሪክ",
      caseHistoryTitle: "የቅድመ ምርመራ የጉዳይ ታሪክ",
      caseHistoryDesc: "ከቅድመ ምርመራ ክፍል የተመዘገቡ ሁሉንም ጉዳዮች ተመልከት",
    },
    departmentHead: {
      assignInvestigators: "መርማሪዎች ምደባ",
      pendingAssignment: "ምደባ በመጠባበቅ ላይ ያሉ ጉዳዮች",
      pendingAssignmentDesc: "በመጠባበቅ ላይ ያሉ ጉዳዮችን ተመልከት እና መርማሪዎችን ምደብ",
      assignInvestigator: "መርማሪ ምደብ",
      assignInvestigatorDesc: "መርማሪ ምረጥ እና የምደባ ማስታወሻዎች አክል",
      selectInvestigator: "መርማሪ ምረጥ",
      selectInvestigatorPlaceholder: "ያለ መርማሪ ምረጥ",
      assignmentNote: "የምደባ ማስታወሻ",
      assignmentNotePlaceholder: "ለመርማሪው ማስታወሻዎች አክል...",
      pendingCases: "በመጠባበቅ ላይ ያሉ ጉዳዮች",
      assignedCases: "የተመደቡ ጉዳዮች",
      assignedCasesDesc: "ለመርማሪዎች የተመደቡ ሁሉንም ጉዳዮች ተመልከት",
    },
    investigator: {
      dashboard: "የመርማሪ ዳሽቦርድ",
      dashboardDescription: "የተመደቡ ጉዳዮችዎን እና የምርመራ እንቅስቃሴዎችን ያስተዳድሩ",
      assignedCases: "የተመደቡ ጉዳዮች",
      completedCases: "የተጠናቀቁ ጉዳዮች",
      pendingReports: "በመጠባበቅ ላይ ያሉ ሪፖርቶች",
      recentCases: "የቅርብ ጊዜ ጉዳዮች",
    },
    prosecutor: {
      reviewCases: "ጉዳዮችን ይገምግሙ",
      reviewCasesDescription: "የቀረቡ ጉዳዮችን ይገምግሙ እና ውሳኔ ይስጡ",
      pendingReview: "በመገምገም ላይ",
      underReview: "በግምገማ ሂደት ላይ",
      reviewed: "ተገምግሟል",
      caseDetails: "የጉዳይ ዝርዝሮች",
      caseSummary: "የጉዳይ ማጠቃለያ",
      evidence: "ማስረጃ",
      witnesses: "ምስክሮች",
      reviewDecision: "የግምገማ ውሳኔ",
      accept: "ተቀበል",
      reject: "ውድቅ አድርግ",
      requestModification: "ማሻሻያ ጠይቅ",
      reviewNote: "የግምገማ ማስታወሻ",
      reviewNotePlaceholder: "የግምገማ ማስታወሻዎችዎን እዚህ ያክሉ...",
      submitReview: "ግምገማ አስገባ",
      caseDecisions: "የጉዳይ ውሳኔዎች",
      caseDecisionsDescription: "ሁሉንም የጉዳይ ውሳኔዎች እና ሁኔታቸውን ይመልከቱ",
      acceptedCases: "የተቀበሉ ጉዳዮች",
      rejectedCases: "የተወገዱ ጉዳዮች",
      modificationRequested: "ማሻሻያ ተጠይቋል",
      decisionDate: "የውሳኔ ቀን",
      reviewNotes: "የግምገማ ማስታወሻዎች",
    },
  },
}

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  toggleLanguage: () => void
  t: Translations
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en")

  useEffect(() => {
    const savedLanguage = localStorage.getItem("language") as Language
    if (savedLanguage && (savedLanguage === "en" || savedLanguage === "am")) {
      setLanguageState(savedLanguage)
    }
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem("language", lang)
  }

  const toggleLanguage = () => {
    const newLang = language === "en" ? "am" : "en"
    setLanguage(newLang)
  }

  const t = translations[language]

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>{children}</LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
