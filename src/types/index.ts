export interface UploadFile {
    filename: string;
    mimetype: string;
    size: number;
}

export interface MarkdownResult {
    success: boolean;
    content?: string;
    error?: string;
    metadata?: Record<string, any>;
}

export interface UpstageDocumentParseResponse {
    id: string;
    pages: Array<{
        page: number;
        text?: string;
        html?: string;
        elements?: Array<{
            category: string;
            text: string;
            html?: string;
            coordinates?: Array<number>;
        }>;
    }>;
    metadata?: {
        total_pages: number;
        [key: string]: any;
    };
}

export interface PdfProcessingOptions {
    outputFormat: 'markdown' | 'text';
    includeMetadata: boolean;
}