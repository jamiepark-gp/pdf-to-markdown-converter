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
        
        // Process content and add intelligent page markers
        if (responseAny.content) {
            let rawContent = '';
            
            if (options.outputFormat === 'markdown' && responseAny.content.html) {
                // Convert HTML to Markdown
                rawContent = convertHtmlToMarkdown(responseAny.content.html);
            } else if (responseAny.content.text) {
                // Use plain text
                rawContent = responseAny.content.text;
            } else if (responseAny.content.markdown) {
                // Use markdown if available
                rawContent = responseAny.content.markdown;
            } else {
                rawContent = 'No content available in the expected format';
            }
            
            // Add intelligent page markers based on content structure
            content = addIntelligentPageMarkers(rawContent);
        } else {
            // Fallback for unexpected response format
            content = JSON.stringify(response, null, 2);
        }

        const result: MarkdownResult = {
            success: true,
            content: content.trim()
        };

        if (options.includeMetadata) {
            const pageMarkers = content.match(/--- PAGE \d+ ---/g) || [];
            result.metadata = {
                api_version: responseAny.api || 'Unknown',
                total_elements: responseAny.elements ? responseAny.elements.length : 0,
                has_html: !!responseAny.content?.html,
                has_text: !!responseAny.content?.text,
                has_markdown: !!responseAny.content?.markdown,
                processing_mode: 'intelligent-chunking',
                estimated_pages: pageMarkers.length,
                has_page_markers: pageMarkers.length > 0
            };
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

// Add intelligent page markers based on content structure
function addIntelligentPageMarkers(content: string): string {
    if (!content || !content.trim()) {
        return content;
    }
    
    // Split content into logical sections for page boundaries
    const sections: Array<{number: number, content: string}> = [];
    let pageNumber = 1;
    
    // Strategy 1: Look for natural page breaks (form feeds, page separators)
    let workingContent = content.replace(/\f/g, '\n--- PAGE BREAK ---\n');
    
    // Strategy 2: Split by major sections (large gaps in content)
    const paragraphs = workingContent.split(/\n\s*\n\s*\n/);
    let currentPage: string[] = [];
    let currentLength = 0;
    const maxPageLength = 3000; // Approximate characters per page
    
    paragraphs.forEach((paragraph) => {
        const paragraphLength = paragraph.length;
        
        // Check if this paragraph contains a manual page break
        if (paragraph.includes('--- PAGE BREAK ---')) {
            if (currentPage.length > 0) {
                sections.push({
                    number: pageNumber++,
                    content: currentPage.join('\n\n').replace(/--- PAGE BREAK ---/g, '').trim()
                });
                currentPage = [];
                currentLength = 0;
            }
            
            // Add the paragraph content after the break marker
            const afterBreak = paragraph.replace('--- PAGE BREAK ---', '').trim();
            if (afterBreak) {
                currentPage.push(afterBreak);
                currentLength += afterBreak.length;
            }
        }
        // Strategy 3: Split by content length with intelligent breaks
        else if (currentLength + paragraphLength > maxPageLength && currentPage.length > 0) {
            // Look for good breaking points (headings, major sections)
            const isGoodBreak = paragraph.match(/^#+\s/) || // Markdown heading
                               paragraph.match(/^[A-Z][A-Z\s]{10,}$/) || // ALL CAPS heading
                               paragraph.match(/^\d+[\.\)]\s/) || // Numbered section
                               paragraph.length > 500; // Long paragraph (likely new section)
            
            if (isGoodBreak || currentLength > maxPageLength * 1.5) {
                sections.push({
                    number: pageNumber++,
                    content: currentPage.join('\n\n').trim()
                });
                currentPage = [paragraph];
                currentLength = paragraphLength;
            } else {
                currentPage.push(paragraph);
                currentLength += paragraphLength;
            }
        } else {
            currentPage.push(paragraph);
            currentLength += paragraphLength;
        }
    });
    
    // Add remaining content as final page
    if (currentPage.length > 0) {
        sections.push({
            number: pageNumber++,
            content: currentPage.join('\n\n').trim()
        });
    }
    
    // If we only have one section and it's very long, force split it
    if (sections.length === 1 && sections[0].content.length > maxPageLength * 2) {
        const longContent = sections[0].content;
        sections.length = 0;
        
        const sentences = longContent.split(/(?<=[.!?])\s+/);
        let currentChunk: string[] = [];
        let chunkLength = 0;
        pageNumber = 1;
        
        sentences.forEach(sentence => {
            if (chunkLength + sentence.length > maxPageLength && currentChunk.length > 0) {
                sections.push({
                    number: pageNumber++,
                    content: currentChunk.join(' ').trim()
                });
                currentChunk = [sentence];
                chunkLength = sentence.length;
            } else {
                currentChunk.push(sentence);
                chunkLength += sentence.length;
            }
        });
        
        if (currentChunk.length > 0) {
            sections.push({
                number: pageNumber,
                content: currentChunk.join(' ').trim()
            });
        }
    }
    
    // Format with page markers
    if (sections.length <= 1) {
        // Don't add page markers for single-page documents
        return content;
    }
    
    return sections.map(section => 
        `--- PAGE ${section.number} ---\n\n${section.content}`
    ).join('\n\n');
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