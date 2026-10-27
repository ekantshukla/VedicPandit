# Adding your Guru ji's voice

The mantra player can play a real recording instead of the phone's text-to-speech, and still lights up each word
as it is chanted. A real voice is always better than any computer voice for Sanskrit.

## 1. Get permission and the recordings

Please ask Guru ji before using his voice, and keep his written or recorded "yes". Use recordings he gives you
(or that you record with him), not audio downloaded from YouTube: those belong to whoever uploaded them.

Recording tips (a phone is fine):
- A quiet room, phone 30 cm away, no music or bells in the background.
- One file per mantra or stotra, from the first word to the last, at a steady pace.
- For japa mantras (Gayatri, Mahamrityunjaya…), one round is enough; the app repeats it.
- Save as `.mp3` or `.m4a`.

## 2. Name the files and add them

Name each file after the mantra's slug, the last part of its page address (`…/#/mantra/gayatri` → `gayatri.mp3`):

```
vedic-pandit-client/public/audio/gayatri.mp3
vedic-pandit-client/public/audio/mahamrityunjaya.mp3
vedic-pandit-client/public/audio/hanuman-chalisa.mp3
vedic-pandit-client/public/audio/durga-chalisa.m4a
```

## 3. Link them

```bash
python3 tools/link_audio.py "Voice: Pt. <Guru ji's name>, recorded with his permission"
python3 tools/build_client_data.py
```

Commit and push. The website and the app now play his recording, with his name under the player.
Keep each file under about 5 MB so the app stays small (a 3-minute chant at 96 kbps MP3 is about 2 MB).
