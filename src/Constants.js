/**
 * Game Configuration Constants
 */
module.exports = {
  // Limits
  MIN_PLAYERS: 3,
  MAX_PLAYERS: 20,

  // Timings (in milliseconds)
    // Timings (in milliseconds)
    JOIN_TIMEOUT: 40 * 1000,
    ROUND_DURATION: 40 * 1000, // Duration for Q&A round
    VOTE_TIMEOUT: 40 * 1000,
    
    // Colors
    EMBED_COLOR: '#E74C3C',
    
    // Game States
    GAME_STATES: {
        LOBBY: 'LOBBY',
        PLAYING: 'PLAYING',
        VOTING: 'VOTING',
        ENDED: 'ENDED'
    },
    
    // Strings (Arabic)
    STRINGS: {
        GAME_TITLE: '🎮 لعبة Imposter',
        GAME_DESC: 'لعبة Imposter جماعية! البوت سيختار كلمة سرية للجميع ما عدا الـ Imposter. عليكم اكتشافه!',
        JOIN_BTN: 'انضم للعبة',
        JOINED_MSG: 'تم انضمامك بنجاح!',
        ALREADY_JOINED: 'أنت منضم بالفعل!',
        GAME_CANCELLED: 'تم إلغاء اللعبة لعدم وجود عدد كافٍ من اللاعبين (3 على الأقل).',
        GAME_STARTING: 'بدأت اللعبة! راجعوا رسائلكم الخاصة/السرية.',
        IMPOSTER_DM: '🤫 أنت الـ **Imposter**! حاول أن لا تكشف نفسك. لا تعرف الكلمة السرية.',
        CREW_DM: 'أنت لاعب عادي. الكلمة السرية هي: **{word}**',
        IMPOSTER_COUNT_MSG: 'عدد الـ Imposters في هذا الدور: **{count}**',
        ROUND_START: 'الجولة {round} بدأت!',
        QA_PAIR: '🔴 <@{asker}> اسأل <@{answerer}>\n⏳ لديكم 40 ثانية.',
    VOTE_START: "🗳️ حان وقت التصويت! من هو الـ Imposter؟",
    CREW_WIN: "🏆 فاز اللاعبون العاديون! تم كشف الـ Imposter.",
    IMPOSTER_WIN: "🔪 فاز الـ Imposter! لم يتم كشفه.",
    DRAW: "⚖️ تعادل! تم كشف نصف الـ Imposters فقط.",
    GAME_STOPPED: "🛑 تم إيقاف اللعبة يدوياً.",
    NOT_ADMIN: "فقط الأدمن يمكنه إيقاف اللعبة.",
    NO_GAME: "لا توجد لعبة جارية حالياً.",
    ALREADY_GAME: "توجد لعبة جارية بالفعل في هذا الشات!",
  },
};
