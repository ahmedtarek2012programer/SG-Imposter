/**
 * Secret Words Database (Arabic)
 */
const words = [
    "تفاحة", "موز", "برتقال", "سيارة", "طيارة", 
    "قطة", "كلب", "أسد", "نمر", "فيل",
    "مدرسة", "مستشفى", "جامعة", "مسجد", "ملعب",
    "كمبيوتر", "جوال", "تلفزيون", "ساعة", "نظارة",
    "قلم", "كتاب", "ورقة", "حقيبة", "سبورة",
    "شمس", "قمر", "نجمة", "سحابة", "مطر",
    "بحر", "نهر", "جبل", "صحراء", "غابة",
    "بيتزا", "برجر", "شاورما", "كنافة", "بقلاوة",
    "كرة قدم", "سباحة", "ركض", "سلة", "تنس",
    "مصر", "السعودية", "الإمارات", "الكويت", "المغرب",
    "طبيب", "مهندس", "معلم", "طباخ", "شرطي"
];

module.exports = {
    getRandomWord: () => {
        return words[Math.floor(Math.random() * words.length)];
    },
    
    getDistractors: (correctWord, count = 3) => {
        const filtered = words.filter(w => w !== correctWord);
        // Shuffle filtered
        for (let i = filtered.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
        }
        return filtered.slice(0, count);
    }
};
