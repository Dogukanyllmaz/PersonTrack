import { createContext, useContext, useState, useEffect } from 'react';

/* ── Supported languages ─────────────────────────────────── */
export const SUPPORTED_LANGUAGES = [
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
];

/* ── Translations ────────────────────────────────────────── */
const translations = {
  tr: {
    // Mevcut anahtarlar (dokunma)
    dashboard: 'Dashboard', persons: 'Kişiler', meetings: 'Toplantılar',
    calendar: 'Takvim', tasks: 'Görevler', tags: 'Etiketler',
    timeline: 'Zaman Tüneli', notifications: 'Bildirimler', reminders: 'Hatırlatıcılar',
    messages: 'Mesajlar', monitor: 'Sistem İzleme', activityLog: 'Aktivite',
    admin: 'Admin Panel', profile: 'Profil', logout: 'Çıkış Yap',
    search: 'Kişi, toplantı veya görev ara...', lightMode: 'Açık mod',
    darkMode: 'Koyu mod', language: 'Dil', noResult: 'Sonuç bulunamadı',
    management: 'Yönetim', communication: 'İletişim', system: 'Sistem',
    markAllRead: 'Tümünü okundu işaretle', noNotif: 'Bildirim yok',
    langSettings: 'Dil Ayarları', langDesc: 'Kullanıcıların kullanabileceği dilleri seçin.',

    // Genel butonlar
    save: 'Kaydet', cancel: 'İptal', edit: 'Düzenle', delete: 'Sil',
    add: 'Ekle', create: 'Oluştur', close: 'Kapat', back: 'Geri',
    filter: 'Filtrele', clear: 'Temizle',
    loading: 'Yükleniyor...', confirm: 'Onayla', yes: 'Evet', no: 'Hayır',
    actions: 'İşlemler', detail: 'Detay', view: 'Görüntüle', status: 'Durum',
    date: 'Tarih', name: 'Ad', email: 'Email', phone: 'Telefon',
    note: 'Not', notes: 'Notlar', description: 'Açıklama', type: 'Tür',
    role: 'Rol', active: 'Aktif', inactive: 'Pasif', new: 'Yeni',

    // Sayfa başlıkları
    pagePersons: 'Kişiler', pageMeetings: 'Toplantılar', pageCalendar: 'Takvim',
    pageTasks: 'Görevler', pageTags: 'Etiketler', pageTimeline: 'Zaman Tüneli',
    pageReminders: 'Hatırlatıcılar', pageMessages: 'Mesajlar', pageMonitor: 'Sistem İzleme',
    pageActivityLog: 'Aktivite Günlüğü', pageAdmin: 'Admin Panel', pageProfile: 'Profilim',
    pageDashboard: 'Dashboard',

    // Kişiler
    addPerson: 'Yeni Kişi', editPerson: 'Kişiyi Düzenle', deletePerson: 'Kişiyi Sil',
    personName: 'Ad Soyad', personPhone: 'Telefon', personEmail: 'Email',
    personTag: 'Etiket', personNote: 'Not', personMeeting: 'Toplantı', personTask: 'Görev',
    noPersons: 'Henüz kişi eklenmedi', searchPerson: 'İsim, email veya kurum ara...',
    personDetail: 'Kişi Detayı', addNote: 'Not Ekle', addTag: '+ Etiket',
    addMeeting: 'Toplantı Ekle', addTask: 'Görev Ekle',

    // Toplantılar
    editMeeting: 'Toplantıyı Düzenle', deleteMeeting: 'Toplantıyı Sil',
    meetingTitle: 'Toplantı Başlığı', meetingDate: 'Tarih', meetingTime: 'Saat',
    meetingDuration: 'Süre', meetingLocation: 'Konum', meetingParticipant: 'Katılımcı',
    meetingNote: 'Not', noMeetings: 'Henüz toplantı oluşturulmadı',
    meetingDetail: 'Toplantı Detayı', upcomingMeetings: 'Yaklaşan Toplantılar',
    pastMeetings: 'Geçmiş Toplantılar',

    // Görevler
    editTask: 'Görevi Düzenle', deleteTask: 'Görevi Sil',
    taskTitle: 'Görev Başlığı', taskDesc: 'Açıklama', taskDue: 'Son Tarih',
    taskPriority: 'Öncelik', taskAssigned: 'Atanan Kişi', taskStatus: 'Durum',
    noTasks: 'Görev yok', taskDone: 'Tamamlandı', taskPending: 'Bekliyor',
    taskOverdue: 'Gecikmiş',
    priorityHigh: 'Yüksek', priorityMedium: 'Orta', priorityLow: 'Düşük',
    statusTodo: 'Yapılacak', statusInProgress: 'Devam Ediyor', statusDone: 'Tamamlandı',

    // Takvim
    today: 'Bugün', week: 'Hafta', month: 'Ay', year: 'Yıl', noEvents: 'Etkinlik yok',

    // Etiketler
    editTag: 'Etiketi Düzenle', deleteTag: 'Etiketi Sil',
    tagName: 'Etiket Adı', tagColor: 'Renk', noTags: 'Henüz etiket yok',

    // Hatırlatıcılar
    addReminder: 'Yeni Hatırlatıcı', editReminder: 'Hatırlatıcıyı Düzenle',
    deleteReminder: 'Hatırlatıcıyı Sil', reminderTitle: 'Başlık',
    reminderDate: 'Tarih ve Saat', noReminders: 'Aktif hatırlatıcı yok',

    // Profil
    profileInfo: 'Hesap Bilgileri', changePassword: 'Şifre Değiştir',
    currentPassword: 'Mevcut Şifre', newPassword: 'Yeni Şifre',
    confirmPassword: 'Yeni Şifre Tekrar', updateProfile: 'Profili Güncelle',
    passwordChanged: 'Şifre başarıyla güncellendi.',

    // Admin
    userManagement: 'Kullanıcı Yönetimi', addUser: 'Yeni Kullanıcı',
    editUser: 'Kullanıcıyı Düzenle', deleteUser: 'Kullanıcıyı Sil',
    userName: 'Kullanıcı Adı', userEmail: 'Email', userRole: 'Rol',
    userStatus: 'Durum', resetPassword: 'Şifre Sıfırla', createUser: 'Kullanıcı Oluştur',

    // Bildirimler
    allNotifications: 'Tüm Bildirimler',

    // Mesajlar
    sendMessage: 'Gönder', typeMessage: 'Mesaj yaz...', noMessages: 'Henüz mesaj yok',
    newMessage: 'Yeni Konuşma',

    // Monitor & ActivityLog
    systemStatus: 'Sistem Durumu', noLogs: 'Kayıt bulunamadı',
    activityType: 'İşlem Türü', activityUser: 'Kullanıcı', activityTime: 'Zaman',

    // Boş durumlar
    noData: 'Veri yok', noResults: 'Sonuç bulunamadı',

    // Dashboard
    taskStatus: 'Görev Durumu', priorityDistribution: 'Öncelik Dağılımı',
    monthlyMeetings: 'Aylık Toplantılar', recentMeetings: 'Son Toplantılar',
    activeTasks: 'Aktif Görevler', noMeetingsYet: 'Toplantı yok',
    noPendingTasks: 'Bekleyen görev yok', unreadNotifications: 'Okunmamış Bildirimler',
    noUnreadNotif: 'Okunmamış bildirim yok', upcomingBirthdays: 'Yaklaşan Doğum Günleri',
    upcomingReminders: 'Yaklaşan Hatırlatıcılar', withinDays: 'gün içinde',
    tomorrow: 'Yarın', repeat: 'Tekrar', all: 'Tümü',
    analysisWidget: 'Analizler', recentActivity: 'Son Aktivite',
    notifAndReminders: 'Bildirimler & Hatırlatıcılar',
    birthdayToday: 'Bugün doğum günü!',
    goodMorning: 'Günaydın', goodAfternoon: 'İyi günler', goodEvening: 'İyi akşamlar',
    activeTasksWaiting: 'aktif görev seni bekliyor.',
    greatDay: 'Bugün harika bir gün!',
    totalPersons: 'Toplam Kişi', totalTasks: 'Toplam Görev',

    // Kişiler sayfası ek anahtarlar
    firstName: 'Ad', lastName: 'Soyad', personPosition: 'Görev / Unvan',
    personOrganization: 'Kurum', loginPassword: 'Giriş Şifresi',
    personBirthDate: 'Doğum Tarihi', personAddress: 'Adres',
    personRelationships: 'ilişki', personDocuments: 'evrak',
    personsRegistered: 'kişi kayıtlı', personsSelected: 'kişi seçildi',
    selectOnPage: 'Bu sayfadakileri seç', bulkDelete: 'Toplu Silme',
    deleteAll: 'Hepsini Sil', template: 'Şablon',
    noPersonsFound: 'Arama sonucu bulunamadı',
    prevPage: '← Önceki', nextPage: 'Sonraki →',
    minChars: 'En az 6 karakter', positionPlaceholder: 'Müdür, Mühendis...',
    orgPlaceholder: 'Şirket adı...',
    firstNameRequired: 'Ad zorunludur', lastNameRequired: 'Soyad zorunludur',
    personsAdded: 'kişi eklendi', personsDeleted: 'kişi silindi',
    searchBtn: 'Ara',
  },
  en: {
    // Existing keys (do not touch)
    dashboard: 'Dashboard', persons: 'Persons', meetings: 'Meetings',
    calendar: 'Calendar', tasks: 'Tasks', tags: 'Tags',
    timeline: 'Timeline', notifications: 'Notifications', reminders: 'Reminders',
    messages: 'Messages', monitor: 'System Monitor', activityLog: 'Activity',
    admin: 'Admin Panel', profile: 'Profile', logout: 'Log Out',
    search: 'Search persons, meetings or tasks...', lightMode: 'Light mode',
    darkMode: 'Dark mode', language: 'Language', noResult: 'No results found',
    management: 'Management', communication: 'Communication', system: 'System',
    markAllRead: 'Mark all as read', noNotif: 'No notifications',
    langSettings: 'Language Settings', langDesc: 'Select languages available to users.',

    // General buttons
    save: 'Save', cancel: 'Cancel', edit: 'Edit', delete: 'Delete',
    add: 'Add', create: 'Create', close: 'Close', back: 'Back',
    filter: 'Filter', clear: 'Clear',
    loading: 'Loading...', confirm: 'Confirm', yes: 'Yes', no: 'No',
    actions: 'Actions', detail: 'Detail', view: 'View', status: 'Status',
    date: 'Date', name: 'Name', email: 'Email', phone: 'Phone',
    note: 'Note', notes: 'Notes', description: 'Description', type: 'Type',
    role: 'Role', active: 'Active', inactive: 'Inactive', new: 'New',

    // Page titles
    pagePersons: 'Persons', pageMeetings: 'Meetings', pageCalendar: 'Calendar',
    pageTasks: 'Tasks', pageTags: 'Tags', pageTimeline: 'Timeline',
    pageReminders: 'Reminders', pageMessages: 'Messages', pageMonitor: 'System Monitor',
    pageActivityLog: 'Activity Log', pageAdmin: 'Admin Panel', pageProfile: 'My Profile',
    pageDashboard: 'Dashboard',

    // Persons
    addPerson: 'New Person', editPerson: 'Edit Person', deletePerson: 'Delete Person',
    personName: 'Full Name', personPhone: 'Phone', personEmail: 'Email',
    personTag: 'Tag', personNote: 'Note', personMeeting: 'Meeting', personTask: 'Task',
    noPersons: 'No persons added yet', searchPerson: 'Search by name, email or organization...',
    personDetail: 'Person Detail', addNote: 'Add Note', addTag: '+ Tag',
    addMeeting: 'Add Meeting', addTask: 'Add Task',

    // Meetings
    editMeeting: 'Edit Meeting', deleteMeeting: 'Delete Meeting',
    meetingTitle: 'Meeting Title', meetingDate: 'Date', meetingTime: 'Time',
    meetingDuration: 'Duration', meetingLocation: 'Location', meetingParticipant: 'Participant',
    meetingNote: 'Note', noMeetings: 'No meetings created yet',
    meetingDetail: 'Meeting Detail', upcomingMeetings: 'Upcoming Meetings',
    pastMeetings: 'Past Meetings',

    // Tasks
    editTask: 'Edit Task', deleteTask: 'Delete Task',
    taskTitle: 'Task Title', taskDesc: 'Description', taskDue: 'Due Date',
    taskPriority: 'Priority', taskAssigned: 'Assigned To', taskStatus: 'Status',
    noTasks: 'No tasks', taskDone: 'Done', taskPending: 'Pending',
    taskOverdue: 'Overdue',
    priorityHigh: 'High', priorityMedium: 'Medium', priorityLow: 'Low',
    statusTodo: 'To Do', statusInProgress: 'In Progress', statusDone: 'Done',

    // Calendar
    today: 'Today', week: 'Week', month: 'Month', year: 'Year', noEvents: 'No events',

    // Tags
    editTag: 'Edit Tag', deleteTag: 'Delete Tag',
    tagName: 'Tag Name', tagColor: 'Color', noTags: 'No tags yet',

    // Reminders
    addReminder: 'New Reminder', editReminder: 'Edit Reminder',
    deleteReminder: 'Delete Reminder', reminderTitle: 'Title',
    reminderDate: 'Date & Time', noReminders: 'No active reminders',

    // Profile
    profileInfo: 'Account Info', changePassword: 'Change Password',
    currentPassword: 'Current Password', newPassword: 'New Password',
    confirmPassword: 'Confirm New Password', updateProfile: 'Update Profile',
    passwordChanged: 'Password updated successfully.',

    // Admin
    userManagement: 'User Management', addUser: 'New User',
    editUser: 'Edit User', deleteUser: 'Delete User',
    userName: 'Username', userEmail: 'Email', userRole: 'Role',
    userStatus: 'Status', resetPassword: 'Reset Password', createUser: 'Create User',

    // Notifications
    allNotifications: 'All Notifications',

    // Messages
    sendMessage: 'Send', typeMessage: 'Type a message...', noMessages: 'No messages yet',
    newMessage: 'New Conversation',

    // Monitor & ActivityLog
    systemStatus: 'System Status', noLogs: 'No records found',
    activityType: 'Action Type', activityUser: 'User', activityTime: 'Time',

    // Empty states
    noData: 'No data', noResults: 'No results found',

    // Dashboard
    taskStatus: 'Task Status', priorityDistribution: 'Priority Distribution',
    monthlyMeetings: 'Monthly Meetings', recentMeetings: 'Recent Meetings',
    activeTasks: 'Active Tasks', noMeetingsYet: 'No meetings',
    noPendingTasks: 'No pending tasks', unreadNotifications: 'Unread Notifications',
    noUnreadNotif: 'No unread notifications', upcomingBirthdays: 'Upcoming Birthdays',
    upcomingReminders: 'Upcoming Reminders', withinDays: 'days',
    tomorrow: 'Tomorrow', repeat: 'Repeat', all: 'All',
    analysisWidget: 'Analytics', recentActivity: 'Recent Activity',
    notifAndReminders: 'Notifications & Reminders',
    birthdayToday: 'Birthday today!',
    goodMorning: 'Good morning', goodAfternoon: 'Good afternoon', goodEvening: 'Good evening',
    activeTasksWaiting: 'active tasks waiting for you.',
    greatDay: 'Have a great day!',
    totalPersons: 'Total Persons', totalTasks: 'Total Tasks',

    // Persons page extra keys
    firstName: 'First Name', lastName: 'Last Name', personPosition: 'Position / Title',
    personOrganization: 'Organization', loginPassword: 'Login Password',
    personBirthDate: 'Birth Date', personAddress: 'Address',
    personRelationships: 'relationship(s)', personDocuments: 'document(s)',
    personsRegistered: 'persons registered', personsSelected: 'persons selected',
    selectOnPage: 'Select on this page', bulkDelete: 'Bulk Delete',
    deleteAll: 'Delete All', template: 'Template',
    noPersonsFound: 'No search results found',
    prevPage: '← Previous', nextPage: 'Next →',
    minChars: 'At least 6 characters', positionPlaceholder: 'Manager, Engineer...',
    orgPlaceholder: 'Company name...',
    firstNameRequired: 'First name is required', lastNameRequired: 'Last name is required',
    personsAdded: 'persons added', personsDeleted: 'persons deleted',
    searchBtn: 'Search',
  },
  de: {
    // Existing keys (do not touch)
    dashboard: 'Dashboard', persons: 'Personen', meetings: 'Meetings',
    calendar: 'Kalender', tasks: 'Aufgaben', tags: 'Tags',
    timeline: 'Zeitachse', notifications: 'Benachrichtigungen', reminders: 'Erinnerungen',
    messages: 'Nachrichten', monitor: 'Systemmonitor', activityLog: 'Aktivität',
    admin: 'Admin-Panel', profile: 'Profil', logout: 'Abmelden',
    search: 'Personen, Meetings oder Aufgaben suchen...', lightMode: 'Heller Modus',
    darkMode: 'Dunkler Modus', language: 'Sprache', noResult: 'Keine Ergebnisse',
    management: 'Verwaltung', communication: 'Kommunikation', system: 'System',
    markAllRead: 'Alle als gelesen markieren', noNotif: 'Keine Benachrichtigungen',
    langSettings: 'Spracheinstellungen', langDesc: 'Sprachen für Benutzer auswählen.',

    // Allgemeine Schaltflächen
    save: 'Speichern', cancel: 'Abbrechen', edit: 'Bearbeiten', delete: 'Löschen',
    add: 'Hinzufügen', create: 'Erstellen', close: 'Schließen', back: 'Zurück',
    filter: 'Filtern', clear: 'Löschen',
    loading: 'Wird geladen...', confirm: 'Bestätigen', yes: 'Ja', no: 'Nein',
    actions: 'Aktionen', detail: 'Details', view: 'Ansehen', status: 'Status',
    date: 'Datum', name: 'Name', email: 'E-Mail', phone: 'Telefon',
    note: 'Notiz', notes: 'Notizen', description: 'Beschreibung', type: 'Typ',
    role: 'Rolle', active: 'Aktiv', inactive: 'Inaktiv', new: 'Neu',

    // Seitentitel
    pagePersons: 'Personen', pageMeetings: 'Meetings', pageCalendar: 'Kalender',
    pageTasks: 'Aufgaben', pageTags: 'Tags', pageTimeline: 'Zeitachse',
    pageReminders: 'Erinnerungen', pageMessages: 'Nachrichten', pageMonitor: 'Systemmonitor',
    pageActivityLog: 'Aktivitätsprotokoll', pageAdmin: 'Admin-Panel', pageProfile: 'Mein Profil',
    pageDashboard: 'Dashboard',

    // Personen
    addPerson: 'Neue Person', editPerson: 'Person bearbeiten', deletePerson: 'Person löschen',
    personName: 'Vollständiger Name', personPhone: 'Telefon', personEmail: 'E-Mail',
    personTag: 'Tag', personNote: 'Notiz', personMeeting: 'Meeting', personTask: 'Aufgabe',
    noPersons: 'Noch keine Personen hinzugefügt', searchPerson: 'Nach Name, E-Mail oder Organisation suchen...',
    personDetail: 'Personendetail', addNote: 'Notiz hinzufügen', addTag: '+ Tag',
    addMeeting: 'Meeting hinzufügen', addTask: 'Aufgabe hinzufügen',

    // Meetings
    editMeeting: 'Meeting bearbeiten', deleteMeeting: 'Meeting löschen',
    meetingTitle: 'Meeting-Titel', meetingDate: 'Datum', meetingTime: 'Uhrzeit',
    meetingDuration: 'Dauer', meetingLocation: 'Ort', meetingParticipant: 'Teilnehmer',
    meetingNote: 'Notiz', noMeetings: 'Noch keine Meetings erstellt',
    meetingDetail: 'Meeting-Detail', upcomingMeetings: 'Bevorstehende Meetings',
    pastMeetings: 'Vergangene Meetings',

    // Aufgaben
    editTask: 'Aufgabe bearbeiten', deleteTask: 'Aufgabe löschen',
    taskTitle: 'Aufgabentitel', taskDesc: 'Beschreibung', taskDue: 'Fälligkeitsdatum',
    taskPriority: 'Priorität', taskAssigned: 'Zugewiesen an', taskStatus: 'Status',
    noTasks: 'Keine Aufgaben', taskDone: 'Erledigt', taskPending: 'Ausstehend',
    taskOverdue: 'Überfällig',
    priorityHigh: 'Hoch', priorityMedium: 'Mittel', priorityLow: 'Niedrig',
    statusTodo: 'Zu erledigen', statusInProgress: 'In Bearbeitung', statusDone: 'Erledigt',

    // Kalender
    today: 'Heute', week: 'Woche', month: 'Monat', year: 'Jahr', noEvents: 'Keine Ereignisse',

    // Tags
    editTag: 'Tag bearbeiten', deleteTag: 'Tag löschen',
    tagName: 'Tag-Name', tagColor: 'Farbe', noTags: 'Noch keine Tags',

    // Erinnerungen
    addReminder: 'Neue Erinnerung', editReminder: 'Erinnerung bearbeiten',
    deleteReminder: 'Erinnerung löschen', reminderTitle: 'Titel',
    reminderDate: 'Datum und Uhrzeit', noReminders: 'Keine aktiven Erinnerungen',

    // Profil
    profileInfo: 'Kontoinformationen', changePassword: 'Passwort ändern',
    currentPassword: 'Aktuelles Passwort', newPassword: 'Neues Passwort',
    confirmPassword: 'Neues Passwort bestätigen', updateProfile: 'Profil aktualisieren',
    passwordChanged: 'Passwort erfolgreich aktualisiert.',

    // Admin
    userManagement: 'Benutzerverwaltung', addUser: 'Neuer Benutzer',
    editUser: 'Benutzer bearbeiten', deleteUser: 'Benutzer löschen',
    userName: 'Benutzername', userEmail: 'E-Mail', userRole: 'Rolle',
    userStatus: 'Status', resetPassword: 'Passwort zurücksetzen', createUser: 'Benutzer erstellen',

    // Benachrichtigungen
    allNotifications: 'Alle Benachrichtigungen',

    // Nachrichten
    sendMessage: 'Senden', typeMessage: 'Nachricht eingeben...', noMessages: 'Noch keine Nachrichten',
    newMessage: 'Neues Gespräch',

    // Monitor & Aktivitätsprotokoll
    systemStatus: 'Systemstatus', noLogs: 'Keine Einträge gefunden',
    activityType: 'Aktionstyp', activityUser: 'Benutzer', activityTime: 'Zeit',

    // Leere Zustände
    noData: 'Keine Daten', noResults: 'Keine Ergebnisse gefunden',

    // Dashboard
    taskStatus: 'Aufgabenstatus', priorityDistribution: 'Prioritätsverteilung',
    monthlyMeetings: 'Monatliche Meetings', recentMeetings: 'Letzte Meetings',
    activeTasks: 'Aktive Aufgaben', noMeetingsYet: 'Keine Meetings',
    noPendingTasks: 'Keine ausstehenden Aufgaben', unreadNotifications: 'Ungelesene Benachrichtigungen',
    noUnreadNotif: 'Keine ungelesenen Benachrichtigungen', upcomingBirthdays: 'Bevorstehende Geburtstage',
    upcomingReminders: 'Bevorstehende Erinnerungen', withinDays: 'Tage',
    tomorrow: 'Morgen', repeat: 'Wiederholen', all: 'Alle',
    analysisWidget: 'Analysen', recentActivity: 'Letzte Aktivität',
    notifAndReminders: 'Benachrichtigungen & Erinnerungen',
    birthdayToday: 'Heute Geburtstag!',
    goodMorning: 'Guten Morgen', goodAfternoon: 'Guten Tag', goodEvening: 'Guten Abend',
    activeTasksWaiting: 'aktive Aufgaben warten auf Sie.',
    greatDay: 'Einen schönen Tag!',
    totalPersons: 'Personen gesamt', totalTasks: 'Aufgaben gesamt',

    // Personen-Seite extra Schlüssel
    firstName: 'Vorname', lastName: 'Nachname', personPosition: 'Position / Titel',
    personOrganization: 'Organisation', loginPassword: 'Anmeldepasswort',
    personBirthDate: 'Geburtsdatum', personAddress: 'Adresse',
    personRelationships: 'Beziehung(en)', personDocuments: 'Dokument(e)',
    personsRegistered: 'Personen registriert', personsSelected: 'Personen ausgewählt',
    selectOnPage: 'Diese Seite auswählen', bulkDelete: 'Massenlöschung',
    deleteAll: 'Alle löschen', template: 'Vorlage',
    noPersonsFound: 'Keine Suchergebnisse gefunden',
    prevPage: '← Zurück', nextPage: 'Weiter →',
    minChars: 'Mindestens 6 Zeichen', positionPlaceholder: 'Manager, Ingenieur...',
    orgPlaceholder: 'Firmenname...',
    firstNameRequired: 'Vorname ist erforderlich', lastNameRequired: 'Nachname ist erforderlich',
    personsAdded: 'Personen hinzugefügt', personsDeleted: 'Personen gelöscht',
    searchBtn: 'Suchen',
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  /* Admin-enabled languages (default: all) */
  const [enabledLangs, setEnabledLangs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pt_enabled_langs')) || ['tr', 'en', 'de']; }
    catch { return ['tr', 'en', 'de']; }
  });

  /* User-selected language */
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem('pt_lang') || 'tr';
    return saved;
  });

  /* If selected lang is disabled by admin, fall back to first enabled */
  useEffect(() => {
    if (!enabledLangs.includes(lang)) {
      const fallback = enabledLangs[0] || 'tr';
      setLang(fallback);
      localStorage.setItem('pt_lang', fallback);
    }
  }, [enabledLangs, lang]);

  const saveEnabledLangs = (langs) => {
    const next = langs.length === 0 ? ['tr'] : langs; // at least one
    setEnabledLangs(next);
    localStorage.setItem('pt_enabled_langs', JSON.stringify(next));
  };

  const changeLang = (code) => {
    setLang(code);
    localStorage.setItem('pt_lang', code);
  };

  const t = (key) => translations[lang]?.[key] ?? translations['tr']?.[key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, changeLang, t, enabledLangs, saveEnabledLangs }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
