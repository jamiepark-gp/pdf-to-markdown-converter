# PDF to Markdown Converter

A Node.js application that converts PDF files to Markdown format using Upstage's Document Parse API. This service provides a REST API endpoint for uploading PDF files and receiving converted Markdown text.

## Features

- PDF to Markdown conversion using Upstage Document Parse API
- File upload with validation (PDF files only, 10MB limit)
- Proper error handling and cleanup
- TypeScript support
- Environment-based configuration

## Project Structure

```
pdf-to-markdown-app/
├── src/
│   ├── app.ts                # Express server and API endpoints
│   ├── api/
│   │   └── documentParse.ts   # Upstage API integration
│   ├── utils/
│   │   └── pdfToMarkdown.ts   # PDF processing utilities
│   └── types/
│       └── index.ts           # TypeScript type definitions
├── .env.example              # Environment variables template
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
└── README.md                 # Documentation
```

## Prerequisites

- Node.js 16+ 
- npm or yarn
- Upstage API key (get one at https://upstage.ai)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd pdf-to-markdown-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your Upstage API key:
   ```
   UPSTAGE_API_KEY=your_actual_api_key_here
   PORT=3000
   ```

## Usage

1. Start the development server:
   ```bash
   npm start
   ```

2. The server will start at `http://localhost:3000`

## API Endpoints

### Convert PDF to Markdown
**POST** `/convert-pdf`

Upload a PDF file and convert it to Markdown format.

**Request:**
- Content-Type: `multipart/form-data`
- Body: 
  - `pdf`: PDF file (required, max 10MB)
  - `outputFormat`: `"markdown"` or `"text"` (optional, default: `"markdown"`)
  - `includeMetadata`: `"true"` or `"false"` (optional, default: `"true"`)

**Response:**
```json
{
  "success": true,
  "content": "# Converted Markdown Content\n\nThis is the converted text...",
  "metadata": {
    "pages": 5,
    "language": "en"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message"
}
```

### Health Check
**GET** `/health`

Check if the service is running.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-08-21T10:30:00.000Z"
}
```

## Example Usage

Using curl:
```bash
# Convert a PDF file to markdown
curl -X POST http://localhost:3000/convert-pdf \
  -F "pdf=@example.pdf" \
  -F "outputFormat=markdown" \
  -F "includeMetadata=true"

# Health check
curl http://localhost:3000/health
```

Using JavaScript/fetch:
```javascript
const formData = new FormData();
formData.append('pdf', pdfFile);
formData.append('outputFormat', 'markdown');

const response = await fetch('http://localhost:3000/convert-pdf', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result.content); // Markdown content
```

## Development

Build the TypeScript code:
```bash
npm run build
```

Run tests:
```bash
npm test
```

## Error Handling

The application handles various error scenarios:
- Invalid file types (only PDF allowed)
- File size limits (10MB max)
- Missing API key
- Upstage API errors
- File system errors

All errors return appropriate HTTP status codes and JSON error responses.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License