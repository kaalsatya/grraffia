'use client';

import React, { useEffect, useState, useContext, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Trash2, CaseSensitive } from 'lucide-react';
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
import { EditableText } from '@/components/EditableText';

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
  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
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
      setShowSaveErrorAlert(false); // Hide alert on successful save
    } catch (err) {
      setShowSaveErrorAlert(true);
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
        
        // Add unique IDs to text items if they don't have one
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
    saveBoard(updatedData);
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
      saveBoard(newData);
    }
  };
  
  const handleThumbnailClick = (index: number) => {
    setCurrentSlideIndex(index);
  };

  const handleAddText = () => {
    if (!boardData) return;

    const newText: TextItem = {
      id: `text-${Date.now()}-${Math.random()}`,
      content: 'New Text',
      position: [50, 50], // Center
      font_size: 24,
      width: 200, // Default width
    };

    const updatedSlides = [...boardData.slides];
    updatedSlides[currentSlideIndex].texts.push(newText);
    const updatedData = { ...boardData, slides: updatedSlides };

    setBoardData(updatedData);
    saveBoard(updatedData);
  };

  const updateTextItem = (textId: string, updates: Partial<TextItem>) => {
     if (!boardData) return;
    
    const updatedSlides = boardData.slides.map((slide, index) => {
      if (index === currentSlideIndex) {
        return {
          ...slide,
          texts: slide.texts.map(text => 
            text.id === textId ? { ...text, ...updates } : text
          ),
        };
      }
      return slide;
    });

    const updatedData = { ...boardData, slides: updatedSlides };
    setBoardData(updatedData);
    return updatedData;
  }

  const handleTextChange = (textId: string, newContent: string) => {
    const updatedData = updateTextItem(textId, { content: newContent });
    saveBoard(updatedData);
  };
  
  const handleTextMove = (textId: string, newPosition: [number, number]) => {
    const updatedData = updateTextItem(textId, { position: newPosition });
    // We don't save on every move event for performance, only on pointer up, handled in EditableText
  };
  
  const handleTextResize = (textId: string, newFontSize: number) => {
    const updatedData = updateTextItem(textId, { font_size: newFontSize });
     // We don't save on every resize event for performance, only on pointer up, handled in EditableText
  };

  const handleTextWidthChange = (textId: string, newWidth: number) => {
    const updatedData = updateTextItem(textId, { width: newWidth });
    // We don't save on every resize event for performance, only on pointer up, handled in EditableText
  };

  const handlePointerUp = (textId: string, finalState: Partial<TextItem>) => {
    const updatedData = updateTextItem(textId, finalState);
    saveBoard(updatedData);
  };


  const handleDeleteText = (textId: string) => {
    if (!boardData) return;
      const updatedSlides = boardData.slides.map((slide, index) => {
        if (index === currentSlideIndex) {
          return {
            ...slide,
            texts: slide.texts.filter(text => text.id !== textId),
          };
        }
        return slide;
      });
      const updatedData = { ...boardData, slides: updatedSlides };
      setBoardData(updatedData);
      saveBoard(updatedData);
  };


  const currentSlide = boardData?.slides[currentSlideIndex];

  return (
    <>
      <BackgroundAnimation />
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-transparent">
        {/* Header */}
        <header className="fixed top-0 left-0 w-full h-12 flex items-center justify-between px-3 box-border bg-card/80 backdrop-blur-sm border-b border-border z-20">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to Home</span>
            </Button>
            <h1 className="text-lg font-semibold truncate">
              {getFileName()}
            </h1>
          </div>
           <div className="w-[40px]" /> {/* Placeholder to balance the back button */}
        </header>
        
        {/* Toolbar */}
        <div className="fixed top-12 left-0 w-full h-12 flex items-center px-3 box-border bg-card/80 backdrop-blur-sm border-b border-border z-20">
           <Button variant="ghost" size="icon" onClick={handleAddText}>
              <CaseSensitive className="h-5 w-5" />
              <span className="sr-only">Add Text</span>
            </Button>
        </div>


        {/* Canvas Stage */}
        <main className="fixed top-24 left-0 w-full flex items-center justify-center bg-transparent z-10" style={{ height: 'calc(100vh - 96px - 80px)'}}>
            {error && <p className="text-destructive">{error}</p>}
            
            {!boardData && !error && <p className="text-muted-foreground">Loading board...</p>}

            {boardData && currentSlide ? (
                 <div id="canvas-container" className="w-full max-w-6xl aspect-video bg-white rounded-lg shadow-lg relative overflow-hidden border">
                    {currentSlide.texts.map((text) => (
                         <EditableText
                            key={text.id}
                            id={text.id}
                            content={text.content}
                            position={text.position}
                            fontSize={text.font_size}
                            width={text.width}
                            onSave={handleTextChange}
                            onMove={handleTextMove}
                            onResize={handleTextResize}
                            onWidthChange={handleTextWidthChange}
                            onDelete={handleDeleteText}
                            onPointerUp={handlePointerUp}
                            canvasBounds={document.getElementById('canvas-container')?.getBoundingClientRect()}
                         />
                    ))}
                 </div>
            ) : (
                !error && boardData && <p className="text-muted-foreground">This board is empty. Add a new slide to begin.</p>
            )}
        </main>
        
        {/* Bottom Bar */}
        {boardData && (
          <footer className="fixed bottom-0 left-0 w-full h-20 grid grid-cols-[1fr_auto] bg-card/80 backdrop-blur-sm border-t border-border z-20">
            {/* Thumbs */}
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

            {/* Actions */}
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
          </footer>
        )}
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
    </>
  );
}
