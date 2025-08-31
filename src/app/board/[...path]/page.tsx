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
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel"
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import Image from 'next/image';


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
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()

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

  useEffect(() => {
    if (!carouselApi) {
      return
    }
    carouselApi.on("select", () => {
      setCurrentSlideIndex(carouselApi.selectedScrollSnap())
    })
  }, [carouselApi])

  const currentSlide = boardData?.slides[currentSlideIndex];

  const handleNextSlide = () => {
    if (boardData && currentSlideIndex < boardData.slides.length - 1) {
      carouselApi?.scrollNext()
    }
  };

  const handlePrevSlide = () => {
    if (currentSlideIndex > 0) {
      carouselApi?.scrollPrev()
    }
  };

  const handleAddSlide = () => {
    const newSlide: Slide = {
        slide_number: (boardData?.slides.length ?? 0) + 1,
        texts: [],
        images: [],
    };
    const updatedSlides = boardData ? [...boardData.slides, newSlide] : [newSlide];
    const newData = { slides: updatedSlides };
    setBoardData(newData);
    saveBoard(newData);
    
    // Use a timeout to ensure the new slide is rendered before scrolling
    setTimeout(() => {
        carouselApi?.scrollTo(updatedSlides.length - 1);
    }, 100);
  };
  
  const handleDeleteSlide = () => {
    if (boardData && boardData.slides.length > 1) {
      const updatedSlides = boardData.slides.filter((_, index) => index !== currentSlideIndex);
      const renumberedSlides = updatedSlides.map((slide, index) => ({
          ...slide,
          slide_number: index + 1
      }));
      const newData = { ...boardData, slides: renumberedSlides };
      setBoardData(newData);
      saveBoard(newData);
      
      const newIndex = Math.max(0, currentSlideIndex - 1);
      setCurrentSlideIndex(newIndex);
      // Use a timeout to ensure the UI has updated before scrolling
      setTimeout(() => {
        carouselApi?.scrollTo(newIndex, true);
      }, 100);
    }
  };
  
  const handleThumbnailClick = (index: number) => {
    carouselApi?.scrollTo(index);
  };

  return (
    <>
      <BackgroundAnimation />
      <div className="min-h-screen bg-transparent flex flex-col">
        <header className="flex items-center justify-between p-4 text-foreground shrink-0">
          <Button variant="ghost" onClick={() => router.push('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Files
          </Button>
          <h1 className="text-xl font-bold text-center truncate flex-1 mx-4">
            {getFileName()}
          </h1>
           <div className="w-[130px] hidden sm:block" /> {/* Placeholder to balance the back button */}
        </header>

        <main className="flex-grow flex items-center justify-center p-4">
            {error && <p className="text-destructive">{error}</p>}
            
            {!boardData && !error && <p className="text-muted-foreground">Loading board...</p>}

            {boardData && currentSlide ? (
                 <div className="w-full max-w-6xl aspect-video bg-white rounded-lg shadow-lg relative overflow-hidden border">
                    {currentSlide.texts.map((text, index) => (
                         <div
                            key={index}
                            className="absolute text-black"
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
        </main>
        
        {boardData && (
          <footer className="shrink-0 pb-4 px-4">
            <div className="max-w-7xl mx-auto flex items-center justify-center gap-4 text-foreground">
                <Button variant="outline" size="icon" onClick={handlePrevSlide} disabled={currentSlideIndex === 0}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
            
                <Carousel setApi={setCarouselApi} className="w-full max-w-xs sm:max-w-md md:max-w-2xl">
                    <CarouselContent>
                        {boardData.slides.map((slide, index) => (
                        <CarouselItem key={index} className="basis-1/3 sm:basis-1/4 md:basis-1/5 lg:basis-1/6">
                            <div className="p-1">
                                <Card
                                    onClick={() => handleThumbnailClick(index)}
                                    className={cn(
                                        "cursor-pointer transition-all border-2",
                                        index === currentSlideIndex ? "border-primary" : "border-transparent hover:border-muted-foreground/50"
                                    )}
                                >
                                    <CardContent className="flex flex-col items-center justify-center aspect-video p-2 bg-white/90">
                                       <span className="text-xs text-black/70">
                                         {slide.texts.length > 0 ? slide.texts[0].content.substring(0, 15) + '...' : ''}
                                       </span>
                                    </CardContent>
                                </Card>
                                <p className="text-center text-xs mt-1">{index + 1}</p>
                            </div>
                        </CarouselItem>
                        ))}
                    </CarouselContent>
                </Carousel>

                <Button variant="outline" size="icon" onClick={handleNextSlide} disabled={!boardData || currentSlideIndex === boardData.slides.length - 1}>
                    <ChevronRight className="h-4 w-4" />
                </Button>

                <div className="mx-2 sm:mx-4 h-6 border-l border-border" />
                
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
            </div>
          </footer>
        )}
      </div>
    </>
  );
}
