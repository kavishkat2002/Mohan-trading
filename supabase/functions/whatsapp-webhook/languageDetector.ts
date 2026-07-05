export type LangType = "sinhala" | "singlish" | "english";

// Sinhala Unicode range 
const SINHALA_UNICODE_RANGE = /[\u0D80-\u0DFF]/;

// Common Singlish words Sri Lankans use
const SINGLISH_KEYWORDS = [
  // Questions
  "mokakda", "kohomada", "kawda", "kohedda", "kohed", "api",
  "oyata", "mama", "oyage", "meka", "eka", "da", "ne", "ney",
  // Car related in singlish
  "kaar", "ekak", "denna", "ganna", "pennanna", "pennako",
  "kiyannako", "hadanna", "puluwan", "one", "ona", "neda",
  // Common filler
  "hari", "hondata", "hodai", "bohoma", "godak", "tikak",
  "awasara", "wage", "wagei", "thamai", "thama", "nam",
  "innawa", "yanawa", "enawa", "pennawa", "karanna",
];

export function detectLanguage(text: string): LangType {
  if (SINHALA_UNICODE_RANGE.test(text)) {
    return "sinhala";
  }

  const words = text.toLowerCase().split(/\s+/);
  if (words.length === 0) return "english";

  let singlishHits = 0;
  for (const word of words) {
    // Clean word of punctuation
    const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"");
    if (SINGLISH_KEYWORDS.includes(cleanWord)) {
      singlishHits++;
    }
  }

  // If 25%+ of words are Singlish → singlish
  if (singlishHits / words.length >= 0.25) {
    return "singlish";
  }

  return "english";
}

export const LANGUAGE_INSTRUCTIONS = {
  english: `
Reply in English.
Keep replies short, friendly, and WhatsApp-appropriate.
`,

  singlish: `
The customer is writing in Singlish (romanized Sinhala mixed with English).
Reply in Singlish — the same casual mix they use.

SINGLISH REPLY RULES:
- Mix English and romanized Sinhala naturally
- Use short sentences like Sri Lankans actually text
- Common phrases to use:
    * "Hodai ne!" (That's great!)
    * "No problem, api karanna puluwan" (No problem, we can do it)
    * "Meka honda car ekak" (This is a good car)
    * "Oya budget eka kiyannako?" (Can you tell me your budget?)
    * "Test drive ekak ganna ona da?" (Want to take a test drive?)
    * "Bohoma hodai!" (Very good!)
    * "Api heta arrange karanna puluwan" (We can arrange tomorrow)
- End messages warmly: "Kohomada?" / "Danagannawa da?" / "OK ne?"
- NEVER reply in formal English if they wrote in Singlish
- Keep it like texting a friendly salesperson, not a robot

EXAMPLE:
Customer: "creta eka danne kohomada, price eka mokakda"
Alex: "Creta SX(O) eka Rs. 18.2 Lakh ne! EMI also tiyenawa — Rs. 17,200/month wagemai. Bohoma hodai SUV ekak, family walata perfect. Photos pennannako? 🚗"
`,

  sinhala: `
The customer is writing in Sinhala script (Unicode).
Reply ENTIRELY in Sinhala script. Do NOT switch to English.

SINHALA REPLY RULES:
- Use proper, natural Sinhala — not word-for-word translation
- Keep it conversational and warm, like a helpful salesperson
- Car terms can stay in English (e.g. SUV, EMI, test drive) but everything else in Sinhala
- Use friendly sentence endings: "නේද?", "හරිද?", "කොහොමද?"

COMMON PHRASES:
- "ඔබට මොන වාහනයක්ද ඕනේ?" (What vehicle do you need?)
- "ඔබේ budget එක කීයද?" (What is your budget?)
- "මෙය ඉතා හොඳ car එකක්" (This is a very good car)
- "test drive එකක් ගන්නද?" (Want a test drive?)
- "EMI පහසුකම් තිබෙනවා" (EMI facilities available)
- "ඔබට photos එවන්නද?" (Should I send you photos?)
- "ඕනෑම විටෙක අමතන්න" (Contact us anytime)

EXAMPLE:
Customer: "ක්රේටා කාර් එකේ මිල කීයද?"
Alex: "හායි! Hyundai Creta SX(O) ගේ මිල Rs. 18.2 Lakh යි. EMI Rs. 17,200/month සිට ලබාගත හැකියි. සූර්ය පැනලය, ADAS, Bose audio ද ඇතුළත්. Photos එවන්නද? 🚗"
`
};

export function getLanguagePrompt(lang: LangType): string {
  return LANGUAGE_INSTRUCTIONS[lang] || LANGUAGE_INSTRUCTIONS.english;
}
