const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// --- قوائم البيانات ---
const wordsTak = ["صمت", "باب", "عين", "صوت", "رسم", "كثر", "تم", "صد", "شرح", "صوف", "صيف", "سور", "شمل", "كف", "ظل", "فاس", "سكت", "روح", "دب", "فن", "كل", "خل", "طير", "قلم", "حب", "نار"];
const wordsTsh = ["ضمير", "في", "روح", "كيف", "عيني", "حرام", "بطل", "الوضع", "يلا", "عمري", "مدري", "الحين", "واصل", "شوي", "واحد", "بسيط", "شيخ", "بس", "اركب", "فحل", "اشوفك", "تحسب", "حلو", "مني", "وين", "مستمر", "يا", "عائلة", "كمل", "فاخر", "اكتب", "خايف", "فيك", "رقم", "خفت", "مقال", "طويله", "عليك", "احسك", "كيفك", "ليه", "كله"];
const phrasesDub = ["لين ما اشوفه في هوا", "طيب شوف كيف حبي", "اللي تبيه قوله", "خليك من الكلام الزايد", "ابيك رجال تمشي قدام"];
const wordsEsh = ["تعد", "القراءة", "من", "أهم", "الوسائل", "لاكتساب", "المعرفة", "وتطوير", "الذات", "فهي", "توسع", "الآفاق", "وتثري", "العقل", "وتزيد", "الحصيلة", "اللغوية"];
const wordsWik = ["اللجنة", "الاستشارية", "لشؤون", "الادارة", "والميزانية", "استعرضت", "بيان", "الامين", "العام", "بشان", "مشروع", "القرار", "المتعلق", "بتمديد", "ولاية", "اشتراك"];
const phrasesEk = ["الجواب دايم موجود جواك", "القلب يميل لمن يطمئنه", "أحياناً تكون بخير بس ناقصك صوت"];

// --- الذاكرة ---
const activeGames = new Map();
const userTitles = new Map();
const userDevice = new Map(); 
const userSettings = new Map(); 
let currentTourney = null;

const leaderBoard = {
  khariji: { tak: 0, tsh: 0, wik: 0, esh: 0, ek: 0, dub: 0, ad: 0 },
  jawwal: { tak: 0, tsh: 0, wik: 0, esh: 0, ek: 0, dub: 0, ad: 0 }
};
const topPlayers = { khariji: {}, jawwal: {} };

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();
  const args = content.split(/\s+/);

  // ================= [ أوامر الإدارة مع حماية رتبة Administrator ] =================
  if (content.startsWith('وضع لقب') || content.startsWith('وضع صنف')) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply("ما تقدر");
    }

    if (content.startsWith('وضع لقب')) {
        const target = message.mentions.users.first();
        const title = args.slice(2).join(' ').replace(/<@!?\d+>/, '').trim();
        if (target && title) { 
            userTitles.set(target.id, title); 
            return message.reply(`تم وضع اللقب لـ ${target.username} ✅`); 
        }
    }

    if (content.startsWith('وضع صنف')) {
        const target = message.mentions.users.first();
        const type = args.find(a => a === 'خارجي' || a === 'جوال');
        if (target && type) { 
            userDevice.set(target.id, type); 
            return message.reply(`تم وضع صنف ${target.username} إلى **${type}** ✅`); 
        }
    }
  }

  // ================= [ التوب والجولة ] =================
  if (content === 'توب خارجي' || content === 'توب جوال') {
    const typeKey = content === 'توب خارجي' ? 'khariji' : 'jawwal';
    const typeName = content === 'توب خارجي' ? 'الخارجي' : 'الجوال';
    let msg = `🏆 **أسرع وحوش صنف ${typeName}:**\n\n`;
    const sectionsAr = { tak: "تك", tsh: "طش", wik: "ويك", esh: "عش", ek: "عك", dub: "دب", ad: "عد" };
    for (const key in sectionsAr) {
        msg += `• **${sectionsAr[key]}:** ${topPlayers[typeKey][key] || 'لا يوجد'} (${leaderBoard[typeKey][key]} WPM)\n`;
    }
    return message.channel.send(msg);
  }

  // ================= [ نظام الصنف - مع القفل ] =================
  if (content === 'صنفي') {
    if (userDevice.has(message.author.id)) {
        return message.reply("ما تقدر، خل المالك يغيره لك");
    }
    return message.reply("اختار صنفك :\n**خارجي**\n**جوال**");
  }

  if (content === 'خارجي' || content === 'جوال') {
    if (userDevice.has(message.author.id)) {
        return message.reply("ما تقدر، خل المالك يغيره لك");
    }
    userDevice.set(message.author.id, content);
    return message.reply(`تم اختيار صنفك: **${content}** ✅`);
  }

  // ================= [ نظام الألعاب ] =================
  const cmd = args[0];
  if (['عش', 'طش', 'ويك', 'عك', 'تك', 'دب', 'عد'].includes(cmd)) {
    if (!userDevice.has(message.author.id)) return message.reply("⚠️ اختر صنفك أولاً (صنفي)");

    if (!userSettings.has(message.author.id)) userSettings.set(message.author.id, { tsh: 5, wik: 5, esh: 5 });
    const prefs = userSettings.get(message.author.id);

    if (args[1] && ['طش', 'ويك', 'عش'].includes(cmd)) {
        const num = parseInt(args[1]);
        if (isNaN(num) || num < 1 || num > 50) return message.reply("الحد فقط من 1 إلى 50");
        prefs[cmd === 'طش' ? 'tsh' : (cmd === 'ويك' ? 'wik' : 'esh')] = num;
        return message.reply(`تم تحديد عدد كلمات ${cmd} إلى (${num}) ✅`);
    }

    let expected, totalWords, gameType = cmd === 'ويك' ? 'wik' : (cmd === 'عش' ? 'esh' : (cmd === 'عك' ? 'ek' : (cmd === 'طش' ? 'tsh' : (cmd === 'عد' ? 'ad' : cmd))));

    if (cmd === 'عد') {
        expected = "1112223333333333 #";
        await message.channel.send(expected);
        totalWords = 2;
    } else if (cmd === 'تك') {
        const wordCount = Math.floor(Math.random() * 3) + 2; 
        let selected = [...wordsTak].sort(() => 0.5 - Math.random()).slice(0, wordCount);
        let displayArray = [];
        let finalExpectedArray = [];
        selected.forEach(w => {
            let repeatNum = Math.floor(Math.random() * 3) + 2; 
            displayArray.push(`${w}(${repeatNum})`);
            for(let i = 0; i < repeatNum; i++) finalExpectedArray.push(w);
        });
        await message.channel.send(`كرر الكلمات التالية:\n**${displayArray.join(' ')}**`);
        expected = finalExpectedArray.join('');
        totalWords = finalExpectedArray.length;
        gameType = 'tak';
    } else if (cmd === 'طش' || cmd === 'ويك' || cmd === 'عش') {
        const count = prefs[gameType];
        let list = cmd === 'طش' ? wordsTsh : (cmd === 'ويك' ? wordsWik : wordsEsh);
        let sel = [];
        for(let i=0; i<count; i++) sel.push(list[Math.floor(Math.random() * list.length)]);
        await message.channel.send(sel.join(' , '));
        expected = sel.join(' '); totalWords = count;
    } else if (cmd === 'عك') {
        const p = phrasesEk[Math.floor(Math.random() * phrasesEk.length)];
        await message.channel.send(`اعكس الجملة: **${p}**`);
        expected = p.split(' ').reverse().join(' '); totalWords = expected.split(' ').length;
    } else if (cmd === 'دب') {
        const p = phrasesDub[Math.floor(Math.random() * phrasesDub.length)];
        let f = []; p.split(' ').forEach(w => f.push(w, w));
        await message.channel.send(p);
        expected = f.join(' '); totalWords = f.length;
    }

    activeGames.set(message.author.id, { expected, startTime: Date.now(), totalWords, type: gameType, isTak: cmd === 'تك' });
    return;
  }

  // ================= [ التحقق ] =================
  if (activeGames.has(message.author.id)) {
    const game = activeGames.get(message.author.id);
    if (game.isTak && (content.includes('(') || content.includes(')'))) {
        await message.reply(`خطا عليك يا نسوخي لعد تنسخ ولا بعطيك كتم `);
        activeGames.delete(message.author.id);
        return;
    }

    const userInputClean = game.isTak ? content.replace(/\s+/g, '') : content.replace(/\s+/g, ' ').trim();
    const targetExpected = game.isTak ? game.expected : game.expected.trim();

    if (userInputClean === targetExpected) {
      const time = (Date.now() - game.startTime) / 1000;
      let wpm = Math.round((game.totalWords / time) * 60);
      const dev = userDevice.get(message.author.id) === 'خارجي' ? 'khariji' : 'jawwal';
      const name = userTitles.get(message.author.id) || message.author.username;

      let replyMsg = `✅ جبتها صح يا زاحف ⚡\n⏱️ سرعتك: **${time.toFixed(3)}** ثانية\n⌨️ WPM: **${wpm}**`;

      if (game.isTak && ((game.totalWords >= 10 && time < 4) || (time < 1.5))) {
          replyMsg += `\nصح عليك يا بطل بنخلي المالك يشوف وضع دزتك`;
      }

      await message.reply(replyMsg);

      if (wpm > leaderBoard[dev][game.type]) {
        leaderBoard[dev][game.type] = wpm;
        topPlayers[dev][game.type] = name;
      }
      activeGames.delete(message.author.id);
    }
  }
});
// اسحب التوكن من الـ Secrets أو الـ Environment Variables
const token = process.env.DISCORD_TOKEN; 

client.login(token);
