# Knowledge Base Admin UI

A modern web interface for managing your RAG agent's knowledge base with Qdrant vector database.

## Features

- **File Upload**: Upload knowledge base files (.txt, .pdf, .docx, .md)
- **Vector Management**: Automatically converts text to embeddings and stores in Qdrant
- **Content Viewer**: Browse and search through your knowledge base content
- **Statistics Dashboard**: View collection stats and vector counts
- **Agent Instructions**: Configure custom agent behavior and instructions
- **Delete Functionality**: Clear entire knowledge base with confirmation

## Prerequisites

- Node.js 18+ and npm
- Qdrant Cloud account or self-hosted Qdrant instance
- OpenAI API key for embeddings
- Python agent configured with same Qdrant credentials

## Setup

### 1. Install Dependencies

```bash
cd alex-rag-admin
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the `alex-rag-admin` directory:

```bash
# Qdrant Configuration
QDRANT_URL=https://your-cluster.qdrant.io
QDRANT_API_KEY=your_qdrant_api_key
QDRANT_COLLECTION_NAME=knowledge_base

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
```

**Important**: Use the same Qdrant credentials as your Python agent to ensure they access the same collection.

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Agent Page

The **Agent** page is your central hub for configuring both agent behavior and knowledge base content.

#### Managing Agent Instructions

1. Navigate to **Agent** page (sidebar)
2. In the **Agent Instructions** section:
   - Edit instructions in the textarea
   - See real-time character count
   - Click **Save Instructions** to store in Qdrant
   - Click **Discard Changes** to revert unsaved edits
   - Click **Reset to Default** to restore original instructions
3. Instructions are fetched per call for multi-tenant support
4. New instructions take effect immediately for new calls

**Note**: The agent will use default instructions as fallback if none are configured.

#### Uploading Knowledge Base

1. In the **Knowledge Base** section:
   - Click or drag-and-drop a file onto the upload zone
   - Supported formats: `.txt`, `.pdf`, `.docx`, `.md`
2. The file will be automatically:
   - Parsed and cleaned
   - Split into paragraphs
   - Converted to embeddings using OpenAI
   - Uploaded to Qdrant

#### Viewing Content

- Browse all uploaded paragraphs in the **Uploaded Content** card
- Use the search box to filter content
- View metadata (filename, paragraph index)

#### Managing Knowledge Base

- **Clear All**: Permanently remove all knowledge base content (in section header)
- Content updates are reflected immediately

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the `alex-rag-admin` directory in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Docker

```bash
# Build
docker build -t alex-rag-admin .

# Run
docker run -p 3000:3000 \
  -e QDRANT_URL=your_url \
  -e QDRANT_API_KEY=your_key \
  -e QDRANT_COLLECTION_NAME=knowledge_base \
  -e OPENAI_API_KEY=your_key \
  alex-rag-admin
```

## API Endpoints

- `POST /api/upload` - Upload and process knowledge base file
- `GET /api/stats` - Get collection statistics
- `GET /api/view` - Retrieve all knowledge base content
- `DELETE /api/delete` - Delete entire knowledge base
- `GET /api/instructions` - Retrieve agent instructions
- `POST /api/instructions` - Save agent instructions
- `DELETE /api/instructions` - Reset instructions to default

## Architecture

```
┌─────────────────────────┐
│     Next.js Admin UI    │
│       (Frontend)        │
└───────────┬─────────────┘
            │
            ├── Manage Instructions
            ├── Upload Knowledge Base
            ├── View Content
            ├── Clear All
            │
            ▼
┌─────────────────────────┐
│     Qdrant Cloud        │
│   (Vector Database)     │
│                         │
│  ├── Knowledge Vectors  │
│  └── Agent Config       │
└───────────┬─────────────┘
            │
            ├── Vector Search
            ├── Config Retrieval
            │
            ▼
┌─────────────────────────┐
│    Python Agent         │
│  (LiveKit + RAG)        │
└─────────────────────────┘
```

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Vector DB**: Qdrant
- **Embeddings**: OpenAI text-embedding-3-small
- **File Parsing**: pdf-parse, mammoth, marked

## Troubleshooting

### "Collection not found" error

Make sure the `QDRANT_COLLECTION_NAME` matches between the UI and Python agent.

### Upload fails

- Check OpenAI API key is valid
- Ensure Qdrant credentials are correct
- Verify file format is supported

### Agent not using new instructions or knowledge

- Restart the Python agent after uploading new content or changing instructions
- Instructions and knowledge base are loaded from Qdrant at the start of each call
- Check that both admin UI and agent use the same `QDRANT_COLLECTION_NAME`

## Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## License

Same as parent project.
