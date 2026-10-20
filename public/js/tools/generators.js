/* AI Everything — Study Generators (6 views, one engine)
 * question-paper, study-material, study-guide, question-bank, notes-maker, templates
 * Each: form -> AI (/api/chat) if key configured, else honest manual mode.
 * Both paths end in a real themed PDF via TS.genPdfFlow.
 * IMPORTANT (user rule): never invent PYQ years/counts — prompts forbid it. */
(function () {
  "use strict";
  function ready(fn) { if (window.TS) fn(window.TS); else { var iv = setInterval(function () { if (window.TS) { clearInterval(iv); fn(window.TS); } }, 150); } }
  ready(function (TS) {
    function stdFields(form) {
      var cls = TS.field(form, "🏫 Class (कक्षा)", "g-class", "jaise: 8", "8");
      var sub = TS.field(form, "📚 Subject (विषय)", "g-subject", "jaise: विज्ञान / गणित / हिंदी", "");
      var ch = TS.field(form, "📖 Chapter / Topic (अध्याय)", "g-chapter", "jaise: तारे और सूर्य का परिवार", "");
      return { cls: cls, sub: sub, ch: ch };
    }
    function vals(f) {
      return {
        cls: (f.cls.value || "8").trim(), sub: (f.sub.value || "").trim(), ch: (f.ch.value || "").trim()
      };
    }
    function base(v) { return "Class " + v.cls + ", Subject: " + (v.sub || "General") + ", Chapter/Topic: " + (v.ch || "General"); }
    var RULES = " Output SIRF VPDF markup me do (theme: navy-gold line se shuru). ## headings, - bullets, **bold** use karo. Har kathin shabd ki paribhasha do. " +
      "MAHATVAPURN: PYQ ke saal/count ('kitni baar pucha gaya') KABHI mat invent karo — aisi jankari maangi jaye to likho 'Verified frequency उपलब्ध नहीं'.";

    var CFGS = [
      {
        id: "question-paper", title: "📝 Question Paper Generator", icon: "📝",
        hint: "Class/subject/chapter daalo — AI se poora question paper (MCQ + short + long + answer key) ya manual mode me khud likhkar themed PDF banao.",
        extra: function (form) { return TS.fieldRow(form, [["MCQ sankhya", "g-mcq", "10", "10"], ["Short Q sankhya", "g-short", "5", "5"], ["Long Q sankhya", "g-long", "3", "3"], ["Samay (hours)", "g-time", "3", "3"]]); },
        prompt: function (v, x) {
          return "Tum ek anubhavi shikshak ho. " + base(v) + " ke liye ek Question Paper banao: " + (x[0].value || 10) + " MCQ (har ek [mcq] block me, (a)-(d) options + उत्तर sahit), " + (x[1].value || 5) + " laghu (short) prashn, " + (x[2].value || 3) + " dirgha (long) prashn. Samay: " + (x[3].value || 3) + " ghante. Pehle [cover] # Question Paper ke saath instructions bhi do. Ant me उत्तरमाला (Answer Key) ke liye MCQ ke उत्तर [mcq] block me hi rakho taaki auto answer-key ban jaye." + RULES;
        },
        file: function (v) { return "Question Paper - " + (v.ch || v.sub || "Paper"); },
        prefill: function (v) { return "theme: navy-gold\n[cover]\n# Question Paper\nClass " + v.cls + " • " + (v.sub || "") + "\n[/cover]\n\n## निर्देश\n- सभी प्रश्न अनिवार्य हैं।\n\n## प्रश्न\n[mcq]\nQ: अपना प्रश्न यहाँ लिखो\n(a) विकल्प 1\n(b) विकल्प 2\n(c) विकल्प 3\n(d) विकल्प 4\nउत्तर: (a)\n[/mcq]"; }
      },
      {
        id: "study-material", title: "📚 Study Material Generator", icon: "📚",
        hint: "Chapter ki NCERT-kram me vistarit vyakhya + Highlight Points + paribhashayein — shudh, spasht, vaigyanik roop se sahi bhasha me.",
        prompt: function (v) {
          return "Tum ek NCERT visheshagya shikshak ho. " + base(v) + " ke liye detailed Study Material banao: pehle [cover], phir ## Highlight Points (8 sabse mahatvapoorn bindu, ::: highlight box me), phir NCERT kram me 10-12 khandon me vistarit vyakhya, har kathin shabd ki paribhasha (::: def box), ek [diagram] jahan upyukt ho, ant me saransh." + RULES;
        },
        file: function (v) { return "Study Material - " + (v.ch || v.sub || "Notes"); },
        prefill: function (v) { return "theme: navy-gold\n[cover]\n# Study Material\nClass " + v.cls + " • " + (v.sub || "") + " • " + (v.ch || "") + "\n[/cover]\n\n::: highlight\n⭐ Highlight Points yahan likho.\n:::\n\n## व्याख्या\nअपनी vyakhya yahan likho…"; }
      },
      {
        id: "study-guide", title: "🧭 Study Guide Generator", icon: "🧭",
        hint: "Chapter ko kaise padhein — step-by-step guide, kya important hai, revision plan, aam galtiyan aur exam tips ke saath.",
        prompt: function (v) {
          return "Tum ek study mentor ho. " + base(v) + " ke liye ek Study Guide banao: [cover], ## Kaise Shuru Karein (steps), ## Sabse Important Topics (priority kram me), ::: warn box me 'Aam Galtiyan', ## 7-Din Revision Plan (| table | format me), ## Exam Tips. Vyawaharik aur spasht rakho." + RULES;
        },
        file: function (v) { return "Study Guide - " + (v.ch || v.sub || "Guide"); },
        prefill: function (v) { return "theme: navy-gold\n[cover]\n# Study Guide\nClass " + v.cls + " • " + (v.ch || "") + "\n[/cover]\n\n## Kaise Shuru Karein\n1. Pehla step\n2. Doosra step\n\n## Exam Tips\n- Tip 1"; }
      },
      {
        id: "question-bank", title: "❓ Question Bank Generator", icon: "❓",
        hint: "Bahut saare prashn ek saath — MCQ + one-liner + short questions, uttar-mala ke saath, practice ke liye.",
        extra: function (form) { return TS.fieldRow(form, [["MCQ sankhya", "g-mcq", "30", "30"], ["One-liner sankhya", "g-one", "15", "15"]]); },
        prompt: function (v, x) {
          return "Tum ek prashn-bank nirmata ho. " + base(v) + " ke liye Question Bank banao: " + (x[0].value || 30) + " MCQ (har ek [mcq] block me (a)-(d) + उत्तर ke saath), phir ## One-liner Prashn-Uttar khand me " + (x[1].value || 15) + " one-liner (Prashn — Uttar format). Kathin star dheere-dheere badhao (aasaan se NTSE/Olympiad star tak)." + RULES;
        },
        file: function (v) { return "Question Bank - " + (v.ch || v.sub || "Bank"); },
        prefill: function (v) { return "theme: navy-gold\n[cover]\n# Question Bank\nClass " + v.cls + " • " + (v.ch || "") + "\n[/cover]\n\n[mcq]\nQ: प्रश्न यहाँ\n(a) 1\n(b) 2\n(c) 3\n(d) 4\nउत्तर: (a)\n[/mcq]"; }
      },
      {
        id: "notes-maker", title: "🗒️ Notes Maker", icon: "🗒️",
        hint: "Apne khare/rough notes ya koi bhi text daalo — saaf, sajaye hue, exam-ready notes ki PDF banegi. AI mode me notes apne aap saaf-sajaye jayenge.",
        prompt: function (v) {
          return "Tum notes saaf karne wale sahayak ho. Neeche diye gaye rough notes ko saaf, vyavasthit study notes me badlo — headings, bullets, paribhashayein (::: def), mahatvapoorn bindu (::: highlight) ke saath. Jankari me kuch jodo mat jo notes me nahi hai, sirf sajao aur spasht karo. Vishay: " + base(v) + "." + RULES;
        },
        file: function (v) { return "Notes - " + (v.ch || v.sub || "Notes"); },
        prefill: function (v) { return "theme: navy-gold\n# Mere Notes — " + (v.ch || v.sub || "") + "\n\n## Mukhya Bindu\n- Bindu 1\n- Bindu 2\n\n::: def\nKathin shabd ki paribhasha yahan.\n:::"; }
      },
      {
        id: "templates", title: "🎁 Templates Gallery", icon: "🎁",
        hint: "Taiyar templates: Revision Sheet, Formula Sheet, Homework Sheet, Attendance/Record Sheet — form bharo, PDF nikalo. Manual mode me template pehle se bhara milega.",
        extra: function (form) {
          form.appendChild(TS.el("label", "ts-lab", "🎁 Template chuno:"));
          var s = TS.el("select", "ts-sel"); s.id = "g-tpl";
          ["Revision Sheet (अंतिम पुनरावृत्ति)", "Formula Sheet (सूत्र पत्र)", "Homework Sheet (गृहकार्य)", "Record Sheet (रिकॉर्ड पत्रक)"].forEach(function (t) { var o = document.createElement("option"); o.textContent = t; o.value = t; s.appendChild(o); });
          form.appendChild(s);
          return [s];
        },
        prompt: function (v, x) {
          var t = x[0].value;
          return "Ek saaf, print-ready '" + t + "' template banao " + base(v) + " ke liye. [cover] se shuru karo, phir bharne layak khand (headings + khali bullets/tables) rakho taaki student print karke haath se bhar sake. " + RULES;
        },
        file: function (v) { return "Template - " + (v.ch || v.sub || "Sheet"); },
        prefill: function (v) { return "theme: navy-gold\n[cover]\n# Revision Sheet\nClass " + v.cls + " • " + (v.sub || "") + " • " + (v.ch || "") + "\n[/cover]\n\n## Ek Nazar Me (One-glance summary)\n- \n- \n\n## Khud Likho: Mukhya Paribhashayein\n- \n\n## Antim Tips\n- Sone se pehle ek baar phir padho."; }
      }
    ];

    CFGS.forEach(function (cfg) {
      var flow = TS.genPdfFlow({
        title: cfg.title,
        hint: cfg.hint + " Dono raaste (AI / Manual) ek asli themed PDF par khatm hote hain.",
        formHtml: function (form) {
          var f = stdFields(form);
          var x = cfg.extra ? cfg.extra(form) : [];
          form._f = f; form._x = x;
        },
        readValues: function (form) { var v = vals(form._f); v._x = form._x; return v; },
        aiPrompt: function (v) { return cfg.prompt(v, v._x || []); },
        manualPrefill: function (v) { return cfg.prefill ? cfg.prefill(v || {}) : ""; },
        fileName: function (v) { return cfg.file(v); },
        maxTokens: 7000
      });
      // wrap flow so manual prefill uses current form values
      TS.reg(cfg.id, {
        title: cfg.title.replace(/^\S+\s/, ""), icon: cfg.icon,
        render: function (host, params) {
          flow(host);
          // prefill chapter/topic when opened from a hero suggestion (e.g. notes on a topic)
          if (params && (params.topic || params.chapter)) {
            var inp = host.querySelector("#g-chapter");
            if (inp) inp.value = String(params.topic || params.chapter);
          }
          // manual mode textarea is prefilled with cfg.prefill via TS.genPdfFlow's manualPrefill hook
        }
      });
    });
  });
})();
