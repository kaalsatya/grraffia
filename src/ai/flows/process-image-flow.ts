'use server';
/**
 * @fileOverview An image processing AI flow for document scanning.
 *
 * - processImage - A function that takes an image, converts it to greyscale, and removes the background.
 * - ProcessImageInput - The input type for the processImage function.
 * - ProcessImageOutput - The return type for the processImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProcessImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a document or object, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ProcessImageInput = z.infer<typeof ProcessImageInputSchema>;

const ProcessImageOutputSchema = z.object({
    photoDataUri: z
    .string()
    .describe(
      "The processed photo as a data URI, in PNG format with a transparent background."
    ),
});
export type ProcessImageOutput = z.infer<typeof ProcessImageOutputSchema>;

export async function processImage(input: ProcessImageInput): Promise<ProcessImageOutput> {
  return processImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'processImagePrompt',
  input: {schema: ProcessImageInputSchema},
  output: {schema: ProcessImageOutputSchema},
  prompt: `You are a document scanner. Your task is to process the following image.
You must perform the following actions:
1.  Convert the image to a high-contrast, black-and-white (greyscale) image.
2.  Remove the background of the image entirely, making it transparent. The output image must be a PNG.
3.  Clean up any noise or artifacts, sharpening the main subject like a high-quality scanner.

Return the final, processed image as a data URI.

Image: {{media url=photoDataUri}}`,
});

const processImageFlow = ai.defineFlow(
  {
    name: 'processImageFlow',
    inputSchema: ProcessImageInputSchema,
    outputSchema: ProcessImageOutputSchema,
  },
  async (input) => {
    const llmResponse = await ai.generate({
        prompt: `You are a document scanner. Your task is to process the following image.
You must perform the following actions:
1.  Convert the image to a high-contrast, black-and-white (greyscale) image.
2.  Remove the background of the image entirely, making it transparent. The output image must be a PNG.
3.  Clean up any noise or artifacts, sharpening the main subject like a high-quality scanner.`,
        input: [
            { media: { url: input.photoDataUri } },
        ]
    });

    const outputImage = llmResponse.output();
    if (!outputImage || !outputImage.media) {
        throw new Error("Image processing failed to return an image.");
    }
    
    return { photoDataUri: outputImage.media.url };
  }
);
