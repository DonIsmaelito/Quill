import os
from io import BytesIO
from typing import Optional

from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs

# Load .env file from the voice_agent directory
import pathlib
current_dir = pathlib.Path(__file__).parent
dotenv_path = current_dir / ".env"
load_dotenv(dotenv_path)  # Load API key from voice_agent/.env

API_KEY = os.getenv("ELEVENLABS_API_KEY")
if not API_KEY:
    raise RuntimeError(
        "ELEVENLABS_API_KEY not set. Please add it to your environment or .env file."
    )

# Lazily-initialised singleton client to avoid repeated hand-shakes
_client: Optional[ElevenLabs] = None


def _get_client() -> ElevenLabs:
    """Return a cached ElevenLabs client instance."""
    global _client
    if _client is None:
        _client = ElevenLabs(api_key=API_KEY)
    return _client


# ------------------------------ Speech-to-Text -----------------------------

def transcribe(audio_bytes: bytes) -> str:
    """
    Convert audio bytes to text via ElevenLabs Speech-to-Text API.
    """
    if not audio_bytes:
        return "[No speech detected]"
    
    # Validate audio data size
    if len(audio_bytes) < 1000: 
        return "[No speech detected]"
    
    # Create a file-like object with proper filename and content type
    # ElevenLabs expects audio files with proper metadata
    audio_file = BytesIO(audio_bytes)
    audio_file.name = "audio.webm"  # Give it a proper filename with extension
    
    try:
        client = _get_client()  # Ensure client is initialized
        
        # Call ElevenLabs speech_to_text using correct API
        result = client.speech_to_text.convert(
            file=audio_file,  # File-like object with name attribute
            model_id="scribe_v1",  # Only supported model for now
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
DEFAULT_TTS_FORMAT = os.getenv("ELEVENLABS_TTS_FORMAT", "mp3_44100_128")  # Valid format for ElevenLabs


def synthesize(
    text: str,
    *,
    voice_id: str = DEFAULT_VOICE_ID,
    model_id: str = DEFAULT_TTS_MODEL,
    output_format: str = DEFAULT_TTS_FORMAT,
) -> bytes:
    """Convert text -> spoken audio bytes using ElevenLabs TTS."""
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
