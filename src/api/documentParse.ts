import fs from 'fs';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { UpstageDocumentParseResponse } from '../types';

const UPSTAGE_API_URL = 'https://api.upstage.ai/v1/document-digitization';
const UPSTAGE_CHAT_API_URL = 'https://api.upstage.ai/v1/solar/chat/completions';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export const parseDocumentWithUpstage = async (
    filePath: string,
    apiKey: string
): Promise<UpstageDocumentParseResponse> => {
    if (!apiKey) {
        throw new Error('Upstage API key is required');
    }

    const formData = new FormData();
    formData.append('document', fs.createReadStream(filePath));
    formData.append('output_formats', JSON.stringify(['html', 'text']));
    formData.append('ocr', 'auto');
    formData.append('coordinates', 'true');
    formData.append('model', 'document-parse');

    try {
        const response = await fetch(UPSTAGE_API_URL, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${apiKey}`,
                ...formData.getHeaders()
            },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Upstage API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return data as UpstageDocumentParseResponse;
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Error parsing document: ${error.message}`);
        }
        throw new Error(`Error parsing document: ${error}`);
    }
};

export const convertTextToTableWithLLM = async (
    text: string,
    upstageApiKey: string,
    openaiApiKey: string
): Promise<string> => {
    if (!openaiApiKey) {
        throw new Error('OpenAI API key is required');
    }

    const prompt = `You are a Markdown table generator. 

Instructions:
1. Convert the given text into a Markdown table.
2. Only output the Markdown table. Do NOT output any explanations, comments, or extra text.
3. Maintain headers and columns as clearly as possible.

Here is the input text:

${text}`;

    try {
        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 2000,
                temperature: 0.1
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const result = data.choices?.[0]?.message?.content?.trim();

        if (!result) {
            throw new Error('No response from LLM');
        }

        if (result === 'NOT_TABULAR_DATA') {
            throw new Error('The selected text does not contain tabular data that can be converted to a table');
        }

        return result;
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Error converting to table: ${error.message}`);
        }
        throw new Error(`Error converting to table: ${error}`);
    }
};