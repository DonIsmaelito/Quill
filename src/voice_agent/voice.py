import os
from io import BytesIO
from typing import Optional

from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs

# Load .env file from the voice_agent directory
import pathlib
current_dir = pathlib.Path(__file__).parent
dotenv_path = current_dir / ".env"
load_dotenv(dotenv_path)

API_KEY = os.getenv("ELEVENLABS_API_KEY")
if not API_KEY:
    # pass # for now (TODO: UNDO)
    raise RuntimeError(
        "ELEVENLABS_API_KEY not set. Please add it to your environment or .env file."
    )

# Lazily-initialised singleton client to avoid repeated hand-shakes
_client: Optional[ElevenLabs] = None


def _get_client() -> ElevenLabs:
    global _client
    if _client is None:
        _client = ElevenLabs(api_key=API_KEY)
    return _client


def transcribe(audio_bytes: bytes) -> str:
    if not audio_bytes:
        return "[No speech detected]"
    
    # Validate audio data size
    if len(audio_bytes) < 1000: 
        return "[No speech detected]"
    
    # Create a file-like object with proper filename and content type (ElevenLabs expects audio files with proper metadata)
    audio_file = BytesIO(audio_bytes)
    audio_file.name = "audio.webm"
    
    try:
        client = _get_client()
        result = client.speech_to_text.convert(
            file=audio_file,
            model_id="scribe_v1",
        )
        
        # Extract text from result - the API returns an object with text property
        transcript = getattr(result, 'text', '') or getattr(result, 'transcript', '')
        transcript = transcript.strip() if transcript else ""

        return transcript if transcript else "[No speech detected]"
        
    except Exception as e:
        # Log the full error for debugging but return a clean message
        print(f"STT Error: {e}")
        # Check if it's an audio corruption error
        error_str = str(e).lower()
        if "corrupted" in error_str or "invalid" in error_str or "playable" in error_str:
            return "[No speech detected]"
        else:
            return "[Transcription failed]"


# ------------------------------ Text-to-Speech -----------------------------

# Sensible defaults configurable via env so ops can tune without code changes.
DEFAULT_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "JBFqnCBsd6RMkjVDRZzb")
DEFAULT_TTS_MODEL = os.getenv("ELEVENLABS_TTS_MODEL", "eleven_turbo_v2_5")
DEFAULT_TTS_FORMAT = os.getenv("ELEVENLABS_TTS_FORMAT", "mp3_44100_128")


def synthesize(
    text: str,
    *,
    voice_id: str = DEFAULT_VOICE_ID,
    model_id: str = DEFAULT_TTS_MODEL,
    output_format: str = DEFAULT_TTS_FORMAT,
) -> bytes:
    client = _get_client()
    audio_generator = client.text_to_speech.convert(
        text=text,
        voice_id=voice_id,
        model_id=model_id,
        output_format=output_format,
    )
    
    # ElevenLabs returns a generator, we need to consume it to get bytes
    audio_chunks = []
    for chunk in audio_generator:
        audio_chunks.append(chunk)
    
    # Combine all chunks into a single bytes object
    audio_bytes = b''.join(audio_chunks)
    return audio_bytes


# ------------------------------ File Upload Detection -----------------------------

def detect_file_upload_request(transcript: str) -> dict:
    transcript_lower = transcript.lower().strip()
    
    # Expanded to include 'find' so phrases like "Find me a PDF" are captured
    upload_keywords = [
        "upload", "grab", "load", "process", "open", "read", 
        "get", "fetch", "import", "add", "include", "use", "find"
    ]
    
    upload_patterns = [
        "i have a", "i have an", "there's a", "there is a",
        "can you use", "can you get", "can you load", "can you process",
        "use the", "use my", "get the", "get my",
        "find the", "find my", "find me a", "find me an", "look for", "access the", "access my",
        "use that to fill", "use it to fill", "fill out using", "fill the form using",
        "fill out the form with", "fill out from"
    ]
    
    # File type keywords
    file_keywords = [
        "pdf", "document", "file", "form", "paper", "paperwork"
    ]
    
    # Common document types
    doc_types = {
        "w2": "tax document",
        "w-2": "tax document", 
        "tax": "tax document",
        "medical": "medical document",
        "lease": "housing document",
        "receipt": "receipt",
        "invoice": "invoice",
        "contract": "contract"
    }
    
    # Common file locations (user can customize these)
    common_locations = {
        "desktop": "~/Desktop",
        "downloads": "~/Downloads", 
        "documents": "~/Documents",
        "docs": "~/Documents"
    }
    
    # Check if it's an upload request
    has_upload_keyword = any(keyword in transcript_lower for keyword in upload_keywords)
    has_upload_pattern = any(pattern in transcript_lower for pattern in upload_patterns)
    has_file_keyword = any(keyword in transcript_lower for keyword in file_keywords)
    
    # Additional check: Must mention a file location or specific file action for upload requests
    has_location = any(loc in transcript_lower for loc in ["desktop", "downloads", "documents", "folder", "directory"])
    has_file_action = any(action in transcript_lower for action in ["upload", "grab", "load", "get", "fetch", "find", "access"])
    
    # For upload detection, we need:
    # 1. (upload keyword OR upload pattern) AND file keyword
    # 2. PLUS either a location reference OR explicit file action
    # This prevents "fill out the form" from being detected as upload
    if not ((has_upload_keyword or has_upload_pattern) and has_file_keyword and (has_location or has_file_action)):
        return {"is_upload_request": False}
    
    # Extract file location
    file_location = None
    for location_name, location_path in common_locations.items():
        if location_name in transcript_lower:
            file_location = location_path
            break
    
    # Extract document type
    doc_type = None
    for doc_keyword, doc_description in doc_types.items():
        if doc_keyword in transcript_lower:
            doc_type = doc_description
            break
    
    # Try to extract specific filename if mentioned
    # This is a simple implementation - could be enhanced with NLP
    potential_filename = None
    words = transcript_lower.split()
    for i, word in enumerate(words):
        if word.endswith('.pdf'):
            potential_filename = word
            break
        # Look for quoted filenames
        if word.startswith('"') or word.startswith("'"):
            # Handle quoted filename
            quote_char = word[0]
            filename_parts = [word[1:]]  # Remove opening quote
            for j in range(i+1, len(words)):
                if words[j].endswith(quote_char):
                    filename_parts.append(words[j][:-1])  # Remove closing quote
                    potential_filename = " ".join(filename_parts)
                    break
                else:
                    filename_parts.append(words[j])
    
    return {
        "is_upload_request": True,
        "file_location": file_location,
        "doc_type": doc_type,
        "potential_filename": potential_filename,
        "transcript": transcript
    }


def find_pdf_files(directory: str, doc_type: str = None) -> list:
    import os
    import glob
    
    # Expand user path
    directory = os.path.expanduser(directory)
    
    if not os.path.exists(directory):
        return []
    
    # Get all PDF files
    pdf_pattern = os.path.join(directory, "*.pdf")
    pdf_files = glob.glob(pdf_pattern)
    
    # If doc_type is specified, filter by filename patterns
    if doc_type and pdf_files:
        filtered_files = []
        type_keywords = {
            "tax document": ["w2", "w-2", "tax", "1099", "schedule"],
            "medical document": ["medical", "health", "insurance", "patient"],
            "housing document": ["lease", "rent", "mortgage", "housing"]
        }
        
        keywords = type_keywords.get(doc_type, [])
        if keywords:
            for file_path in pdf_files:
                filename = os.path.basename(file_path).lower()
                if any(keyword in filename for keyword in keywords):
                    filtered_files.append(file_path)
            return filtered_files
    
    return pdf_files


# Implements heuristic scoring formula requested by product team:
#   score = 10*(# positive filename tokens)
#         +  7*(# form keywords on page 1)
#         + 1.1*(has_acroform)
# The candidate with the highest score is deemed the most "valuable" PDF
# for auto-filling purposes.

# Keyword pools
POSITIVE_FILENAME_TOKENS = [
    "insurance", "claim", "card", "id", "license", "medical", "patient",
    "form", "w2", "w-2", "tax", "intake", "benefits", "policy", "registration",
]

FORM_KEYWORDS_PAGE1 = [
    "date of birth", "dob", "ssn", "social security", "insurance", "policy",
    "phone", "address", "patient", "name", "signature", "provider",
    "emergency", "contact", "medications", "allergies", "family history",
]

# Optional dependency – PyPDF2 is already used elsewhere in the project.
try:
    from PyPDF2 import PdfReader 
except ImportError:
    PdfReader = None


def _extract_first_page_text(path: str) -> str:
    if PdfReader is None:
        return ""
    try:
        reader = PdfReader(path)
        if not reader.pages:
            return ""
        return reader.pages[0].extract_text() or ""
    except Exception:
        return ""


def _pdf_has_acroform(path: str) -> bool:
    if PdfReader is None:
        return False
    try:
        reader = PdfReader(path)
        return bool(reader.trailer["/Root"].get("/AcroForm"))
    except Exception:
        return False


def compute_pdf_score(path: str) -> float:
    filename = os.path.basename(path).lower()
    # Count positive tokens in filename
    token_hits = sum(1 for token in POSITIVE_FILENAME_TOKENS if token in filename)

    # Extract first page text and count keywords
    page1_text = _extract_first_page_text(path).lower()
    keyword_hits = 0
    if page1_text:
        keyword_hits = sum(1 for kw in FORM_KEYWORDS_PAGE1 if kw in page1_text)

    # AcroForm presence
    acro = 1 if _pdf_has_acroform(path) else 0

    # Negative tokens common in academic material that should be avoided
    NEGATIVE_TOKENS = [
        "homework", "assignment", "solution", "solutions", "lecture", "slides",
        "notes", "problem set", "problemset", "pset", "syllabus", "exam",
    ]

    negative_hits = sum(1 for tok in NEGATIVE_TOKENS if tok in filename)

    score = 10 * token_hits + 7 * keyword_hits + 1.1 * acro - 12 * negative_hits
    return score


def select_best_pdf_match(pdf_files: list, upload_request: dict) -> str:
    if not pdf_files:
        return None

    # If user mentioned exact filename try to match first
    potential = upload_request.get("potential_filename")
    if potential:
        target = potential.lower()
        for fp in pdf_files:
            name = os.path.basename(fp).lower()
            if target in name or name in target:
                return fp

    # Score each candidate (ignore ones below soft threshold)
    scored = []
    for fp in pdf_files:
        s = compute_pdf_score(fp)
        if s >= 15:  # soft cut-off to drop clearly irrelevant docs
            scored.append((s, fp))

    scored.sort(reverse=True)

    # Return highest-scoring file
    return scored[0][1] if scored else None
