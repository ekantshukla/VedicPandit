#!/usr/bin/env python3
"""Builds src/VedicPandit.WebAPI/SeedData/mantras/stotras.json from public sources.

  python3 tools/import_stotras.py <stotra-reader index.html> <vishvAsa devaH checkout>

Sources (all texts are traditional and in the public domain; the digital editions are credited on every entry):
  * Vishnu Sahasranama, Hanuman Chalisa: sanskritdocuments.org, via github.com/tiwari91/stotra-reader (index.html DATA)
  * The other long stotras: github.com/vishvAsa/devaH (Devanagari, word-split with hyphens, which this script re-joins)
Short, very widely printed stotras that neither source has (Lingashtakam, Madhurashtakam, Navagraha...) are in
SHORT_TEXTS below, typed from the standard Gita Press / Shankara Granthavali readings.
"""
import json, os, re, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'src', 'VedicPandit.WebAPI', 'SeedData', 'mantras', 'stotras.json')

VOWEL_SIGN = {'अ': '', 'आ': 'ा', 'इ': 'ि', 'ई': 'ी', 'उ': 'ु', 'ऊ': 'ू', 'ऋ': 'ृ', 'ॠ': 'ॄ', 'ए': 'े', 'ऐ': 'ै', 'ओ': 'ो', 'औ': 'ौ'}
DIGITS = str.maketrans('0123456789', '०१२३४५६७८९')

def join_words(line: str) -> str:
    """vishvAsa writes 'जपेन् नित्यम्', 'आद्य्-अन्त', 'गौरी-पुत्रं'; printed texts write 'जपेन्नित्यम्', 'आद्यन्त', 'गौरीपुत्रं'."""
    line = re.sub(r'्[-\s]+([अआइईउऊऋॠएऐओऔ])', lambda m: VOWEL_SIGN[m.group(1)], line)   # halant + vowel -> vowel sign
    line = re.sub(r'्-+(?=[\u0915-\u0939\u0958-\u095F])', '्', line)                     # 'नमस्-करोमि' -> conjunct
    # 'जपेन् नित्यम्' -> 'जपेन्नित्यम्'; a final m stays apart as in print ('पञ्चकम् सम्पूर्णम्')
    line = re.sub(r'(?<!म)्\s+(?=[\u0915-\u0939\u0958-\u095F])', '्', line)
    line = re.sub(r'(?<=[ऀ-ॿ])-+(?=[ऀ-ॿ])', '', line)               # compound hyphens
    return line

def clean_md(text: str, start: str | None = None, mula_only: bool = False, end: str | None = None) -> list[str]:
    """Markdown from vishvAsa -> list of verses (each a '\n'-joined string)."""
    text = re.sub(r'^(\+\+\+|---)\n.*?\n\1\n', '', text, flags=re.S)            # front matter
    if mula_only:  # keep only the clean "#### मूलम्" blocks (the page also carries commentaries)
        blocks = re.findall(r'#### मूलम्\n(.*?)(?=\n####|\n</details>)', text, flags=re.S)
        text = '\n\n'.join(blocks)
    if start and start in text:
        text = text[text.index(start) + len(start):]
    text = re.sub(r'<details>.*?</details>', '', text, flags=re.S)
    text = re.sub(r'\+\+\+\(.*?\)\+\+\+', '', text, flags=re.S)                  # editor's notes
    text = text.replace('**', '')
    verses, cur = [], []
    for raw in text.split('\n'):
        line = raw.strip()
        if line.startswith('<') or line.startswith('#') or line.startswith('- '):
            line = ''
        if not line:
            if cur: verses.append(cur); cur = []
            continue
        line = line.replace('।।', '॥').translate(DIGITS)
        line = re.sub(r'\s*॥\s*([०-९]+)\s*॥', r' ॥ \1॥', line)
        line = re.sub(r'\s+', ' ', join_words(line)).strip()
        line = re.sub(r'(\S)([।॥])', r'\1 \2', line).replace('॥ ॥', '॥')
        cur.append(line)
    if cur: verses.append(cur)
    verses = ['\n'.join(v) for v in verses if any(re.search(r'[ऀ-ॿ]', l) for l in v)]
    if end:  # stop after the verse that contains `end` (drops trailing nyasa sections)
        for i, v in enumerate(verses):
            if end in v: verses = verses[:i + 1]; break
    return [fix(v) for v in verses]

# Reading variants the source notes inline ("or X", "var X"), quote marks and typos, checked against printed texts
FIXES = [(r'\s+(or|var)\s+[\u0900-\u097F]+(\s+च)?', ''), (r'वचस् "त्वरे"ति', 'वचस्त्वरेति'),
         (r'सर्वमेतत्क्ष्मस्व', 'सर्वमेतत्क्षमस्व'), ('\u200d', ''), (r' {2,}', ' ')]
def fix(v: str) -> str:
    for a, b in FIXES: v = re.sub(a, b, v)
    return v

def number_missing(verses: list[str]) -> list[str]:
    """Some verses lack '॥ n॥' at the end; add it so readers can follow along."""
    out = []
    for i, v in enumerate(verses, 1):
        if not re.search(r'॥\s*$|॥ ?[०-९]+ ?॥\s*$', v) and i < len(verses):
            v = v.rstrip(' ।') + f' ॥ {str(i).translate(DIGITS)}॥'
        out.append(v)
    return out

def from_reader(data: dict, key: str) -> list[str]:
    verses = []
    for sec in data[key]['sections']:
        for u in sec['units']:
            text = fix('\n'.join(l.strip() for l in u['lines']))
            if re.search(r'[A-Za-z]', text): continue   # an "(Alternatively ...)" note in English
            verses.append(text)
    return verses

def entry(slug, name, name_hi, deity, source, verses, meaning_en, meaning_hi, benefits, tips, reps, tags, kind, credit):
    return {
        'slug': slug, 'name': name, 'nameHi': name_hi, 'deity': deity, 'source': source,
        'sanskrit': '\n\n'.join(verses), 'meaningEn': meaning_en, 'meaningHi': meaning_hi, 'benefits': benefits,
        'pronunciationTips': tips, 'recommendedRepetitions': reps, 'tags': tags, 'kind': kind, 'credit': credit,
    }

SD = 'sanskritdocuments.org (via github.com/tiwari91/stotra-reader)'
VV = 'github.com/vishvAsa/devaH'
TRAD = 'Standard printed reading (Gita Press and similar editions)'

def main(reader_html: str, devah: str):
    html = open(reader_html, encoding='utf-8').read()
    i = html.index('const DATA = ') + len('const DATA = ')
    data, _ = json.JSONDecoder().raw_decode(html[i:])
    H = os.path.join(devah, 'AryaH', 'hindukaH')
    md = lambda p, **kw: clean_md(open(os.path.join(H, p), encoding='utf-8').read(), **kw)

    out = [
        entry('vishnu-sahasranama', 'Vishnu Sahasranama Stotram', 'श्रीविष्णुसहस्रनामस्तोत्रम्', 'Vishnu',
              'Mahabharata, Anushasana Parva 149', from_reader(data, 'vs'),
              'The thousand names of Vishnu, taught by Bhishma to Yudhishthira: the opening (purva-pithika), the 108 shlokas of names, and the closing phala-shruti.',
              'भीष्म द्वारा युधिष्ठिर को बताए गए भगवान विष्णु के एक हज़ार नाम: पूर्वपीठिका, नामों के 108 श्लोक और फलश्रुति।',
              'Recited daily by Vaishnavas, on Ekadashi and Thursdays; said to remove fear and bring peace.',
              'Keep the anushtubh rhythm: 8 syllables, slight pause, 8 syllables. Do not rush the names; each name ends where the word ends.',
              1, 'vishnu narayana krishna vaishnava sahasranama ekadashi thursday', 'stotra', SD),
        entry('hanuman-chalisa', 'Hanuman Chalisa', 'श्रीहनुमान चालीसा', 'Hanuman', 'Goswami Tulsidas (Awadhi)', from_reader(data, 'hc'),
              'Forty chaupais in praise of Hanuman, with opening and closing dohas, by Goswami Tulsidas.',
              'गोस्वामी तुलसीदास द्वारा रचित हनुमान जी की स्तुति: दोहे और चालीस चौपाइयाँ।',
              'Recited on Tuesdays and Saturdays, and for courage and protection.',
              'This is Awadhi, not Sanskrit: say the final "a" softly as in Hindi (Hanumān, not Hanumāna). "Bal buddhi bidyā": b for v, as Tulsidas wrote.',
              1, 'hanuman rama vaishnava tuesday saturday courage chalisa', 'chalisa', SD),
        entry('aditya-hridayam', 'Aditya Hridayam', 'आदित्यहृदयम्', 'Surya', 'Valmiki Ramayana, Yuddha Kanda 105 (107 in some editions)',
              md('sUryaH/padyam/Aditya-hRdayam.md', start='## स्तोत्रम्', end='॥ ३१ ॥'),
              'Sage Agastya teaches Rama this hymn to the Sun on the battlefield before the final fight with Ravana.',
              'रावण से अंतिम युद्ध से पहले रणभूमि में अगस्त्य मुनि श्रीराम को सूर्यदेव का यह स्तोत्र सिखाते हैं।',
              'Recited at sunrise, facing the Sun, especially on Sundays; for strength, health and victory over obstacles.',
              'Anushtubh metre throughout. Keep the visarga echo: "ādityaḥ" ends with a soft "ha".',
              1, 'surya rama sunday smarta health', 'stotra', VV),
        entry('ganesha-pancharatnam', 'Ganesha Pancharatnam', 'श्रीगणेशपञ्चरत्नस्तोत्रम्', 'Ganesha', 'Adi Shankaracharya',
              md('gaNapatiH/padyam/pancha-ratna-stotram.md'),
              'Five "jewel" verses on Ganesha by Adi Shankara, in a quick, dancing metre, with a closing verse of blessings.',
              'आदि शंकराचार्य द्वारा गणेश जी के पाँच "रत्न" श्लोक, तेज़ लय में, और फलश्रुति।',
              'Morning recitation, before beginning studies or any new work.',
              'The metre alternates short and long syllables (mu-dā-ka-rā-tta): let the long ones be twice as long.',
              1, 'ganesha shiva smarta shaiva morning', 'stotra', VV),
        entry('ganesha-dvadasha-nama', 'Sankata Nashana Ganesha Stotram', 'सङ्कटनाशनगणेशस्तोत्रम्', 'Ganesha', 'Narada Purana',
              md('gaNapatiH/padyam/dvAdasha-nAma-stotram.md'),
              'The twelve names of Ganesha (Vakratunda, Ekadanta, Krishnapingaksha...) that remove obstacles.',
              'गणेश जी के बारह नाम (वक्रतुण्ड, एकदन्त, कृष्णपिङ्गाक्ष...) जो संकट दूर करते हैं।',
              'Recited three times a day (trisandhya), on Chaturthi and before any undertaking.',
              'Say each name fully: "vakra-tuṇḍa" with a retroflex ṇḍ (tongue curled back).',
              1, 'ganesha chaturthi smarta shaiva obstacles', 'stotra', VV),
        entry('shiva-tandava', 'Shiva Tandava Stotram', 'शिवताण्डवस्तोत्रम्', 'Shiva', 'Attributed to Ravana',
              md('rudraH/padyam/shiva-tANDavam.md'),
              'Ravana describes Shiva\'s cosmic dance: the Ganga in his matted hair, the drum, the fire of his third eye.',
              'रावण शिव के ताण्डव का वर्णन करता है: जटाओं में गंगा, डमरू का नाद, तीसरे नेत्र की अग्नि।',
              'Pradosh, Mondays and Maha Shivaratri.',
              'Panchachamara metre: short-long, short-long all the way (ja-ṭā-ṭa-vī). Keep it even and powerful, not fast.',
              1, 'shiva shaiva monday pradosh shivaratri', 'stotra', VV),
        entry('kalabhairava-ashtakam', 'Kalabhairava Ashtakam', 'कालभैरवाष्टकम्', 'Kala Bhairava (Shiva)', 'Adi Shankaracharya',
              number_missing(md('rudraH/padyam/kAlabhairavAShTakam.md')),
              'Eight verses to Kala Bhairava, the guardian lord of Kashi, each ending "kāśikāpurādhinātha-kālabhairavaṃ bhaje".',
              'काशी के कोतवाल कालभैरव की स्तुति के आठ श्लोक, हर श्लोक "काशिकापुराधिनाथकालभैरवं भजे" पर समाप्त।',
              'Kalashtami (Krishna Ashtami), Sundays and Tuesdays; in Kashi before darshan of Vishwanath.',
              'Same short-long metre as the Tandava stotram. "Kāśikā" with a soft palatal ś.',
              1, 'shiva bhairava shaiva kashi ashtami', 'stotra', VV),
        entry('shiva-aparadha-kshamapana', 'Shiva Aparadha Kshamapana Stotram', 'शिवापराधक्षमापणस्तोत्रम्', 'Shiva', 'Adi Shankaracharya',
              md('rudraH/padyam/shivAparAdha-xamApaNa-stotram.md'),
              'A prayer asking Shiva to forgive the faults of every stage of life and every lapse in worship.',
              'जीवन की हर अवस्था और पूजा की हर भूल के लिए भगवान शिव से क्षमा की प्रार्थना।',
              'At the end of puja, on Mondays and in Shravan.',
              'Long sragdharā lines: breathe at the commas. The refrain "kṣantavyo me\'parādhaḥ" has an elided "a" after me.',
              1, 'shiva shaiva forgiveness monday shravan', 'stotra', VV),
        entry('achyutashtakam', 'Achyutashtakam', 'अच्युताष्टकम्', 'Vishnu (Krishna, Rama)', 'Adi Shankaracharya',
              md('viShNuH/padyam/achyutAShTakam.md'),
              '"Achyutam Keshavam Rama-Narayanam": eight verses weaving together the names of Krishna and Rama.',
              '"अच्युतं केशवं रामनारायणं": कृष्ण और राम के नामों से गुँथे आठ श्लोक।',
              'Evening bhajan, Ekadashi and Janmashtami.',
              'Sragviṇī metre: long-short-long, four times a line. It sings itself; keep the "aṃ" endings nasal.',
              1, 'vishnu krishna rama vaishnava ekadashi', 'stotra', VV),
        entry('mahalakshmi-ashtakam', 'Mahalakshmi Ashtakam', 'महालक्ष्म्यष्टकम्', 'Lakshmi', 'Padma Purana (spoken by Indra)',
              md('laxmIH/padyam/mahAlaxmyaShTakam.md'),
              'Indra\'s eight verses to Mahalakshmi, each ending "mahālakṣmi namo\'stu te".',
              'इन्द्र द्वारा महालक्ष्मी की स्तुति के आठ श्लोक, हर श्लोक "महालक्ष्मि नमोऽस्तु ते" पर समाप्त।',
              'Fridays, Diwali and Sharad Purnima.',
              '"Lakṣmī" has the kṣ cluster; do not say "lakshami".',
              1, 'lakshmi devi shakta vaishnava friday diwali', 'stotra', VV),
        entry('lalita-panchakam', 'Lalita Panchakam', 'ललितापञ्चकम्', 'Lalita Tripurasundari', 'Adi Shankaracharya',
              number_missing(md('classes/shaktayaH/padyam/lalitApanchakam_lalitAprAtaHsmaraNaM_cha.md')),
              'Five morning verses remembering Devi Lalita: her face, her arms, her feet, her praise and her names.',
              'प्रातःकाल देवी ललिता का स्मरण कराने वाले पाँच श्लोक: मुख, भुजाएँ, चरण, स्तुति और नाम।',
              'At dawn, Fridays and Navratri.',
              'Vasantatilakā metre: 14 syllables a line. "Prātaḥ smarāmi": the visarga echoes as "prātaha".',
              1, 'lalita devi shakta morning friday navratri', 'stotra', VV),
        entry('mahishasura-mardini', 'Mahishasura Mardini Stotram', 'महिषासुरमर्दिनीस्तोत्रम्', 'Durga', 'Attributed to Adi Shankaracharya',
              md('classes/shaktayaH/padyam/mahiShAsura-mardinI-stotram_kAshikAnandagiri-TIkA-sahitam.md', mula_only=True),
              '"Ayi giri-nandini": the Goddess who slew Mahishasura, praised in a rolling, drum-like metre.',
              '"अयि गिरिनन्दिनि": महिषासुर का वध करने वाली देवी की ढोल जैसी लय में स्तुति।',
              'Navratri, Durga Ashtami and Vijayadashami.',
              'Each line has a strong beat every four syllables (ayi giri | nandini | nandita | medini). Chant it, do not read it.',
              1, 'durga devi shakta navratri ashtami', 'stotra', VV),
    ]
    out += [entry(*t) for t in SHORT_TEXTS]
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(out, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for e in out:
        print(f"{e['slug']:28} {e['kind']:8} {e['sanskrit'].count(chr(10)+chr(10)) + 1:4} verses")

# (slug, name, nameHi, deity, source, verses, meaningEn, meaningHi, benefits, tips, reps, tags, kind, credit)
SHORT_TEXTS = [
    ('lingashtakam', 'Lingashtakam', 'लिङ्गाष्टकम्', 'Shiva', 'Traditional (attributed to Adi Shankaracharya)', [
        'ब्रह्ममुरारिसुरार्चितलिङ्गं\nनिर्मलभासितशोभितलिङ्गम् ।\nजन्मजदुःखविनाशकलिङ्गं\nतत्प्रणमामि सदाशिवलिङ्गम् ॥ १॥',
        'देवमुनिप्रवरार्चितलिङ्गं\nकामदहं करुणाकरलिङ्गम् ।\nरावणदर्पविनाशनलिङ्गं\nतत्प्रणमामि सदाशिवलिङ्गम् ॥ २॥',
        'सर्वसुगन्धिसुलेपितलिङ्गं\nबुद्धिविवर्धनकारणलिङ्गम् ।\nसिद्धसुरासुरवन्दितलिङ्गं\nतत्प्रणमामि सदाशिवलिङ्गम् ॥ ३॥',
        'कनकमहामणिभूषितलिङ्गं\nफणिपतिवेष्टितशोभितलिङ्गम् ।\nदक्षसुयज्ञविनाशनलिङ्गं\nतत्प्रणमामि सदाशिवलिङ्गम् ॥ ४॥',
        'कुङ्कुमचन्दनलेपितलिङ्गं\nपङ्कजहारसुशोभितलिङ्गम् ।\nसञ्चितपापविनाशनलिङ्गं\nतत्प्रणमामि सदाशिवलिङ्गम् ॥ ५॥',
        'देवगणार्चितसेवितलिङ्गं\nभावैर्भक्तिभिरेव च लिङ्गम् ।\nदिनकरकोटिप्रभाकरलिङ्गं\nतत्प्रणमामि सदाशिवलिङ्गम् ॥ ६॥',
        'अष्टदलोपरिवेष्टितलिङ्गं\nसर्वसमुद्भवकारणलिङ्गम् ।\nअष्टदरिद्रविनाशितलिङ्गं\nतत्प्रणमामि सदाशिवलिङ्गम् ॥ ७॥',
        'सुरगुरुसुरवरपूजितलिङ्गं\nसुरवनपुष्पसदार्चितलिङ्गम् ।\nपरात्परं परमात्मकलिङ्गं\nतत्प्रणमामि सदाशिवलिङ्गम् ॥ ८॥',
        'लिङ्गाष्टकमिदं पुण्यं यः पठेच्छिवसन्निधौ ।\nशिवलोकमवाप्नोति शिवेन सह मोदते ॥'],
     'Eight verses bowing to the Shiva linga, worshipped by Brahma, Vishnu and the gods.',
     'ब्रह्मा, विष्णु और देवताओं द्वारा पूजित शिवलिंग को प्रणाम करने वाले आठ श्लोक।',
     'Mondays, Pradosh, Shravan and Maha Shivaratri, before the linga.',
     'Each line ends "-liṅgam": the ṅ is the nasal of "king". Four beats per half-line.',
     1, 'shiva shaiva monday pradosh shravan shivaratri', 'stotra', TRAD),
    ('shiva-panchakshara-stotram', 'Shiva Panchakshara Stotram', 'शिवपञ्चाक्षरस्तोत्रम्', 'Shiva', 'Adi Shankaracharya', [
        'नागेन्द्रहाराय त्रिलोचनाय\nभस्माङ्गरागाय महेश्वराय ।\nनित्याय शुद्धाय दिगम्बराय\nतस्मै नकाराय नमः शिवाय ॥ १॥',
        'मन्दाकिनीसलिलचन्दनचर्चिताय\nनन्दीश्वरप्रमथनाथमहेश्वराय ।\nमन्दारपुष्पबहुपुष्पसुपूजिताय\nतस्मै मकाराय नमः शिवाय ॥ २॥',
        'शिवाय गौरीवदनाब्जवृन्द-\nसूर्याय दक्षाध्वरनाशकाय ।\nश्रीनीलकण्ठाय वृषध्वजाय\nतस्मै शिकाराय नमः शिवाय ॥ ३॥',
        'वसिष्ठकुम्भोद्भवगौतमार्य-\nमुनीन्द्रदेवार्चितशेखराय ।\nचन्द्रार्कवैश्वानरलोचनाय\nतस्मै वकाराय नमः शिवाय ॥ ४॥',
        'यक्षस्वरूपाय जटाधराय\nपिनाकहस्ताय सनातनाय ।\nदिव्याय देवाय दिगम्बराय\nतस्मै यकाराय नमः शिवाय ॥ ५॥',
        'पञ्चाक्षरमिदं पुण्यं यः पठेच्छिवसन्निधौ ।\nशिवलोकमवाप्नोति शिवेन सह मोदते ॥'],
     'One verse for each syllable of "na-maḥ-śi-vā-ya", each ending "tasmai ...-kārāya namaḥ śivāya".',
     '"न-मः-शि-वा-य" के हर अक्षर पर एक श्लोक, हर श्लोक "तस्मै ...काराय नमः शिवाय" पर समाप्त।',
     'Mondays, Pradosh and Shravan; a short daily stotra for Shiva bhaktas.',
     '"Tasmai na-kārāya": stress the syllable being honoured (na, ma, śi, vā, ya).',
     1, 'shiva shaiva monday panchakshara', 'stotra', TRAD),
    ('rudrashtakam', 'Rudrashtakam', 'श्रीरुद्राष्टकम्', 'Shiva', 'Goswami Tulsidas, Ramcharitmanas, Uttara Kanda', [
        'नमामीशमीशान निर्वाणरूपं\nविभुं व्यापकं ब्रह्मवेदस्वरूपम् ।\nनिजं निर्गुणं निर्विकल्पं निरीहं\nचिदाकाशमाकाशवासं भजेऽहम् ॥ १॥',
        'निराकारमोङ्कारमूलं तुरीयं\nगिराज्ञानगोतीतमीशं गिरीशम् ।\nकरालं महाकालकालं कृपालं\nगुणागारसंसारपारं नतोऽहम् ॥ २॥',
        'तुषाराद्रिसंकाशगौरं गभीरं\nमनोभूतकोटिप्रभाश्रीशरीरम् ।\nस्फुरन्मौलिकल्लोलिनी चारुगङ्गा\nलसद्भालबालेन्दु कण्ठे भुजङ्गा ॥ ३॥',
        'चलत्कुण्डलं भ्रूसुनेत्रं विशालं\nप्रसन्नाननं नीलकण्ठं दयालम् ।\nमृगाधीशचर्माम्बरं मुण्डमालं\nप्रियं शङ्करं सर्वनाथं भजामि ॥ ४॥',
        'प्रचण्डं प्रकृष्टं प्रगल्भं परेशं\nअखण्डं अजं भानुकोटिप्रकाशम् ।\nत्रयःशूलनिर्मूलनं शूलपाणिं\nभजेऽहं भवानीपतिं भावगम्यम् ॥ ५॥',
        'कलातीतकल्याणकल्पान्तकारी\nसदा सज्जनानन्ददाता पुरारी ।\nचिदानन्दसन्दोह मोहापहारी\nप्रसीद प्रसीद प्रभो मन्मथारी ॥ ६॥',
        'न यावद् उमानाथपादारविन्दं\nभजन्तीह लोके परे वा नराणाम् ।\nन तावत्सुखं शान्ति सन्तापनाशं\nप्रसीद प्रभो सर्वभूताधिवासम् ॥ ७॥',
        'न जानामि योगं जपं नैव पूजां\nनतोऽहं सदा सर्वदा शम्भु तुभ्यम् ।\nजराजन्मदुःखौघतातप्यमानं\nप्रभो पाहि आपन्नमामीश शम्भो ॥ ८॥',
        'रुद्राष्टकमिदं प्रोक्तं विप्रेण हरतोषये ।\nये पठन्ति नरा भक्त्या तेषां शम्भुः प्रसीदति ॥'],
     '"Namāmīśam īśāna": Tulsidas\'s eight verses to Rudra, the formless lord beyond the three gunas.',
     '"नमामीशमीशान": तुलसीदास जी के रुद्र (शिव) की स्तुति के आठ श्लोक।',
     'Mondays, Shravan, Shivaratri; often sung at the close of Shiva puja.',
     'Bhujangaprayāta metre: short-long-long, four times a line (na-mā-mī | śa-mī-śā).',
     1, 'shiva shaiva rama monday shravan', 'stotra', TRAD),
    ('nirvana-shatakam', 'Nirvana Shatakam', 'निर्वाणषट्कम्', 'Shiva (the Self)', 'Adi Shankaracharya', [
        'मनोबुद्ध्यहङ्कारचित्तानि नाहं\nन च श्रोत्रजिह्वे न च घ्राणनेत्रे ।\nन च व्योमभूमिर्न तेजो न वायुः\nचिदानन्दरूपः शिवोऽहं शिवोऽहम् ॥ १॥',
        'न च प्राणसंज्ञो न वै पञ्चवायुः\nन वा सप्तधातुर्न वा पञ्चकोशः ।\nन वाक्पाणिपादं न चोपस्थपायू\nचिदानन्दरूपः शिवोऽहं शिवोऽहम् ॥ २॥',
        'न मे द्वेषरागौ न मे लोभमोहौ\nमदो नैव मे नैव मात्सर्यभावः ।\nन धर्मो न चार्थो न कामो न मोक्षः\nचिदानन्दरूपः शिवोऽहं शिवोऽहम् ॥ ३॥',
        'न पुण्यं न पापं न सौख्यं न दुःखं\nन मन्त्रो न तीर्थं न वेदा न यज्ञाः ।\nअहं भोजनं नैव भोज्यं न भोक्ता\nचिदानन्दरूपः शिवोऽहं शिवोऽहम् ॥ ४॥',
        'न मृत्युर्न शङ्का न मे जातिभेदः\nपिता नैव मे नैव माता न जन्म ।\nन बन्धुर्न मित्रं गुरुर्नैव शिष्यः\nचिदानन्दरूपः शिवोऽहं शिवोऽहम् ॥ ५॥',
        'अहं निर्विकल्पो निराकाररूपो\nविभुत्वाच्च सर्वत्र सर्वेन्द्रियाणाम् ।\nसदा मे समत्वं न मुक्तिर्न बन्धः\nचिदानन्दरूपः शिवोऽहं शिवोऽहम् ॥ ६॥'],
     'Six verses of Advaita: "I am not the mind, the senses or the elements; I am consciousness and bliss, I am Shiva."',
     'अद्वैत के छह श्लोक: "मैं मन, इंद्रियाँ या पंचभूत नहीं; मैं चिदानन्द हूँ, मैं शिव हूँ।"',
     'For meditation and self-enquiry; Shankara Jayanti.',
     'Bhujangaprayāta metre (short-long-long). "Śivo\'ham": the o and a merge, so it is "śivo-ham".',
     1, 'shiva shaiva smarta advaita meditation', 'stotra', TRAD),
    ('madhurashtakam', 'Madhurashtakam', 'मधुराष्टकम्', 'Krishna', 'Shri Vallabhacharya', [
        'अधरं मधुरं वदनं मधुरं\nनयनं मधुरं हसितं मधुरम् ।\nहृदयं मधुरं गमनं मधुरं\nमधुराधिपतेरखिलं मधुरम् ॥ १॥',
        'वचनं मधुरं चरितं मधुरं\nवसनं मधुरं वलितं मधुरम् ।\nचलितं मधुरं भ्रमितं मधुरं\nमधुराधिपतेरखिलं मधुरम् ॥ २॥',
        'वेणुर्मधुरो रेणुर्मधुरः\nपाणिर्मधुरः पादौ मधुरौ ।\nनृत्यं मधुरं सख्यं मधुरं\nमधुराधिपतेरखिलं मधुरम् ॥ ३॥',
        'गीतं मधुरं पीतं मधुरं\nभुक्तं मधुरं सुप्तं मधुरम् ।\nरूपं मधुरं तिलकं मधुरं\nमधुराधिपतेरखिलं मधुरम् ॥ ४॥',
        'करणं मधुरं तरणं मधुरं\nहरणं मधुरं रमणं मधुरम् ।\nवमितं मधुरं शमितं मधुरं\nमधुराधिपतेरखिलं मधुरम् ॥ ५॥',
        'गुञ्जा मधुरा माला मधुरा\nयमुना मधुरा वीची मधुरा ।\nसलिलं मधुरं कमलं मधुरं\nमधुराधिपतेरखिलं मधुरम् ॥ ६॥',
        'गोपी मधुरा लीला मधुरा\nयुक्तं मधुरं मुक्तं मधुरम् ।\nदृष्टं मधुरं शिष्टं मधुरं\nमधुराधिपतेरखिलं मधुरम् ॥ ७॥',
        'गोपा मधुरा गावो मधुरा\nयष्टिर्मधुरा सृष्टिर्मधुरा ।\nदलितं मधुरं फलितं मधुरं\nमधुराधिपतेरखिलं मधुरम् ॥ ८॥'],
     '"Everything about the Lord of Madhura is sweet": his lips, his flute, his walk, the Yamuna, the gopis.',
     '"मधुरा के स्वामी का सब कुछ मधुर है": अधर, वेणु, चाल, यमुना, गोपियाँ।',
     'Janmashtami, Ekadashi and daily Krishna seva (Pushti Marg).',
     'Every phrase is four syllables: a-dha-raṃ ma-dhu-raṃ. Keep it light and even.',
     1, 'krishna vishnu vaishnava janmashtami pushti', 'stotra', TRAD),
    ('shri-ramachandra-kripalu', 'Shri Ramachandra Kripalu', 'श्रीरामचन्द्र कृपालु भजु मन', 'Rama', 'Goswami Tulsidas, Vinaya Patrika 45 (Awadhi)', [
        'श्रीरामचन्द्र कृपालु भजु मन\nहरण भवभय दारुणम् ।\nनवकञ्ज लोचन कञ्जमुख कर\nकञ्ज पद कञ्जारुणम् ॥ १॥',
        'कन्दर्प अगणित अमित छवि\nनवनील नीरद सुन्दरम् ।\nपटपीत मानहुँ तडित रुचि शुचि\nनौमि जनक सुतावरम् ॥ २॥',
        'भजु दीनबन्धु दिनेश दानव\nदैत्यवंश निकन्दनम् ।\nरघुनन्द आनन्दकन्द कोशल\nचन्द दशरथ नन्दनम् ॥ ३॥',
        'शिर मुकुट कुण्डल तिलक चारु\nउदारु अङ्ग विभूषणम् ।\nआजानुभुज शर चाप धर\nसंग्राम जित खरदूषणम् ॥ ४॥',
        'इति वदति तुलसीदास शङ्कर\nशेष मुनि मन रञ्जनम् ।\nमम हृदयकञ्ज निवास कुरु\nकामादि खलदल गञ्जनम् ॥ ५॥'],
     '"O mind, worship the compassionate Shri Ramachandra, who removes the terrible fear of worldly life."',
     '"हे मन, कृपालु श्रीरामचन्द्र को भज, जो संसार के दारुण भय को हरते हैं।"',
     'Ram Navami, evening aarti and daily Rama bhajan.',
     'Awadhi with Sanskrit endings: "dāruṇam", "sundaram" keep the final m; "mānahu~" is nasal.',
     1, 'rama vishnu vaishnava ramnavami bhajan', 'aarti', TRAD),
    ('om-jai-jagdish-hare', 'Om Jai Jagdish Hare (Aarti)', 'ॐ जय जगदीश हरे (आरती)', 'Vishnu', 'Pt. Shardha Ram Phillauri (1870s, Hindi)', [
        'ॐ जय जगदीश हरे, स्वामी जय जगदीश हरे ।\nभक्त जनों के संकट, दास जनों के संकट,\nक्षण में दूर करे ॥ ॐ जय जगदीश हरे ॥',
        'जो ध्यावे फल पावे, दुःख बिनसे मन का,\nस्वामी दुःख बिनसे मन का ।\nसुख सम्पति घर आवे, कष्ट मिटे तन का ॥',
        'मात पिता तुम मेरे, शरण गहूँ मैं किसकी,\nस्वामी शरण गहूँ मैं किसकी ।\nतुम बिन और न दूजा, आस करूँ मैं जिसकी ॥',
        'तुम पूरण परमात्मा, तुम अन्तर्यामी,\nस्वामी तुम अन्तर्यामी ।\nपारब्रह्म परमेश्वर, तुम सब के स्वामी ॥',
        'तुम करुणा के सागर, तुम पालनकर्ता,\nस्वामी तुम पालनकर्ता ।\nमैं मूरख खल कामी, मैं सेवक तुम स्वामी,\nकृपा करो भर्ता ॥',
        'तुम हो एक अगोचर, सबके प्राणपति,\nस्वामी सबके प्राणपति ।\nकिस विधि मिलूँ दयामय, तुमको मैं कुमति ॥',
        'दीनबन्धु दुखहर्ता, ठाकुर तुम मेरे,\nस्वामी रक्षक तुम मेरे ।\nअपने हाथ उठाओ, अपनी शरण लगाओ,\nद्वार पड़ा तेरे ॥',
        'विषय विकार मिटाओ, पाप हरो देवा,\nस्वामी पाप हरो देवा ।\nश्रद्धा भक्ति बढ़ाओ, सन्तन की सेवा ॥\nॐ जय जगदीश हरे ॥'],
     'The best-known Hindi aarti, to Vishnu as Jagdish, Lord of the world.',
     'सबसे प्रसिद्ध हिन्दी आरती, जगत के स्वामी भगवान विष्णु (जगदीश) की।',
     'At the end of any puja, morning and evening.',
     'Sung, not recited: the refrain "ॐ जय जगदीश हरे" returns after every verse.',
     1, 'vishnu vaishnava aarti puja', 'aarti', TRAD),
    ('ganesh-aarti', 'Jai Ganesh Deva (Aarti)', 'जय गणेश जय गणेश देवा (आरती)', 'Ganesha', 'Traditional Hindi (closing line names Surdas)', [
        'जय गणेश जय गणेश, जय गणेश देवा ।\nमाता जाकी पार्वती, पिता महादेवा ॥',
        'एक दन्त दयावन्त, चार भुजा धारी ।\nमाथे सिन्दूर सोहे, मूसे की सवारी ॥',
        'पान चढ़े फल चढ़े, और चढ़े मेवा ।\nलड्डुअन का भोग लगे, सन्त करें सेवा ॥',
        'अन्धन को आँख देत, कोढ़िन को काया ।\nबाँझन को पुत्र देत, निर्धन को माया ॥',
        '\'सूर\' श्याम शरण आए, सफल कीजे सेवा ।\nमाता जाकी पार्वती, पिता महादेवा ॥'],
     'The everyday Hindi aarti of Ganesha, son of Parvati and Mahadeva.',
     'गणेश जी की रोज़ की आरती: माता पार्वती, पिता महादेव।',
     'Start of every puja, Ganesh Chaturthi and Wednesdays.',
     'Sung with the refrain "जय गणेश जय गणेश जय गणेश देवा" after each verse.',
     1, 'ganesha shaiva smarta aarti wednesday chaturthi', 'aarti', TRAD),
    ('navagraha-stotram', 'Navagraha Stotram', 'नवग्रहस्तोत्रम्', 'The nine grahas', 'Attributed to Veda Vyasa', [
        'जपाकुसुमसङ्काशं काश्यपेयं महाद्युतिम् ।\nतमोऽरिं सर्वपापघ्नं प्रणतोऽस्मि दिवाकरम् ॥ १॥',
        'दधिशङ्खतुषाराभं क्षीरोदार्णवसम्भवम् ।\nनमामि शशिनं सोमं शम्भोर्मुकुटभूषणम् ॥ २॥',
        'धरणीगर्भसम्भूतं विद्युत्कान्तिसमप्रभम् ।\nकुमारं शक्तिहस्तं तं मङ्गलं प्रणमाम्यहम् ॥ ३॥',
        'प्रियङ्गुकलिकाश्यामं रूपेणाप्रतिमं बुधम् ।\nसौम्यं सौम्यगुणोपेतं तं बुधं प्रणमाम्यहम् ॥ ४॥',
        'देवानां च ऋषीणां च गुरुं काञ्चनसन्निभम् ।\nबुद्धिभूतं त्रिलोकेशं तं नमामि बृहस्पतिम् ॥ ५॥',
        'हिमकुन्दमृणालाभं दैत्यानां परमं गुरुम् ।\nसर्वशास्त्रप्रवक्तारं भार्गवं प्रणमाम्यहम् ॥ ६॥',
        'नीलाञ्जनसमाभासं रविपुत्रं यमाग्रजम् ।\nछायामार्तण्डसम्भूतं तं नमामि शनैश्चरम् ॥ ७॥',
        'अर्धकायं महावीर्यं चन्द्रादित्यविमर्दनम् ।\nसिंहिकागर्भसम्भूतं तं राहुं प्रणमाम्यहम् ॥ ८॥',
        'पलाशपुष्पसङ्काशं तारकाग्रहमस्तकम् ।\nरौद्रं रौद्रात्मकं घोरं तं केतुं प्रणमाम्यहम् ॥ ९॥',
        'इति व्यासमुखोद्गीतं यः पठेत्सुसमाहितः ।\nदिवा वा यदि वा रात्रौ विघ्नशान्तिर्भविष्यति ॥ १०॥'],
     'One verse each to Surya, Chandra, Mangala, Budha, Brihaspati, Shukra, Shani, Rahu and Ketu.',
     'सूर्य, चंद्र, मंगल, बुध, बृहस्पति, शुक्र, शनि, राहु और केतु, हर ग्रह के लिए एक श्लोक।',
     'Daily for planetary peace (graha shanti); the verse of a graha on its own weekday.',
     'Anushtubh metre. "Śanaiścaram" has the śc cluster; "Bṛhaspatim" the vocalic ṛ.',
     1, 'navagraha surya shani smarta graha', 'stotra', TRAD),
]

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
