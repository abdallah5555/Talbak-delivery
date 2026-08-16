/**
 * Islamic Rotating Religious Reminders for "طلبك دليفري"
 * Curated authentic Dhikr, Tahmeed, Tasbeeh, and Salawat.
 */

export interface ReligiousReminderItem {
  id: string;
  title: string;
  text: string;
  category: 'salawat' | 'tasbeeh' | 'istighfar' | 'dua' | 'tahmeed';
  iconEmoji: string;
}

export const RELIGIOUS_REMINDERS_LIST: ReligiousReminderItem[] = [
  {
    id: 'rem-1',
    title: 'تذكير بالصلاة على النبي 🤍',
    text: 'اللهم صلِّ وسلِّم وبارك على سيدنا ونبينا محمد ﷺ',
    category: 'salawat',
    iconEmoji: '🤍'
  },
  {
    id: 'rem-2',
    title: 'تذكير بالتسبيح 🌿',
    text: 'سبحان الله وبحمده، سبحان الله العظيم ✨',
    category: 'tasbeeh',
    iconEmoji: '🌿'
  },
  {
    id: 'rem-3',
    title: 'كنز من كنوز الجنة 💫',
    text: 'لا حول ولا قوة إلا بالله العلي العظيم',
    category: 'tasbeeh',
    iconEmoji: '💫'
  },
  {
    id: 'rem-4',
    title: 'تذكير بالاستغفار 🤲',
    text: 'أستغفر الله العظيم الذي لا إله إلا هو الحي القيوم وأتوب إليه',
    category: 'istighfar',
    iconEmoji: '🤲'
  },
  {
    id: 'rem-5',
    title: 'دعاء ذي النون 🕊️',
    text: 'لا إله إلا أنت سبحانك إني كنت من الظالمين',
    category: 'dua',
    iconEmoji: '🕊️'
  },
  {
    id: 'rem-6',
    title: 'دعاء طيب ومبارك 🌸',
    text: 'اللهم إنا نسألك من الخير كله عاجله وآجله ما علمنا منه وما لم نعلم',
    category: 'dua',
    iconEmoji: '🌸'
  },
  {
    id: 'rem-7',
    title: 'رضا بالدين والرسول 🤍',
    text: 'رضيت بالله رباً، وبالإسلام ديناً، وبمحمد ﷺ نبياً ورسولاً',
    category: 'dua',
    iconEmoji: '🤍'
  },
  {
    id: 'rem-8',
    title: 'استغاثة برحمة الله ✨',
    text: 'يا حي يا قيوم برحمتك أستغيث، أصلح لي شأني كله ولا تكلني إلى نفسي طرفة عين',
    category: 'dua',
    iconEmoji: '✨'
  },
  {
    id: 'rem-9',
    title: 'الباقيات الصالحات 🍃',
    text: 'سبحان الله، والحمد لله، ولا إله إلا الله، والله أكبر',
    category: 'tasbeeh',
    iconEmoji: '🍃'
  },
  {
    id: 'rem-10',
    title: 'تذكير بالشكر والحمد 🤲',
    text: 'الحمد لله حمداً كثيراً طيباً مباركاً فيه ملء السماوات والأرض',
    category: 'tahmeed',
    iconEmoji: '🤲'
  }
];

let currentReminderIndex = 0;

/**
 * Get next rotating religious reminder in sequence
 */
export function getNextRotatingReminder(): ReligiousReminderItem {
  try {
    const savedIdx = localStorage.getItem('talabak_last_reminder_idx');
    if (savedIdx !== null) {
      currentReminderIndex = (parseInt(savedIdx, 10) + 1) % RELIGIOUS_REMINDERS_LIST.length;
    } else {
      currentReminderIndex = Math.floor(Math.random() * RELIGIOUS_REMINDERS_LIST.length);
    }
    localStorage.setItem('talabak_last_reminder_idx', currentReminderIndex.toString());
  } catch {
    currentReminderIndex = (currentReminderIndex + 1) % RELIGIOUS_REMINDERS_LIST.length;
  }
  return RELIGIOUS_REMINDERS_LIST[currentReminderIndex];
}

/**
 * Get a random reminder
 */
export function getRandomReminder(): ReligiousReminderItem {
  const idx = Math.floor(Math.random() * RELIGIOUS_REMINDERS_LIST.length);
  return RELIGIOUS_REMINDERS_LIST[idx];
}
