import logging
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from utils.transcript_handler import get_transcript
from utils.vector_handler import create_vector_store
from utils.qa_chain import create_qa_chain
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="YouTube Retrieval API", description="RAG-based Q&A for YouTube transcripts")

# CORS for extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["chrome-extension://*", "http://localhost:*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory caches for speed (avoid recomputing)
retriever_cache = {}
chain_cache = {}


def process_and_cache(video_id: str):
    """Internal helper: Process video and cache if not already done."""
    if video_id in chain_cache:
        logger.info(f"Already cached for {video_id}")
        return True, None  # ✅ Consistent tuple return

    logger.info(f"Auto-processing video: {video_id}")
    transcript = get_transcript(video_id)
    logger.info(f"Transcript length for {video_id}: {len(transcript) if not transcript.startswith(('❌', '⚠️')) else 'Error'}")

    # Handle transcript errors
    if transcript.startswith(("❌", "⚠️")):
        logger.warning(f"Transcript error for {video_id}: {transcript}")
        return False, transcript  # Tuple

    try:
        # Create retriever and chain
        retriever = create_vector_store(transcript)
        chain = create_qa_chain(retriever)

        # Cache
        retriever_cache[video_id] = retriever
        chain_cache[video_id] = chain
        logger.info(f"Cached chain for {video_id} - Total keys: {len(chain_cache)}")
        return True, None  # ✅ Consistent tuple return

    except Exception as e:
        logger.error(f"Error auto-processing {video_id}: {e}", exc_info=True)
        return False, f"Error creating vector store or chain: {e}"  # Tuple


@app.get("/process_video")
def process_video(video_id: str = Query(..., description="YouTube video ID (e.g., qjPH9njnaVU)")):
    """
    Fetches transcript, builds vector store & QA chain for the given YouTube video.
    """
    success, msg = process_and_cache(video_id)
    if success:
        return {
            "status": "success",
            "message": f"Transcript processed successfully for video: {video_id}"
        }
    else:
        return {"status": "failed", "message": msg}


@app.get("/ask")
def ask_question(
    video_id: str = Query(..., description="YouTube video ID"),
    question: str = Query(..., description="Question about the video transcript")
):
    """
    Answers user questions about a video using the cached QA chain.
    Auto-processes if not cached.
    """
    logger.info(f"Asking question for video: {video_id}, initial cache hit: {video_id in chain_cache}")
    
    # Auto-process if needed
    success, error_msg = process_and_cache(video_id)
    if not success:
        logger.warning(f"Auto-process failed for {video_id}: {error_msg}")
        return {"error": error_msg}

    try:
        chain = chain_cache[video_id]
        answer = chain.invoke(question)
        logger.info(f"Generated answer for {video_id}")
        return {"answer": answer}
    except Exception as e:
        logger.error(f"Error generating answer for {video_id}: {e}", exc_info=True)
        return {"error": f"Failed to generate answer: {e}"}