
'use client';

import React, { useEffect, useState, useContext, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Trash2, Save, CaseSensitive, Send, ZoomIn, ZoomOut, RotateCcw, RotateCw, ArrowUp, ArrowDown, ArrowRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
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
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';


interface TextItem {
  id: string;
  content: string;
  position: [number, number];
  font_size: number;
  width?: number;
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
  const { toast } = useToast();
  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSaveErrorAlert, setShowSaveErrorAlert] = useState(false);


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

  const saveBoard = useCallback(async (data: BoardData | null) => {
    if (!data) return;
    const filePath = getFilePath();
    if (!filePath) return;
    try {
      const content = JSON.stringify(data, null, 2);
      await writeFile(filePath, content);
      setShowSaveErrorAlert(false);
      toast({ title: "Board Saved", description: "Your changes have been saved to the file." });
    } catch (err) {
      setShowSaveErrorAlert(true);
      console.error(err);
    }
  }, [getFilePath, writeFile, toast]);

  useEffect(() => {
    const loadBoard = async () => {
      const filePath = getFilePath();
      if (!filePath || !rootDirectoryHandle) return;

      try {
        const fileContent = await readFile(filePath);
        const data = JSON.parse(fileContent) as BoardData;
        
        const dataWithIds = {
          ...data,
          slides: data.slides.map(slide => ({
            ...slide,
            texts: slide.texts.map(text => ({
              ...text,
              id: text.id || `text-${Date.now()}-${Math.random()}`
            }))
          }))
        };
        setBoardData(dataWithIds);

      } catch (err) {
        setError('Failed to load board data.');
        console.error(err);
      }
    };

    loadBoard();
  }, [getFilePath, readFile, rootDirectoryHandle]);


  const handleAddSlide = () => {
    if (!boardData) return;
    const newSlide: Slide = {
        slide_number: boardData.slides.length + 1,
        texts: [],
        images: [],
    };
    const updatedData = { ...boardData, slides: [...boardData.slides, newSlide] };
    setBoardData(updatedData);
    setCurrentSlideIndex(updatedData.slides.length - 1);
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
      
      const newIndex = Math.max(0, currentSlideIndex - 1);
      setCurrentSlideIndex(newIndex);
    }
  };
  
  const handleThumbnailClick = (index: number) => {
    setCurrentSlideIndex(index);
    setSelectedTextId(null);
  };

  const handleAddText = () => {
    if (!boardData) return;

    const newText: TextItem = {
      id: `text-${Date.now()}-${Math.random()}`,
      content: 'New Text',
      position: [50, 50],
      font_size: 24,
      width: 200,
    };

    const updatedSlides = boardData.slides.map((slide, index) => {
      if (index === currentSlideIndex) {
        return {
          ...slide,
          texts: [...slide.texts, newText],
        };
      }
      return slide;
    });
    
    setBoardData({ ...boardData, slides: updatedSlides });
  };

  const handleMoveText = (direction: 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right') => {
    if (!selectedTextId || !boardData) return;

    const step = 2; // Percentage step

    const updatedSlides = boardData.slides.map((slide, index) => {
        if (index === currentSlideIndex) {
            return {
                ...slide,
                texts: slide.texts.map(text => {
                    if (text.id === selectedTextId) {
                        let newX = text.position[0];
                        let newY = text.position[1];

                        switch (direction) {
                            case 'up': newY -= step; break;
                            case 'down': newY += step; break;
                            case 'left': newX -= step; break;
                            case 'right': newX += step; break;
                            case 'up-left': newY -= step; newX -= step; break;
                            case 'up-right': newY -= step; newX += step; break;
                            case 'down-left': newY += step; newX -= step; break;
                            case 'down-right': newY += step; newX += step; break;
                        }

                        return { ...text, position: [newX, newY] as [number, number] };
                    }
                    return text;
                })
            };
        }
        return slide;
    });

    setBoardData({ ...boardData, slides: updatedSlides });
  };
  
  const currentSlide = boardData?.slides[currentSlideIndex];

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-transparent z-10">
      {/* Header */}
      <header className="flex-shrink-0 h-12 flex items-center justify-between px-3 box-border bg-card/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Home</span>
          </Button>
          <h1 className="text-lg font-semibold truncate">
            {getFileName()}
          </h1>
        </div>
        <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => saveBoard(boardData)}>
              <Save className="h-5 w-5" />
              <span className="sr-only">Save Board</span>
            </Button>
            <Button variant="ghost" size="icon">
                <Send className="h-5 w-5" />
                <span className="sr-only">Send</span>
            </Button>
        </div>
      </header>
      
      {/* Thumbnails */}
      {boardData && (
        <div className="flex-shrink-0 h-20 grid grid-cols-[1fr_auto] bg-card/80 backdrop-blur-sm border-b border-border">
            <div className="flex items-center p-2 gap-2 overflow-x-auto overflow-y-hidden">
                {boardData.slides.map((slide, index) => (
                    <div key={index} className="flex-shrink-0 text-center">
                        <Card
                            onClick={() => handleThumbnailClick(index)}
                            className={cn(
                                "cursor-pointer transition-all border-2 w-[72px] h-[48px] box-border relative",
                                index === currentSlideIndex ? "border-primary" : "border-transparent hover:border-muted-foreground/50"
                            )}
                        >
                            <CardContent className="flex flex-col items-center justify-center h-full p-1 bg-white/90">
                                <span className="text-xs text-black/70 truncate scale-[0.5] leading-none">
                                    {slide.texts.length > 0 ? slide.texts[0].content : `Slide ${index + 1}`}
                                </span>
                            </CardContent>
                        </Card>
                        <p className="text-xs mt-1">{index + 1}</p>
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-2 p-2 border-l border-border">
                <Button variant="outline" size="icon" onClick={handleAddSlide} className="w-12 h-12 text-2xl">
                    <Plus className="h-6 w-6" />
                    <span className="sr-only">Add Slide</span>
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon" disabled={boardData.slides.length <= 1} className="w-12 h-12 text-2xl">
                        <Trash2 className="h-6 w-6" />
                        <span className="sr-only">Delete Slide</span>
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
        </div>
      )}

      {/* Toolbar */}
      <div className="flex-shrink-0 h-12 flex items-center px-3 box-border bg-card/80 backdrop-blur-sm border-b border-border">
          <Button variant="ghost" size="icon" onClick={handleAddText}>
            <CaseSensitive className="h-5 w-5" />
            <span className="sr-only">Add Text</span>
          </Button>
      </div>

      {/* Main Content & Footer */}
      <div className="flex-grow flex flex-col bg-transparent overflow-hidden">
        {/* Canvas */}
        <main className="flex-grow w-full flex justify-center items-center bg-transparent">
            {error && <p className="text-destructive">{error}</p>}
            {!boardData && !error && <p className="text-muted-foreground">Loading board...</p>}

            {boardData && currentSlide ? (
                <div id="canvas-container" className="w-full max-w-6xl aspect-video bg-white rounded-lg shadow-lg relative overflow-hidden border">
                    {currentSlide.texts.map((text) => (
                        <div
                            key={text.id}
                            onClick={() => setSelectedTextId(text.id)}
                            style={{
                                position: 'absolute',
                                left: `${text.position[0]}%`,
                                top: `${text.position[1]}%`,
                                transform: 'translate(-50%, -50%)',
                                fontSize: `${text.font_size}px`,
                                width: text.width ? `${text.width}px` : 'auto',
                                color: 'black',
                                padding: '4px',
                                wordWrap: 'break-word',
                                cursor: 'pointer',
                                border: selectedTextId === text.id ? '2px dashed hsl(var(--primary))' : '2px dashed transparent',
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

        {/* Controls Footer */}
        <footer className="flex-shrink-0 bg-transparent flex items-center justify-center p-2">
            <div className="flex gap-5 p-2.5 rounded-lg border-2 border-primary bg-card/80 backdrop-blur-sm">
                <div className="grid grid-cols-3 grid-rows-3 gap-2.5">
                    <Button variant="outline" size="icon" onClick={() => handleMoveText('up-left')}>
                      <svg width="20" height="20" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.29289 2.29289C8.68342 1.90237 9.31658 1.90237 9.70711 2.29289L13.2071 5.79289C13.5976 6.18342 13.5976 6.81658 13.2071 7.20711C12.8166 7.59763 12.1834 7.59763 11.7929 7.20711L9 4.41421L6.20711 7.20711C5.81658 7.59763 5.18342 7.59763 4.79289 7.20711C4.40237 6.81658 4.40237 6.18342 4.79289 5.79289L8.29289 2.29289ZM8 12.5L8 3L10 3L10 12.5H8Z" fill="currentColor"></path></svg>
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleMoveText('up')}><ArrowUp className="h-5 w-5"/></Button>
                    <Button variant="outline" size="icon" onClick={() => handleMoveText('up-right')}>
                      <svg width="20" height="20" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5.29289 2.29289C5.68342 1.90237 6.31658 1.90237 6.70711 2.29289L10.2071 5.79289C10.5976 6.18342 10.5976 6.81658 10.2071 7.20711C9.81658 7.59763 9.18342 7.59763 8.79289 7.20711L6 4.41421L3.20711 7.20711C2.81658 7.59763 2.18342 7.59763 1.79289 7.20711C1.40237 6.81658 1.40237 6.18342 1.79289 5.79289L5.29289 2.29289ZM5 12.5L5 3H7L7 12.5H5Z" fill="currentColor"></path></svg>
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleMoveText('left')}><ArrowLeft className="h-5 w-5"/></Button>
                    <Button variant="outline" size="icon"><RotateCw className="h-5 w-5"/></Button>
                    <Button variant="outline" size="icon" onClick={() => handleMoveText('right')}><ArrowRight className="h-5 w-5"/></Button>
                    <Button variant="outline" size="icon" onClick={() => handleMoveText('down-left')}>
                      <svg width="20" height="20" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.29289 12.7071C8.68342 13.0976 9.31658 13.0976 9.70711 12.7071L13.2071 9.20711C13.5976 8.81658 13.5976 8.18342 13.2071 7.79289C12.8166 7.40237 12.1834 7.40237 11.7929 7.79289L9 10.5858L6.20711 7.79289C5.81658 7.40237 5.18342 7.40237 4.79289 7.79289C4.40237 8.18342 4.40237 8.81658 4.79289 9.20711L8.29289 12.7071ZM8 2.5L8 12L10 12L10 2.5H8Z" fill="currentColor"></path></svg>
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleMoveText('down')}><ArrowDown className="h-5 w-5"/></Button>
                    <Button variant="outline" size="icon" onClick={() => handleMoveText('down-right')}>
                      <svg width="20" height="20" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5.29289 12.7071C5.68342 13.0976 6.31658 13.0976 6.70711 12.7071L10.2071 9.20711C10.5976 8.81658 10.5976 8.18342 10.2071 7.79289C9.81658 7.40237 9.18342 7.40237 8.79289 7.79289L6 10.5858L3.20711 7.79289C2.81658 7.40237 2.18342 7.40237 1.79289 7.79289C1.40237 8.18342 1.40237 8.81658 1.79289 9.20711L5.29289 12.7071ZM5 2.5L5 12H7L7 2.5H5Z" fill="currentColor"></path></svg>
                    </Button>
                </div>
                <div className="grid grid-cols-2 grid-rows-3 gap-2.5 items-center justify-items-center">
                    <Button variant="outline" size="icon"><ZoomOut className="h-5 w-5"/></Button>
                    <Button variant="outline" size="icon"><ZoomIn className="h-5 w-5"/></Button>
                    <Button variant="outline" size="icon"><ChevronsLeft className="h-5 w-5"/></Button>
                    <Button variant="outline" size="icon"><ChevronsRight className="h-5 w-5"/></Button>
                    <Button variant="destructive" className="col-span-2 w-full"><Trash2 className="h-5 w-5 mr-2"/> Delete</Button>
                </div>
            </div>
        </footer>
      </div>

      <AlertDialog open={showSaveErrorAlert} onOpenChange={setShowSaveErrorAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save Failed</AlertDialogTitle>
            <AlertDialogDescription>
              Could not save your changes to the file. Please check your permissions and try again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => saveBoard(boardData)}>Retry</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
 