// "Ask next" suggestions. The AI ends each answer with a [[NEXT]] block of three likely follow-up questions;
// the chat hides that block and shows the questions as tappable chips. Built-in answers supply their own.

const MARKER = /\[\[\s*NEXT\s*\]\]/i;

/** Instruction added to the AI's system prompt (the .NET PromptLibrary has the same text). */
export const FOLLOWUP_RULE = `FOLLOW-UP SUGGESTIONS (always): after your answer, on a new line write [[NEXT]] and then exactly 3 short questions the user is most likely to ask next, one per line, each starting with "- ".
Write them in the user's language and voice, as they would type them (e.g. "Kal ka rashifal batao", "इसका अर्थ क्या है?"), specific to this conversation, under 60 characters each.
Never mention or refer to these suggestions in the answer itself. Put [[NEXT]] only once, at the very end.`;

/** The part of a (streaming) answer to show: everything before [[NEXT]], minus a half-written marker at the end. */
export function visibleText(raw: string): string {
  const i = raw.search(MARKER);
  if (i >= 0) return raw.slice(0, i).trimEnd();
  return raw.replace(/\[\[?\s*N?E?X?T?\]?$/i, '');
}

/** The suggested questions after [[NEXT]]. */
export function parseFollowups(raw: string): string[] {
  const i = raw.search(MARKER);
  if (i < 0) return [];
  return raw.slice(i).replace(MARKER, '').split('\n')
    .map(l => l.replace(/^\s*(?:(?:[-*•]|\d+[.)])\s*)+/, '').replace(/^["“'`]+|["”'`]+$/g, '').replace(/\*\*/g, '').trim())
    .filter(l => l.length >= 3 && l.length <= 120)
    .slice(0, 3);
}

/** Answer without the suggestion block, for conversation memory. */
export const stripFollowups = (raw: string) => { const i = raw.search(MARKER); return (i >= 0 ? raw.slice(0, i) : raw).trim(); };

type Topic = 'rashifal' | 'muhurat' | 'panchang' | 'ekadashi' | 'mantra' | 'verses' | 'general';

/** Suggestions for built-in answers, or when the AI forgot to add any. */
export function builtInFollowups(topic: Topic, hi: boolean, rashi?: { en: string; hi: string }): string[] {
  const r = rashi ? (hi ? rashi.hi : rashi.en) : '';
  const S: Record<Topic, [string[], string[]]> = {
    rashifal: [[`${r} राशि का कल का राशिफल`, `${r} राशि का साप्ताहिक राशिफल`, 'आज राहु काल कब है?'],
               [`Tomorrow's rashifal for ${r}`, `This week's rashifal for ${r}`, 'When is Rahu Kaal today?']],
    muhurat: [['विवाह मुहूर्त अगले 3 महीने में', 'गृह प्रवेश का शुभ मुहूर्त', 'आज का पंचांग बताइए'],
              ['Marriage muhurat in the next 3 months', 'Good time for griha pravesh', "Today's panchang"]],
    panchang: [['कल का पंचांग बताइए', 'अगली एकादशी कब है?', 'आज का शुभ मुहूर्त क्या है?'],
               ["Tomorrow's panchang", 'When is the next Ekadashi?', 'Any auspicious time today?']],
    ekadashi: [['एकादशी व्रत के नियम क्या हैं?', 'एकादशी पर कौन सा मंत्र जपें?', 'आज का पंचांग बताइए'],
               ['What are the Ekadashi fasting rules?', 'Which mantra to chant on Ekadashi?', "Today's panchang"]],
    mantra: [['इस मंत्र का अर्थ समझाइए', 'इसे कितनी बार जपना चाहिए?', 'हनुमान चालीसा सुनाइए'],
             ['Explain the meaning of this mantra', 'How many times should I chant it?', 'Play the Hanuman Chalisa']],
    verses: [['इस श्लोक को विस्तार से समझाइए', 'गीता में कर्म के बारे में क्या कहा है?', 'मन को शांत कैसे करें?'],
             ['Explain this verse in detail', 'What does the Gita say about karma?', 'How do I calm my mind?']],
    general: [['आज का पंचांग बताइए', 'मेष राशि का आज का राशिफल', 'अगली एकादशी कब है?'],
              ["Today's panchang", "Today's rashifal for Mesha", 'When is the next Ekadashi?']],
  };
  return S[topic][hi ? 0 : 1];
}
