'use server';
/**
 * @fileOverview An AI flow for scanning and cleaning up document images.
 *
 * - scanDocument - A function that takes an image of a document and returns a cleaned-up, scanned version.
 * - ScanDocumentInput - The input type for the scanDocument function.
 * - ScanDocumentOutput - The return type for the scanDocument function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const ScanDocumentInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ScanDocumentInput = z.infer<typeof ScanDocumentInputSchema>;

const ScanDocumentOutputSchema = z.object({
  scannedImageUri: z
    .string()
    .describe(
      'The processed document image as a data URI with a transparent background.'
    ),
});
export type ScanDocumentOutput = z.infer<typeof ScanDocumentOutputSchema>;


const prompt = ai.definePrompt({
  name: 'scanDocumentPrompt',
  input: {schema: ScanDocumentInputSchema},
  output: {schema: ScanDocumentOutputSchema},
  prompt: `You are an expert document scanning and restoration specialist. Your task is to take the user-provided image, identify the document within it, and transform it into a high-quality, clean, black-and-white scanned document with a transparent background.

  Follow these steps precisely:
  1.  **Isolate the Document:** Identify the main document in the image, ignoring the surrounding background.
  2.  **Perspective Correction:** Correct any perspective distortion so the document appears flat, as if it were scanned on a flatbed scanner.
  3.  **High-Contrast Black and White:** Convert the document to a pure black and white image. All text and lines should be solid black, and all other areas should be perfectly transparent. Do not use any shades of grey.
  4.  **Cleanup:** Remove any shadows, noise, compression artifacts, or blemishes from the document.
  5.  **Output:** Return the final, cleaned-up document as a PNG image in a data URI. The background of the document must be transparent.

  Image of the document to process: {{media url=photoDataUri}}`,
});

const scanDocumentFlow = ai.defineFlow(
  {
    name: 'scanDocumentFlow',
    inputSchema: ScanDocumentInputSchema,
    outputSchema: ScanDocumentOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);

export async function scanDocument(input: ScanDocumentInput): Promise<ScanDocumentOutput> {
    return scanDocumentFlow(input);
}
