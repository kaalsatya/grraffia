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
      try {
        const path = Array.isArray(params.path) ? params.path.join('/') : params.path;
        const decodedPath = decodeURIComponent(path);
        
        // This is a simplified example. In a real app, you would need a more robust way
        // to get the directory handle, likely from a global state or context after the
        // user has picked a folder on the home page.
        // For now, we assume the user has already granted permission.
        const rootHandle = await navigator.storage.getDirectory(); // This won't work directly, placeholder
        
        // This part of the code is conceptually correct but won't work in practice
        // without a way to persist the FileSystemDirectoryHandle. We will address this later.
        
        // Let's stub the data for now to build the UI.
        const fileContent = `{
          "slides": [
            {
              "slide_number": 1,
              "texts": [
                { "content": "This is a slide", "position": [10, 10], "font_size": 48 }
              ],
              "images": []
            }
          ]
        }`;

        const data = JSON.parse(fileContent) as BoardData;
        setBoardData(data);

      } catch (err) {
        setError('Failed to load the board file. Please ensure you have granted access to the folder.');
        console.error(err);
      }
    };

    if (params.path) {
      // For now, we are using placeholder data.
      // We will implement the actual file reading in a future step.
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
    }
  }, [params.path]);

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
            {params.path ? decodeURIComponent(Array.isArray(params.path) ? params.path[params.path.length-1] : params.path) : 'Board'}
          </h1>
        </header>

        <div className="flex-grow flex items-center justify-center">
            {error && <p className="text-red-500">{error}</p>}
            
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
                <p>Loading board...</p>
            )}
        </div>
      </main>
    </>
  );
}
