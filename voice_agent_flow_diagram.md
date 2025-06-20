# Voice Agent Flow Diagram

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   USER VOICE    │    │    FRONTEND      │    │    BACKEND      │
│                 │    │   (React UI)     │    │   (FastAPI)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │ 1. VOICE INPUT         │                       │
         │ "I have a medical      │                       │
         │ form PDF in my         │                       │
         │ downloads folder"      │                       │
         ▼                       │                       │
┌─────────────────┐              │                       │
│ MediaRecorder   │              │                       │
│ - 16kHz audio   │              │                       │
│ - Opus codec    │              │                       │
│ - 1.5s silence  │              │                       │
│   detection     │              │                       │
└─────────────────┘              │                       │
         │                       │                       │
         │ 2. AUDIO CHUNKS        │                       │
         ▼                       │                       │
┌─────────────────┐              │                       │
│ WebSocket       │◄─────────────┤ 3. WS CONNECTION      │
│ /voice_ws       │              │    ws://localhost:8000│
│                 │              │                       │
└─────────────────┘              │                       │
         │                       │                       │
         │ 4. BINARY AUDIO + "END"│                       │
         ▼                       │                       │
┌─────────────────┐              │                       │
│ ElevenLabs ASR  │              │                       │
│ transcribe()    │              │                       │
└─────────────────┘              │                       │
         │                       │                       │
         │ 5. TRANSCRIPT TEXT     │                       │
         ▼                       │                       │
┌─────────────────┐              │                       │
│ Upload Detection│              │                       │
│ - file_keywords │              │                       │
│ - location refs │              │                       │
│ - action verbs  │              │                       │
└─────────────────┘              │                       │
         │                       │                       │
         │ 6. UPLOAD REQUEST?     │                       │
         ▼                       │                       │
    ┌─────────┐                  │                       │
    │   YES   │                  │                       │
    └─────────┘                  │                       │
         │                       │                       │
         │ 7. FILE SEARCH         │                       │
         ▼                       │                       │
┌─────────────────┐              │                       │
│ find_pdf_files()│              │                       │
│ - ~/Downloads   │              │                       │
│ - ~/Desktop     │              │                       │
│ - ~/Documents   │              │                       │
└─────────────────┘              │                       │
         │                       │                       │
         │ 8. FOUND FILE PATH     │                       │
         ▼                       │                       │
┌─────────────────┐              │                       │
│ File Copy       │              │                       │
│ shutil.copy2()  │              │                       │
│ → /uploads/     │              │                       │
└─────────────────┘              │                       │
         │                       │                       │
         │ 9. PDF PROCESSING      │                       │
         ▼                       │                       │
┌─────────────────┐              │                       │
│ ingest_file()   │              │                       │
│ - OCR with      │              │                       │
│   pytesseract   │              │                       │
│ - PDF → text    │              │                       │
└─────────────────┘              │                       │
         │                       │                       │
         │ 10. TEXT CHUNKS        │                       │
         ▼                       │                       │
┌─────────────────┐              │                       │
│ extract_key_    │              │                       │
│ value_info()    │              │                       │
│ - OpenAI GPT    │              │                       │
│ - JSON extract  │              │                       │
└─────────────────┘              │                       │
         │                       │                       │
         │ 11. USER INFO UPDATE   │                       │
         ▼                       │                       │
┌─────────────────┐              │                       │
│ update_user_    │              │                       │
│ info_from_doc_  │              │                       │
│ fast()          │              │                       │
│ (Skip vector DB)│              │                       │
└─────────────────┘              │                       │
         │                       │                       │
         │ 12. AUTO-FILL TRIGGER  │                       │
         ▼                       │                       │
┌─────────────────┐              │                       │
│ answer_query()  │              │                       │
│ "Fill out any   │              │                       │
│ form fields..."  │              │                       │
└─────────────────┘              │                       │
         │                       │                       │
         │ 13. FORM ANALYSIS      │                       │
         ▼                       │                       │
┌─────────────────┐              │                       │
│ OpenAI GPT-3.5  │              │                       │
│ - Match patient │              │                       │
│   info to fields│              │                       │
│ - Generate JSON │              │                       │
│   field_updates │              │                       │
└─────────────────┘              │                       │
         │                       │                       │
         │ 14. FIELD UPDATES JSON │                       │
         ▼                       │                       │
┌─────────────────┐              │                       │
│ JSON Response   │              │                       │
│ {'field_updates'│              │                       │
│  [{'id':'name', │              │                       │
│   'value':'John'}]}            │                       │
└─────────────────┘              │                       │
         │                       │                       │
         │ 15. RESPONSE CLEANING  │                       │
         ▼                       │                       │
┌─────────────────┐              │                       │
│ clean_response_ │              │                       │
│ for_voice()     │              │                       │
│ - Remove JSON   │              │                       │
│ - Keep user msg │              │                       │
└─────────────────┘              │                       │
         │                       │                       │
         │ 16. TTS SYNTHESIS      │                       │
         ▼                       │                       │
┌─────────────────┐              │                       │
│ ElevenLabs TTS  │              │                       │
│ synthesize()    │              │                       │
│ → MP3 audio     │              │                       │
└─────────────────┘              │                       │
         │                       │                       │
         │ 17. DUAL RESPONSE      │                       │
         ▼                       │                       │
┌─────────────────┐              │                       │
│ WebSocket Send  │              │                       │
│ 1. JSON text    │──────────────┤ 18. ASSISTANT_TEXT    │
│ 2. Binary audio │              │     MESSAGE           │
└─────────────────┘              │                       │
         │                       │                       │
         │                       ▼                       │
         │              ┌──────────────────┐              │
         │              │ JSON Processing  │              │
         │              │ - Extract field_ │              │
         │              │   updates        │              │
         │              │ - Filter MISSING │              │
         │              │ - Update UI      │              │
         │              └──────────────────┘              │
         │                       │                       │
         │                       ▼                       │
         │              ┌──────────────────┐              │
         │              │ Form Updates     │              │
         │              │ onFieldsUpdated()│              │
         │              │ - Batch updates  │              │
         │              │ - Real-time UI   │              │
         │              └──────────────────┘              │
         │                       │                       │
         │ 19. AUDIO PLAYBACK     │                       │
         ▼                       │                       │
┌─────────────────┐              │                       │
│ Audio Element   │              │                       │
│ - URL.create    │              │                       │
│   ObjectURL     │              │                       │
│ - auto-play     │              │                       │
└─────────────────┘              │                       │
         │                       │                       │
         │ 20. CONVERSATION LOOP  │                       │
         ▼                       ▼                       │
┌─────────────────┐              ┌──────────────────┐    │
│ audio.onended   │              │ FORM COMPLETE    │    │
│ → startRecording│              │ - All fields     │    │
│   (if active)   │              │   filled         │    │
└─────────────────┘              │ - Ready to       │    │
         │                       │   submit         │    │
         │ 21. READY FOR NEXT     └──────────────────┘    │
         │     VOICE INPUT                                │
         ▼                                                │
    [CYCLE REPEATS]                                       │
```

## Key Technical Components:

### Frontend (React):

- **MediaRecorder**: Captures audio with optimal settings for ElevenLabs
- **WebSocket Client**: Bidirectional communication for real-time voice
- **Field Update Handler**: Processes JSON field updates from voice responses
- **Audio Playback**: Handles TTS audio with proper error handling

### Backend (FastAPI):

- **WebSocket Endpoint**: `/voice_ws` for real-time voice processing
- **Voice Helper Module**: Upload detection, file search, ASR/TTS integration
- **Fast User Info Update**: Optimized document processing without vector DB
- **Response Cleaning**: Separates field updates from voice responses

### External Services:

- **ElevenLabs**: ASR transcription and TTS synthesis
- **OpenAI GPT-3.5**: Form field matching and JSON generation
- **OCR Processing**: pytesseract for PDF text extraction
