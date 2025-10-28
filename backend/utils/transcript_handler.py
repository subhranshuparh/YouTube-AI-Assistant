from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound, TranscriptsDisabled


def get_transcript(video_id: str) -> str:
    """
    Fetches and merges English + Hindi transcripts if available.
    Prioritizes native English; appends native Hindi if present for fuller context.
    """
    try:
        # Instantiate the API
        ytt_api = YouTubeTranscriptApi()
        
        # List all available transcripts (instance method: .list())
        transcript_list = ytt_api.list(video_id)
        
        en_transcript = None
        hi_transcript = None
        
        # Fetch English if available
        try:
            en_trans = transcript_list.find_transcript(['en'])
            en_list = en_trans.fetch()
            en_transcript = " ".join(snippet.text for snippet in en_list)  # ✅ Use .text attribute
        except NoTranscriptFound:
            pass
        
        # Fetch Hindi if available
        try:
            hi_trans = transcript_list.find_transcript(['hi'])
            hi_list = hi_trans.fetch()
            hi_transcript = " ".join(snippet.text for snippet in hi_list)  # ✅ Use .text attribute
        except NoTranscriptFound:
            pass
        
        # Optional: If no native Hindi but English is translatable, get translated Hindi
        # Uncomment if you prefer translation over skipping:
        # if not hi_transcript and en_transcript and en_trans.is_translatable:
        #     hi_trans = en_trans.translate('hi')
        #     hi_list = hi_trans.fetch()
        #     hi_transcript = " ".join(snippet.text for snippet in hi_list)
        
        # Merge: English first, then Hindi
        if en_transcript:
            if hi_transcript:
                return f"[English Transcript]\n{en_transcript}\n\n[Hindi Transcript]\n{hi_transcript}"
            return en_transcript
        elif hi_transcript:
            return f"[Hindi Transcript]\n{hi_transcript}"
        else:
            raise NoTranscriptFound()
    
    except TranscriptsDisabled:
        return "⚠️ Transcripts are disabled for this video."
    except NoTranscriptFound:
        return "❌ No English or Hindi transcript found for this video."
    except Exception as e:
        return f"⚠️ Error fetching transcript: {e}"