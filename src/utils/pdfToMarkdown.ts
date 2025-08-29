import { MarkdownResult, PdfProcessingOptions } from '../types';
import { parseDocumentWithUpstage } from '../api/documentParse';

export const convertPdfToMarkdown = async (
    filePath: string,
    apiKey: string,
    options: PdfProcessingOptions = { outputFormat: 'markdown', includeMetadata: true }
): Promise<MarkdownResult> => {
    try {
        const response = await parseDocumentWithUpstage(filePath, apiKey);
        console.log('Upstage API Response:', JSON.stringify(response, null, 2));
        
        let content = '';
        
        // Handle the actual Upstage API response format
        const responseAny = response as any;
        
        // Check if response has pages array (page-split format)
        if (responseAny.pages && Array.isArray(responseAny.pages)) {
            content = processPageSplitResponse(responseAny, options);
        } else if (responseAny.content) {
            // Handle legacy single-document format
            if (options.outputFormat === 'markdown' && responseAny.content.html) {
                // Convert HTML to Markdown
                content = convertHtmlToMarkdown(responseAny.content.html);
            } else if (responseAny.content.text) {
                // Use plain text
                content = responseAny.content.text;
            } else if (responseAny.content.markdown) {
                // Use markdown if available
                content = responseAny.content.markdown;
            } else {
                content = 'No content available in the expected format';
            }
        } else {
            // Fallback for unexpected response format
            content = JSON.stringify(response, null, 2);
        }

        const result: MarkdownResult = {
            success: true,
            content: content.trim()
        };

        if (options.includeMetadata) {
            if (responseAny.pages && Array.isArray(responseAny.pages)) {
                // Page-split format metadata
                result.metadata = {
                    api_version: responseAny.api || 'Unknown',
                    total_pages: responseAny.pages.length,
                    pages_processed: responseAny.pages.length,
                    has_page_splitting: true,
                    processing_mode: 'page-split'
                };
            } else {
                // Legacy format metadata
                result.metadata = {
                    api_version: responseAny.api || 'Unknown',
                    total_elements: responseAny.elements ? responseAny.elements.length : 0,
                    has_html: !!responseAny.content?.html,
                    has_text: !!responseAny.content?.text,
                    has_markdown: !!responseAny.content?.markdown,
                    processing_mode: 'single-document'
                };
            }
        }

        return result;
    } catch (error) {
        console.error('Error in convertPdfToMarkdown:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
};

// Process page-split response format with page markers
function processPageSplitResponse(response: any, options: PdfProcessingOptions): string {
    const pages = response.pages || [];
    const pageContents: string[] = [];
    
    pages.forEach((page: any, index: number) => {
        const pageNum = page.page || index + 1;
        let pageContent = '';
        
        // Add page marker
        pageContents.push(`\n--- PAGE ${pageNum} ---\n`);
        
        // Extract content based on format preference
        if (options.outputFormat === 'markdown') {
            if (page.markdown) {
                pageContent = page.markdown;
            } else if (page.html) {
                pageContent = convertHtmlToMarkdown(page.html);
            } else if (page.text) {
                pageContent = page.text;
            }
        } else {
            // text format
            pageContent = page.text || '';
        }
        
        // Add page content if it exists
        if (pageContent.trim()) {
            pageContents.push(pageContent.trim());
        }
        
        // Add page separator (except for last page)
        if (index < pages.length - 1) {
            pageContents.push('\n');
        }
    });
    
    return pageContents.join('');
}

// Simple HTML to Markdown conversion
function convertHtmlToMarkdown(html: string): string {
    return html
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1')
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1') 
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1')
        .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1')
        .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1')
        .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1')
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
        .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
        .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
        .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<div[^>]*>(.*?)<\/div>/gi, '$1\n')
        .replace(/<span[^>]*>(.*?)<\/span>/gi, '$1')
        .replace(/<[^>]*>/g, '') // Remove remaining HTML tags
        .replace(/\n\s*\n\s*\n/g, '\n\n') // Clean up multiple newlines
        .trim();
}