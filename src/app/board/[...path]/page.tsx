'use client';

import React, { useEffect, useState, useContext, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { BackgroundAnimation } from '@/components/BackgroundAnimation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { WorkspaceContext } from '@/context/WorkspaceContext';

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
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("BoardPage must be used within a WorkspaceProvider");
  }
  const { readFile, writeFile, rootDirectoryHandle } = context;

  const getFilePath = useCallback(() => {
    if (!params.path) return null;
    const path = Array.isArray(params.path) ? params.path.join('/') : params.path;
    return decodeURIComponent(path);
  }, [params.path]);

  const getFileName = () => {
    const filePath = getFilePath();
    if (!filePath) return 'Board';
    const parts = filePath.split('/');
    return parts[parts.length - 1];
  };

  const saveBoard = useCallback(async (data: BoardData) => {
    const filePath = getFilePath();
    if (!filePath) return;
    try {
      const content = JSON.stringify(data, null, 2);
      await writeFile(filePath, content);
    } catch (err) {
      setError('Failed to save board data.');
      console.error(err);
    }
  }, [getFilePath, writeFile]);

  useEffect(() => {
    const loadBoard = async () => {
      const filePath = getFilePath();
      if (!filePath || !rootDirectoryHandle) return;

      try {
        const fileContent = await readFile(filePath);
        const data = JSON.parse(fileContent) as BoardData;
        setBoardData(data);
      } catch (err) {
        setError('Failed to load board data.');
        console.error(err);
      }
    };

    loadBoard();
  }, [getFilePath, readFile, rootDirectoryHandle]);


  const currentSlide = boardData?.slides[currentSlideIndex];

  const handleNextSlide = () => {
    if (boardData && currentSlideIndex < boardData.slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  const handlePrevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const handleAddSlide = () => {
    setBoardData(prevData => {
        if (!prevData) return null;
        const newSlide: Slide = {
            slide_number: prevData.slides.length + 1,
            texts: [],
            images: [],
        };
        const updatedSlides = [...prevData.slides, newSlide];
        const newData = { ...prevData, slides: updatedSlides };
        saveBoard(newData);
        return newData;
    });
    setCurrentSlideIndex(boardData ? boardData.slides.length : 0);
  };
  
  const handleDeleteSlide = () => {
    if (boardData && boardData.slides.length > 1) {
        setBoardData(prevData => {
            if (!prevData) return null;
            const updatedSlides = prevData.slides.filter((_, index) => index !== currentSlideIndex);
            const renumberedSlides = updatedSlides.map((slide, index) => ({
                ...slide,
                slide_number: index + 1
            }));
            const newData = { ...prevData, slides: renumberedSlides };
            saveBoard(newData);
            setCurrentSlideIndex(prevIndex => Math.max(0, prevIndex - 1));
            return newData;
        });
    }
  };

  return (
    <>
      <BackgroundAnimation />
      <main className="min-h-screen bg-transparent p-4 flex flex-col">
        <header className="flex items-center justify-between mb-4 text-foreground">
          <Button variant="ghost" onClick={() => router.push('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Files
          </Button>
          <h1 className="text-xl font-bold text-center truncate flex-1 mx-4">
            {getFileName()}
          </h1>
           <div className="w-[130px]" /> {/* Placeholder to balance the back button */}
        </header>

        <div className="flex-grow flex items-center justify-center">
            {error && <p className="text-destructive">{error}</p>}
            
            {!boardData && !error && <p className="text-muted-foreground">Loading board...</p>}

            {boardData && currentSlide ? (
                 <div className="w-full max-w-6xl aspect-video bg-card/80 backdrop-blur-sm rounded-lg shadow-lg relative overflow-hidden border">
                    {currentSlide.texts.map((text, index) => (
                         <div
                            key={index}
                            className="absolute text-foreground"
                            style={{
                                left: `${text.position[0]}%`,
                                top: `${text.position[1]}%`,
                                transform: 'translate(-50%, -50%)',
                                fontSize: `${text.font_size}px`,
                                whiteSpace: 'pre-wrap',
                                textAlign: 'center'
                            }}
                         >
                            {text.content}
                         </div>
                    ))}
                 </div>
            ) : (
                !error && boardData && <p className="text-muted-foreground">This board is empty. Add a new slide to begin.</p>
            )}
        </div>
        
        {boardData && (
          <footer className="flex items-center justify-center gap-4 py-4 text-foreground">
            <Button variant="outline" size="icon" onClick={handlePrevSlide} disabled={currentSlideIndex === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <span className="text-sm font-medium">
              Slide {currentSlideIndex + 1} of {boardData.slides.length}
            </span>

            <Button variant="outline" size="icon" onClick={handleNextSlide} disabled={!boardData || currentSlideIndex === boardData.slides.length - 1}>
              <ChevronRight className="h-4 w-4" />
            </Button>

            <div className="mx-4 h-6 border-l border-border" />
            
            <Button variant="outline" size="icon" onClick={handleAddSlide}>
              <Plus className="h-4 w-4" />
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon" disabled={!boardData || boardData.slides.length <= 1}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete slide {currentSlideIndex + 1}. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteSlide}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </footer>
        )}
      </main>
    </>
  );
}
