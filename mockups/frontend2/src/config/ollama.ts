export const OLLAMA_CONFIG = {
  baseUrl: 'http://localhost:11434',
  models: {
    llm: 'llama3.2-vision:11b',
    embeddings: 'nomic-embed-text'
  },
  temperature: 0.1,
  chunkSize: 2000,
  chunkOverlap: 1000
}; 