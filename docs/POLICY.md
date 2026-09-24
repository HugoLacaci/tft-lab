# Oracle policy: what we will and will not build

Read before writing analysis code. When something here is a judgement call, the reasoning is written down so it can be revisited.

## Video

- **No downloading or storing third-party video.** No `yt-dlp`, no stream ripping, no server-side fetch of Twitch or YouTube media. Downloading violates those platforms' terms and is not needed: the web app captures frames from the user's own screen (`getDisplayMedia`, explicit consent, v1) or the user uploads their own recording (v1.5).
- Embedded players are never read pixel-wise (the browser forbids it cross-origin) and never automated.
- Per analysed VOD we store the source URL, the channel, the timestamp range and the **derived timeline**. Raw frames of third-party video live only for the processing window and are deleted after extraction. Small crops are kept for the eval set only from recordings the user uploaded themselves, anonymised.

## Text and knowledge

- Sources live in a registry (`config/sources.yaml`) with a licence flag; the ingester refuses unknown domains.
- Official Riot content (patch notes, dev posts) is indexed and cited with a link.
- Third-party guides: robots.txt respected, embeddings plus a quote of at most 200 characters plus the URL. Never a full-text mirror. Every chunk shown to the model reaches the user with its citation.
- Videos: only official caption tracks the platform API provides, chunked by timestamp and attributed to the creator. No transcription of downloaded audio.
- Our own guides, set data and the user's notes: fully ours, fully indexed.

## Gameplay

- **Post-game analysis only.** Nothing reads the game live, tells the player what to do while playing, or injects input. Automation gets accounts banned and live assistance is a grey area of Riot's third-party policy; recorded-game analysis is clearly fine, and that is where we stay.

## Riot API

- A separate developer product for TFT (TFT cannot share a key with League). Rate limits enforced with a token bucket at the documented values; Riot Games Ecosystem Analytics enabled as their policy requires.

## Privacy

- Uploaded recordings may show overlays, chat and names. Frames are stored only as long as processing needs; eval-set crops are anonymised; users get a working delete-my-data path that removes recordings, frames, timelines and notes.

## Disclaimer

Every page carries the standard notice: TFT Lab isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
