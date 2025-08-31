'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { BackgroundAnimation } from '@/components/BackgroundAnimation';

interface TextItem {
  content: string;
  position: [number, number];
  font_size: number;
}

interface ImageItem {
  filename: string;
  position: [number, number];
  scale: number;
}

interface Slide {
  slide_number: number;
  texts: TextItem[];
  images: ImageItem[];
}

interface BoardData {
  slides: Slide[];
}

export default function BoardPage() {
  const router = useRouter();
  const params = useParams();
  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBoard = async () => {
      // The actual file loading logic will be implemented in a future step.
      // For now, we'll use placeholder data to confirm the page works.
      try {
        // This is a placeholder to simulate loading.
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const fileContent = `{
          "slides": [
            {
              "slide_number": 1,
              "texts": [
                { "content": "Welcome to your presentation!", "position": [50, 50], "font_size": 48 }
              ],
              "images": []
            }
          ]
        }`;
        const data = JSON.parse(fileContent) as BoardData;
        setBoardData(data);

      } catch (err) {
        setError('Failed to load board data.');
        console.error(err);
      }
    };

    if (params.path) {
      loadBoard();
    }
  }, [params.path]);

  const getFileName = () => {
    if (!params.path) return 'Board';
    const path = Array.isArray(params.path) ? params.path.join('/') : params.path;
    const decodedPath = decodeURIComponent(path);
    const parts = decodedPath.split('/');
    return parts[parts.length - 1];
  }

  return (
    <>
      <BackgroundAnimation />
      <main className="min-h-screen bg-transparent p-4 flex flex-col">
        <header className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => router.push('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Files
          </Button>
          <h1 className="text-xl font-bold">
            {getFileName()}
          </h1>
        </header>

        <div className="flex-grow flex items-center justify-center">
            {error && <p className="text-red-500">{error}</p>}
            
            {!boardData && !error && <p>Loading board...</p>}

            {boardData && boardData.slides.length > 0 ? (
                 <div className="w-full h-full aspect-video bg-card/80 backdrop-blur-sm rounded-lg shadow-lg relative overflow-hidden">
                    {boardData.slides[0].texts.map((text, index) => (
                         <div
                            key={index}
                            className="absolute"
                            style={{
                                left: `${text.position[0]}%`,
                                top: `${text.position[1]}%`,
                                transform: 'translate(-50%, -50%)',
                                fontSize: `${text.font_size}px`,
                                color: 'white'
                            }}
                         >
                            {text.content}
                         </div>
                    ))}
                 </div>
            ) : (
                !error && boardData && <p>This board is empty.</p>
            )}
        </div>
      </main>
    </>
  );
}
