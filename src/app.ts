import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { convertPdfToMarkdown } from './utils/pdfToMarkdown';
import { convertTextToTableWithLLM } from './api/documentParse';
import { PdfProcessingOptions } from './types';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const UPSTAGE_API_KEY = process.env.UPSTAGE_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!UPSTAGE_API_KEY) {
    console.error('UPSTAGE_API_KEY environment variable is required');
    process.exit(1);
}

if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY environment variable is required');
    process.exit(1);
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

        const options: PdfProcessingOptions = {
            outputFormat: req.body.outputFormat || 'markdown',
            includeMetadata: req.body.includeMetadata !== 'false'
        };

        const result = await convertPdfToMarkdown(req.file.path, UPSTAGE_API_KEY, options);
        
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        if (result.success) {
            res.json({
                success: true,
                content: result.content,
                metadata: result.metadata
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

app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
    console.log(`PDF to Markdown converter running on http://localhost:${port}`);
    console.log(`Web Interface: http://localhost:${port}`);
    console.log('Endpoints:');
    console.log('  POST /convert-pdf - Convert PDF to markdown');
    console.log('  GET  /health - Health check');
});