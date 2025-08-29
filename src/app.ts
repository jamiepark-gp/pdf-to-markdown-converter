import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { convertPdfToMarkdown } from './utils/pdfToMarkdown';
import { convertTextToTableWithLLM } from './api/documentParse';
import { PdfProcessingOptions } from './types';

// Type definitions for converted file data
interface ConvertedFileData {
    id: string;
    baseId: string;
    originalFilename: string;
    convertedText: string;
    keywords: string[];
    summary: string;
    convertedAt: string;
    fileSize: number;
    revision: number;
    pdfPath?: string;
    pdfSize?: number;
}

dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);
const UPSTAGE_API_KEY = process.env.UPSTAGE_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Archive directory setup
const ARCHIVE_DIR = 'archive';
const ARCHIVE_INDEX_FILE = path.join(ARCHIVE_DIR, 'index.json');

// Ensure archive directory exists
if (!fs.existsSync(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
}

// Initialize archive index if it doesn't exist
if (!fs.existsSync(ARCHIVE_INDEX_FILE)) {
    fs.writeFileSync(ARCHIVE_INDEX_FILE, JSON.stringify([], null, 2));
}

// Helper functions for archive management
function loadArchiveIndex(): ConvertedFileData[] {
    try {
        const data = fs.readFileSync(ARCHIVE_INDEX_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading archive index:', error);
        return [];
    }
}

function saveArchiveIndex(files: ConvertedFileData[]): void {
    try {
        fs.writeFileSync(ARCHIVE_INDEX_FILE, JSON.stringify(files, null, 2));
    } catch (error) {
        console.error('Error saving archive index:', error);
    }
}

function generateFileId(): string {
    return Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
}

if (!UPSTAGE_API_KEY) {
    console.warn('WARNING: UPSTAGE_API_KEY environment variable is not set. PDF conversion will not work.');
}

if (!OPENAI_API_KEY) {
    console.warn('WARNING: OPENAI_API_KEY environment variable is not set. Translation and AI features will not work.');
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Only PDF files are allowed'));
    }
};

const upload = multer({ 
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/convert-pdf', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file uploaded' });
        }

        if (!UPSTAGE_API_KEY) {
            return res.status(500).json({
                success: false,
                error: 'UPSTAGE_API_KEY is not configured. Please contact the administrator.'
            });
        }

        const options: PdfProcessingOptions = {
            outputFormat: req.body.outputFormat || 'markdown',
            includeMetadata: false
        };

        const result = await convertPdfToMarkdown(req.file.path, UPSTAGE_API_KEY, options);
        
        let savedPdfPath = '';
        let pdfSize = 0;
        
        if (result.success) {
            // Save original PDF to archive directory with unique name
            const pdfId = generateFileId();
            const pdfFilename = `${pdfId}_${req.file.originalname}`;
            savedPdfPath = path.join(ARCHIVE_DIR, 'pdfs', pdfFilename);
            
            // Ensure PDF directory exists
            const pdfDir = path.join(ARCHIVE_DIR, 'pdfs');
            if (!fs.existsSync(pdfDir)) {
                fs.mkdirSync(pdfDir, { recursive: true });
            }
            
            // Copy PDF to archive
            fs.copyFileSync(req.file.path, savedPdfPath);
            pdfSize = req.file.size;
        }
        
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        if (result.success) {
            res.json({
                success: true,
                content: result.content,
                pdfPath: savedPdfPath,
                pdfSize: pdfSize
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error processing PDF:', error);
        
        // Clean up file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

app.post('/convert-to-table', async (req, res) => {
    try {
        const { text } = req.body;
        
        if (!text || typeof text !== 'string') {
            return res.status(400).json({ 
                success: false, 
                error: 'Text is required' 
            });
        }

        if (!UPSTAGE_API_KEY || !OPENAI_API_KEY) {
            return res.status(500).json({
                success: false,
                error: 'API keys are not configured. Please contact the administrator.'
            });
        }

        const markdownTable = await convertTextToTableWithLLM(text, UPSTAGE_API_KEY, OPENAI_API_KEY);
        
        res.json({
            success: true,
            table: markdownTable
        });
    } catch (error) {
        console.error('Error converting text to table:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to convert text to table'
        });
    }
});

app.post('/translate-text', async (req, res) => {
    try {
        const { text, targetLanguage } = req.body;
        
        if (!text || typeof text !== 'string') {
            return res.status(400).json({ 
                success: false, 
                error: 'Text is required' 
            });
        }

        if (!targetLanguage || typeof targetLanguage !== 'string') {
            return res.status(400).json({ 
                success: false, 
                error: 'Target language is required' 
            });
        }

        if (!OPENAI_API_KEY) {
            return res.status(500).json({
                success: false,
                error: 'OPENAI_API_KEY is not configured. Please contact the administrator.'
            });
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are a professional translator. Translate the given text to ${targetLanguage} while preserving the original formatting, including markdown syntax, line breaks, and structure. Return only the translated text without any additional explanations or comments.`
                    },
                    {
                        role: 'user',
                        content: text
                    }
                ],
                temperature: 0.3,
                max_tokens: 4000
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        const translatedText = data.choices?.[0]?.message?.content;

        if (!translatedText) {
            throw new Error('No translation received from OpenAI');
        }
        
        res.json({
            success: true,
            translatedText: translatedText.trim()
        });
    } catch (error) {
        console.error('Error translating text:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to translate text'
        });
    }
});

app.post('/extract-keywords-summary', async (req, res) => {
    try {
        const { text } = req.body;
        
        if (!text || typeof text !== 'string') {
            return res.status(400).json({ 
                success: false, 
                error: 'Text is required' 
            });
        }

        if (!OPENAI_API_KEY) {
            return res.status(500).json({
                success: false,
                error: 'OPENAI_API_KEY is not configured. Please contact the administrator.'
            });
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are a text analysis expert. Extract key information from the given text and return a JSON response with the following structure:
{
  "keywords": ["keyword1", "keyword2", "keyword3", ...],
  "summary": "A concise summary of the main points in 2-3 sentences"
}

For keywords:
- Extract 5-10 most important and relevant keywords/phrases
- Include both single words and short phrases (2-3 words max)
- Focus on main topics, concepts, and key terms
- Avoid common words like "the", "and", "of", etc.

For summary:
- Provide a clear, concise summary in 2-3 sentences
- Capture the main points and key information
- Use simple, clear language

Return only the JSON object, no additional text or formatting.`
                    },
                    {
                        role: 'user',
                        content: text
                    }
                ],
                temperature: 0.2,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        const analysisResult = data.choices?.[0]?.message?.content;

        if (!analysisResult) {
            throw new Error('No analysis result received from OpenAI');
        }

        // Parse the JSON response
        let parsedResult;
        try {
            parsedResult = JSON.parse(analysisResult.trim());
        } catch (parseError) {
            throw new Error('Failed to parse analysis result');
        }

        // Validate the response structure
        if (!parsedResult.keywords || !Array.isArray(parsedResult.keywords) || !parsedResult.summary) {
            throw new Error('Invalid analysis result format');
        }
        
        res.json({
            success: true,
            keywords: parsedResult.keywords,
            summary: parsedResult.summary
        });
    } catch (error) {
        console.error('Error extracting keywords and summary:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to extract keywords and summary'
        });
    }
});

// Archive endpoints
app.post('/save-converted-file', async (req, res) => {
    try {
        const { originalFilename, convertedText, keywords, summary, pdfPath, pdfSize, baseId } = req.body;
        
        if (!originalFilename || !convertedText) {
            return res.status(400).json({ 
                success: false, 
                error: 'Original filename and converted text are required' 
            });
        }

        // Check if this is a revision of existing file
        const existingArchive = loadArchiveIndex();
        let revision = 1;
        const currentBaseId = baseId || generateFileId();
        
        if (baseId) {
            // Find the highest revision number for this base ID
            const existingRevisions = existingArchive.filter(file => file.baseId === baseId);
            revision = Math.max(...existingRevisions.map(file => file.revision), 0) + 1;
        }

        // Generate unique ID for this specific revision
        const fileId = generateFileId();
        
        // Create file data object
        const fileData: ConvertedFileData = {
            id: fileId,
            baseId: currentBaseId,
            originalFilename,
            convertedText,
            keywords: keywords || [],
            summary: summary || '',
            convertedAt: new Date().toISOString(),
            fileSize: convertedText.length,
            revision: revision,
            pdfPath: pdfPath || undefined,
            pdfSize: pdfSize || undefined
        };

        // Save the file content to disk
        const filePath = path.join(ARCHIVE_DIR, `${fileId}.json`);
        fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2));

        // Update the index
        const currentArchive = loadArchiveIndex();
        currentArchive.unshift(fileData); // Add to beginning for latest-first order
        
        // Keep only the latest 100 files
        if (currentArchive.length > 100) {
            const removedFile = currentArchive.pop();
            if (removedFile) {
                const oldFilePath = path.join(ARCHIVE_DIR, `${removedFile.id}.json`);
                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath);
                }
            }
        }
        
        saveArchiveIndex(currentArchive);
        
        res.json({
            success: true,
            fileId,
            message: 'File saved to archive successfully'
        });
    } catch (error) {
        console.error('Error saving converted file:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to save converted file'
        });
    }
});

app.get('/archive', async (req, res) => {
    try {
        const archiveIndex = loadArchiveIndex();
        
        // Return only metadata (without full content) for the list
        const fileList = archiveIndex.map(file => ({
            id: file.id,
            baseId: file.baseId,
            originalFilename: file.originalFilename,
            convertedAt: file.convertedAt,
            fileSize: file.fileSize,
            revision: file.revision,
            hasKeywords: file.keywords.length > 0,
            hasSummary: file.summary.length > 0,
            hasPdf: !!file.pdfPath
        }));
        
        res.json({
            success: true,
            files: fileList
        });
    } catch (error) {
        console.error('Error retrieving archive:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to retrieve archive'
        });
    }
});

app.get('/archive/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const filePath = path.join(ARCHIVE_DIR, `${fileId}.json`);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: 'File not found'
            });
        }
        
        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        res.json({
            success: true,
            file: fileData
        });
    } catch (error) {
        console.error('Error retrieving archived file:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to retrieve archived file'
        });
    }
});

app.delete('/archive/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const filePath = path.join(ARCHIVE_DIR, `${fileId}.json`);
        
        // Remove file from disk
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
        // Remove from index
        const archiveIndex = loadArchiveIndex();
        const filteredIndex = archiveIndex.filter(file => file.id !== fileId);
        saveArchiveIndex(filteredIndex);
        
        res.json({
            success: true,
            message: 'File deleted from archive successfully'
        });
    } catch (error) {
        console.error('Error deleting archived file:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete archived file'
        });
    }
});

// Serve PDF files
app.get('/archive/:fileId/pdf', async (req, res) => {
    try {
        const { fileId } = req.params;
        const filePath = path.join(ARCHIVE_DIR, `${fileId}.json`);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: 'File not found'
            });
        }
        
        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        if (!fileData.pdfPath || !fs.existsSync(fileData.pdfPath)) {
            return res.status(404).json({
                success: false,
                error: 'PDF file not found'
            });
        }
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${fileData.originalFilename}"`);
        res.sendFile(path.resolve(fileData.pdfPath));
    } catch (error) {
        console.error('Error serving PDF file:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to serve PDF file'
        });
    }
});

// Bulk download endpoint
app.post('/archive/bulk-download', async (req, res) => {
    try {
        const { fileIds, format } = req.body;
        
        if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'File IDs array is required'
            });
        }
        
        if (!['txt', 'json', 'csv'].includes(format)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid format. Must be txt, json, or csv'
            });
        }
        
        const files = [];
        for (const fileId of fileIds) {
            const filePath = path.join(ARCHIVE_DIR, `${fileId}.json`);
            if (fs.existsSync(filePath)) {
                const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                files.push(fileData);
            }
        }
        
        if (files.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No valid files found'
            });
        }
        
        let content = '';
        let contentType = 'text/plain';
        let filename = `bulk-download-${Date.now()}`;
        
        if (format === 'json') {
            content = JSON.stringify(files, null, 2);
            contentType = 'application/json';
            filename += '.json';
        } else if (format === 'csv') {
            const csvRows = [
                ['Filename', 'Revision', 'Content', 'Keywords', 'Summary', 'Date']
            ];
            
            files.forEach(file => {
                csvRows.push([
                    `"${(file.originalFilename || 'Unknown').replace(/"/g, '""')}"`,
                    (file.revision || 1).toString(),
                    `"${(file.convertedText || '').replace(/"/g, '""')}"`,
                    `"${(file.keywords || []).join('; ').replace(/"/g, '""')}"`,
                    `"${(file.summary || '').replace(/"/g, '""')}"`,
                    file.convertedAt ? new Date(file.convertedAt).toLocaleDateString() : 'Unknown'
                ]);
            });
            
            content = csvRows.map(row => row.join(',')).join('\n');
            contentType = 'text/csv';
            filename += '.csv';
        } else {
            // TXT format
            content = files.map(file => {
                let fileContent = `File: ${file.originalFilename || 'Unknown'} (Revision ${file.revision || 1})\n`;
                fileContent += `Date: ${file.convertedAt ? new Date(file.convertedAt).toLocaleString() : 'Unknown'}\n`;
                fileContent += `${'='.repeat(50)}\n\n`;
                fileContent += file.convertedText || '';
                
                if (file.keywords && file.keywords.length > 0) {
                    fileContent += '\n\n' + '='.repeat(50);
                    fileContent += '\nKEYWORDS:\n';
                    fileContent += file.keywords.join(', ');
                }
                
                if (file.summary) {
                    fileContent += '\n\n' + '='.repeat(50);
                    fileContent += '\nSUMMARY:\n';
                    fileContent += file.summary;
                }
                
                return fileContent;
            }).join('\n\n' + '='.repeat(80) + '\n\n');
            
            filename += '.txt';
        }
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(content);
        
    } catch (error) {
        console.error('Error with bulk download:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create bulk download'
        });
    }
});

app.get('/health', (req, res) => {
    try {
        res.status(200).json({ 
            status: 'OK', 
            timestamp: new Date().toISOString(),
            service: 'PDF to Markdown Converter',
            version: '1.0.0'
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'ERROR', 
            timestamp: new Date().toISOString(),
            error: 'Health check failed'
        });
    }
});

// Add root route for basic connectivity check
app.get('/', (req, res) => {
    res.status(200).send('PDF to Markdown Converter is running!');
});

app.listen(port, '0.0.0.0', () => {
    console.log(`PDF to Markdown converter running on http://localhost:${port}`);
    console.log(`Web Interface: http://localhost:${port}`);
    console.log('Endpoints:');
    console.log('  POST /convert-pdf - Convert PDF to markdown');
    console.log('  GET  /health - Health check');
    console.log('  GET  / - Root endpoint');
});