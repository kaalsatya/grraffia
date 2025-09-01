
'use client';

import React, { useEffect, useState, useContext, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Trash2, Save, CaseSensitive, Send, ZoomIn, ZoomOut, RotateCw, ChevronsLeft, ChevronsRight, ArrowUpLeft, ArrowUpRight, ArrowDownLeft, ArrowDownRight, ImageIcon, Loader2, ArrowUp, ArrowDown, ArrowRight } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { WorkspaceContext } from '@/context/WorkspaceContext';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';


interface BaseItem {
  id: string;
  position: [number, number];
  rotation: number;
}
interface TextItem extends BaseItem {
  type: 'text';
  content: string;
  font_size: number;
  width: number;
}

interface ImageItem extends BaseItem {
  type: 'image';
  filename: string;
  width: number;
  height: number;
  scale: number;
  src?: string; 
}

type BoardItem = TextItem | ImageItem;

interface Slide {
  slide_number: number;
  items: BoardItem[];
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
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSaveErrorAlert, setShowSaveErrorAlert] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [isInserting, setIsInserting] = useState(false);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);


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
  
  const getFileDirectory = useCallback(() => {
    const filePath = getFilePath();
    if (!filePath) return null;
    const parts = filePath.split('/');
    parts.pop();
    return parts.join('/');
  }, [getFilePath])

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
      // Remove temporary src from images before saving
      const dataToSave = {
        ...data,
        slides: data.slides.map(slide => ({
            ...slide,
            items: slide.items.map(item => {
                if(item.type === 'image') {
                    const { src, ...rest } = item as ImageItem;
                    return rest;
                }
                return item;
            })
        }))
      };

      const content = JSON.stringify(dataToSave, null, 2);
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
        
        const dataWithDefaults: BoardData = {
          ...data,
          slides: await Promise.all(data.slides.map(async (slide) => ({
            ...slide,
            items: await Promise.all((slide.items || (slide as any).texts?.map((t: any) => ({...t, type: 'text'})) || []).map(async (item: any) => {
              const baseItem = {
                id: item.id || `item-${Date.now()}-${Math.random()}`,
                position: item.position || [50, 50],
                rotation: item.rotation || 0,
              };

              if (item.type === 'image') {
                const dir = getFileDirectory();
                const imagePath = dir ? `${dir}/${item.filename}` : item.filename;
                let imageSrc = '';
                try {
                  const imageContent = await readFile(imagePath);
                  const file = new File([imageContent], item.filename, { type: 'image/png'});
                  imageSrc = URL.createObjectURL(file);
                } catch(e) {
                  console.error("Could not load image", imagePath, e);
                  imageSrc = 'https://placehold.co/300x200/EEE/31343C?text=Not+Found'
                }

                return {
                  ...baseItem,
                  type: 'image',
                  filename: item.filename,
                  width: item.width || 200,
                  height: item.height || 200,
                  scale: item.scale || 1,
                  src: imageSrc,
                };
              }

              // Default to text if type is not set for backwards compatibility
              return {
                ...baseItem,
                type: 'text',
                content: item.content,
                font_size: item.font_size || 24,
                width: item.width || 200,
              };
            }))
          })))
        };
        setBoardData(dataWithDefaults);

      } catch (err) {
        setError('Failed to load board data.');
        console.error(err);
      }
    };

    loadBoard();
  }, [getFilePath, getFileDirectory, readFile, rootDirectoryHandle]);


  const updateItem = (id: string, updates: Partial<BoardItem>) => {
    if (!boardData) return;
    const updatedSlides = boardData.slides.map((slide, index) => {
        if (index === currentSlideIndex) {
            return {
                ...slide,
                items: slide.items.map(item => 
                    item.id === id ? { ...item, ...updates } : item
                )
            };
        }
        return slide;
    });
    setBoardData({ ...boardData, slides: updatedSlides });
  };


  const handleAddSlide = () => {
    if (!boardData) return;
    const newSlide: Slide = {
        slide_number: 0, // temp value, will be renumbered
        items: [],
    };
    
    const newSlides = [
        ...boardData.slides.slice(0, currentSlideIndex + 1),
        newSlide,
        ...boardData.slides.slice(currentSlideIndex + 1),
    ].map((slide, index) => ({
        ...slide,
        slide_number: index + 1,
    }));

    const updatedData = { ...boardData, slides: newSlides };
    setBoardData(updatedData);
    setCurrentSlideIndex(currentSlideIndex + 1);
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
    setSelectedItemId(null);
  };

  const handleAddText = () => {
    if (!boardData) return;

    const newText: TextItem = {
      id: `text-${Date.now()}-${Math.random()}`,
      type: 'text',
      content: 'New Text',
      position: [50, 50],
      font_size: 24,
      width: 200,
      rotation: 0,
    };

    const updatedSlides = boardData.slides.map((slide, index) => {
      if (index === currentSlideIndex) {
        return {
          ...slide,
          items: [...slide.items, newText],
        };
      }
      return slide;
    });
    
    setBoardData({ ...boardData, slides: updatedSlides });
  };
  
  const handleTextDoubleClick = (textId: string) => {
    setEditingTextId(textId);
    setSelectedItemId(textId); // Also select it
  };

  const handleTextChange = (textId: string, newContent: string) => {
    updateItem(textId, { content: newContent } as Partial<TextItem>);
  };
  
  const handleTextBlur = () => {
    setEditingTextId(null);
  };

  const handleMoveItem = (direction: 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right') => {
    if (!selectedItemId) return;
    const step = 2; // Percentage step
    const currentItem = boardData?.slides[currentSlideIndex].items.find(t => t.id === selectedItemId);
    if (!currentItem) return;

    let newX = currentItem.position[0];
    let newY = currentItem.position[1];

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

    updateItem(selectedItemId, { position: [newX, newY] });
  };
  
  const handleRotateItem = () => {
    if (!selectedItemId) return;
    const currentItem = boardData?.slides[currentSlideIndex].items.find(t => t.id === selectedItemId);
    if (!currentItem) return;

    const rotationStep = 5; // degrees
    const newRotation = currentItem.rotation + rotationStep
    
    updateItem(selectedItemId, { rotation: newRotation });
  };

  const handleScaleItem = (scaleDirection: 'up' | 'down') => {
      if (!selectedItemId) return;
      const currentItem = boardData?.slides[currentSlideIndex].items.find(t => t.id === selectedItemId);
      if (!currentItem) return;

      if (currentItem.type === 'text') {
        const scaleStep = 2; // pixels
        const newFontSize = scaleDirection === 'up'
            ? currentItem.font_size + scaleStep
            : Math.max(8, currentItem.font_size - scaleStep); // minimum font size of 8
        updateItem(selectedItemId, { font_size: newFontSize } as Partial<TextItem>);
      } else if (currentItem.type === 'image') {
          const scaleStep = 0.1;
          const newScale = scaleDirection === 'up' 
            ? currentItem.scale + scaleStep
            : Math.max(0.1, currentItem.scale - scaleStep);
          updateItem(selectedItemId, { scale: newScale } as Partial<ImageItem>);
      }
  };

  const handleWidthChange = (changeDirection: 'increase' | 'decrease') => {
      if (!selectedItemId) return;
      const currentItem = boardData?.slides[currentSlideIndex].items.find(t => t.id === selectedItemId);
      if (!currentItem) return;

      const widthStep = 10; // pixels
      const newWidth = changeDirection === 'increase'
          ? currentItem.width + widthStep
          : Math.max(50, currentItem.width - widthStep); // minimum width of 50
      
      updateItem(selectedItemId, { width: newWidth });
  };

  const handleDeleteItem = () => {
      if (!selectedItemId || !boardData) return;

      const updatedSlides = boardData.slides.map((slide, index) => {
          if (index === currentSlideIndex) {
              return {
                  ...slide,
                  items: slide.items.filter(item => item.id !== selectedItemId)
              };
          }
          return slide;
      });

      setBoardData({ ...boardData, slides: updatedSlides });
      setSelectedItemId(null);
  };
  
  // Image Crop logic
  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined); // Makes crop preview update between images.
      const reader = new FileReader();
      reader.addEventListener('load', () => setSourceImage(reader.result?.toString() || null));
      reader.readAsDataURL(e.target.files[0]);
      setIsCropping(true);
      setBrightness(100);
      setContrast(100);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const crop = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, 1, width, height),
      width,
      height
    );
     // Set a default free crop
    setCrop({
        unit: '%',
        width: 50,
        height: 50,
        x: 25,
        y: 25,
    });
    setCompletedCrop(crop);
  };

  async function getProcessedImage(
    image: HTMLImageElement,
    crop: Crop,
    brightness: number,
    contrast: number
  ): Promise<{ dataUrl: string, blob: Blob }> {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const cropWidth = Math.floor(crop.width * scaleX);
    const cropHeight = Math.floor(crop.height * scaleY);
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error("Could not get canvas context");
    }

    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    
    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );
    
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Canvas is empty'));
                return;
            }
            const dataUrl = canvas.toDataURL('image/png');
            resolve({ dataUrl, blob });
        }, 'image/png');
    });
  }

  const handleInsertImage = async () => {
    if (!completedCrop || !imgRef.current) return;
    
    setIsInserting(true);
    try {
        const { blob, dataUrl } = await getProcessedImage(imgRef.current, completedCrop, brightness, contrast);
        
        const newFilename = `edited-${Date.now()}.png`;
        const fileDirectory = getFileDirectory();
        const fullPath = fileDirectory ? `${fileDirectory}/${newFilename}` : newFilename;
        
        await writeFile(fullPath, blob as any);

        const defaultWidth = 300;
        const img = new Image();
        img.src = dataUrl;
        await new Promise(resolve => img.onload = resolve);
        const aspectRatio = img.width / img.height;
        
        const newImageItem: ImageItem = {
            id: `img-${Date.now()}`,
            type: 'image',
            filename: newFilename,
            position: [50, 50],
            rotation: 0,
            scale: 1,
            width: defaultWidth,
            height: defaultWidth / aspectRatio,
            src: URL.createObjectURL(blob)
        };

        if (boardData) {
            const updatedSlides = boardData.slides.map((slide, index) => {
                if (index === currentSlideIndex) {
                    return { ...slide, items: [...slide.items, newImageItem] };
                }
                return slide;
            });
            setBoardData({ ...boardData, slides: updatedSlides });
        }
        
    } catch (e) {
        console.error(e);
        toast({ title: "Image processing failed", description: "Could not process the image.", variant: "destructive" });
    } finally {
        setIsInserting(false);
        setIsCropping(false);
        setSourceImage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }
  }


  const currentSlide = boardData?.slides[currentSlideIndex];
  const selectedItem = currentSlide?.items.find(i => i.id === selectedItemId);

  return (
    <div className="flex flex-col h-screen w-screen bg-black overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 h-12 flex items-center justify-between px-3 box-border bg-card border-b border-border">
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
        <div className="flex-shrink-0 h-24 grid grid-cols-[1fr_auto] bg-card border-b border-border">
            <div className="flex items-center p-2 gap-2 overflow-x-auto overflow-y-hidden">
                {boardData.slides.map((slide, index) => (
                    <div key={index} className="flex-shrink-0 text-center">
                        <Card
                            onClick={() => handleThumbnailClick(index)}
                            className={cn(
                                "cursor-pointer transition-all border-2 w-24 h-16 box-border relative",
                                index === currentSlideIndex ? "border-primary" : "border-transparent hover:border-muted-foreground/50"
                            )}
                        >
                            <CardContent className="flex flex-col items-center justify-center h-full p-1 bg-white/90">
                                <span className="text-xs text-black/70 truncate scale-[0.8] leading-none">
                                    {slide.items.length > 0 && slide.items[0].type === 'text' ? slide.items[0].content : `Slide ${index + 1}`}
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
      <div className="flex-shrink-0 h-12 flex items-center px-3 box-border bg-card border-b border-border">
          <Button variant="ghost" size="icon" onClick={handleAddText}>
            <CaseSensitive className="h-5 w-5" />
            <span className="sr-only">Add Text</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()}>
            <ImageIcon className="h-5 w-5" />
            <span className="sr-only">Add Image</span>
          </Button>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={onSelectFile}
            className="hidden"
          />
      </div>

      {/* Main Content */}
      <main className="flex-grow w-full flex justify-center items-start relative overflow-y-auto pb-28">
        {error && <p className="text-destructive absolute top-4 left-4">{error}</p>}
        {!boardData && !error && <p className="text-muted-foreground">Loading board...</p>}

        {boardData && currentSlide ? (
          <div className="w-full h-full flex flex-col">
            <div className="w-full aspect-video bg-white">
                <div id="canvas-container" className="w-full h-full relative overflow-hidden">
                    {currentSlide.items.map((item) => (
                      item.type === 'text' ? (
                      <div
                        key={item.id}
                        onDoubleClick={() => handleTextDoubleClick(item.id)}
                        onClick={() => {
                          setSelectedItemId(item.id);
                          if (editingTextId && editingTextId !== item.id) {
                            setEditingTextId(null);
                          }
                        }}
                        style={{
                          position: 'absolute',
                          left: `${item.position[0]}%`,
                          top: `${item.position[1]}%`,
                          transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
                          fontSize: `${item.font_size}px`,
                          width: `${item.width}px`,
                          color: 'black',
                          padding: '4px',
                          wordWrap: 'break-word',
                          cursor: 'pointer',
                          border: selectedItemId === item.id ? '2px dashed hsl(var(--primary))' : '2px dashed transparent',
                        }}
                      >
                          {editingTextId === item.id ? (
                            <Textarea
                                value={item.content}
                                onChange={(e) => handleTextChange(item.id, e.target.value)}
                                onBlur={handleTextBlur}
                                autoFocus
                                className="w-full h-full p-0 m-0 border-0 resize-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                                style={{
                                    fontSize: 'inherit',
                                    fontFamily: 'inherit',
                                    color: 'inherit',
                                    lineHeight: 'inherit',
                                    textAlign: 'inherit',
                                    outline: 'none',
                                }}
                                onKeyDown={(e) => e.stopPropagation()} // Prevent controls from firing
                            />
                        ) : (
                          item.content
                        )}
                      </div>
                      ) : (
                        <div
                            key={item.id}
                            onClick={() => setSelectedItemId(item.id)}
                            style={{
                                position: 'absolute',
                                left: `${item.position[0]}%`,
                                top: `${item.position[1]}%`,
                                transform: `translate(-50%, -50%) rotate(${item.rotation}deg) scale(${item.scale})`,
                                width: `${item.width}px`,
                                height: `${item.height}px`,
                                cursor: 'pointer',
                                border: selectedItemId === item.id ? '2px dashed hsl(var(--primary))' : '2px dashed transparent',
                            }}
                        >
                            <img src={item.src} alt={item.filename} className="w-full h-full object-contain" />
                        </div>
                      )
                    ))}
                </div>
            </div>
          </div>
        ) : (
            !error && boardData && <p className="text-muted-foreground">This board is empty. Add a new slide to begin.</p>
        )}
      </main>

      {/* Controls Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-10 bg-card/80 backdrop-blur-sm flex items-center justify-center p-2 border-t">
          <div className="flex gap-5 p-2.5 rounded-lg border-2 border-primary bg-card">
              <div className="grid grid-cols-3 grid-rows-3 gap-2.5">
                  <Button variant="outline" size="icon" onClick={() => handleMoveItem('up-left')} disabled={!selectedItemId}><ArrowUpLeft className="h-5 w-5"/></Button>
                  <Button variant="outline" size="icon" onClick={() => handleMoveItem('up')} disabled={!selectedItemId}><ArrowUp className="h-5 w-5"/></Button>
                  <Button variant="outline" size="icon" onClick={() => handleMoveItem('up-right')} disabled={!selectedItemId}><ArrowUpRight className="h-5 w-5"/></Button>
                  <Button variant="outline" size="icon" onClick={() => handleMoveItem('left')} disabled={!selectedItemId}><ArrowLeft className="h-5 w-5"/></Button>
                  <Button variant="outline" size="icon" onClick={handleRotateItem} disabled={!selectedItemId}><RotateCw className="h-5 w-5"/></Button>
                  <Button variant="outline" size="icon" onClick={() => handleMoveItem('right')} disabled={!selectedItemId}><ArrowRight className="h-5 w-5"/></Button>
                  <Button variant="outline" size="icon" onClick={() => handleMoveItem('down-left')} disabled={!selectedItemId}><ArrowDownLeft className="h-5 w-5"/></Button>
                  <Button variant="outline" size="icon" onClick={() => handleMoveItem('down')} disabled={!selectedItemId}><ArrowDown className="h-5 w-5"/></Button>
                  <Button variant="outline" size="icon" onClick={() => handleMoveItem('down-right')} disabled={!selectedItemId}><ArrowDownRight className="h-5 w-5"/></Button>
              </div>
              <div className="grid grid-cols-2 grid-rows-3 gap-2.5 items-center justify-items-center">
                  <Button variant="outline" size="icon" onClick={() => handleScaleItem('down')} disabled={!selectedItemId}><ZoomOut className="h-5 w-5"/></Button>
                  <Button variant="outline" size="icon" onClick={() => handleScaleItem('up')} disabled={!selectedItemId}><ZoomIn className="h-5 w-5"/></Button>
                  <Button variant="outline" size="icon" onClick={() => handleWidthChange('decrease')} disabled={!selectedItemId || selectedItem?.type !== 'text'}><ChevronsLeft className="h-5 w-5"/></Button>
                  <Button variant="outline" size="icon" onClick={() => handleWidthChange('increase')} disabled={!selectedItemId || selectedItem?.type !== 'text'}><ChevronsRight className="h-5 w-5"/></Button>
                  <AlertDialog>
                      <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="col-span-2 w-full" disabled={!selectedItemId}>
                              <Trash2 className="h-5 w-5 mr-2"/> Delete
                          </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>Delete Item?</AlertDialogTitle>
                              <AlertDialogDescription>
                                  Are you sure you want to delete this item? This action cannot be undone.
                              </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDeleteItem}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                  </AlertDialog>
              </div>
          </div>
      </footer>

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

      <Dialog open={isCropping} onOpenChange={(open) => { if (!open) { setIsCropping(false); setSourceImage(null); } else { setIsCropping(open); } }}>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Edit Image</DialogTitle>
                <DialogDescription>Crop and adjust the image before inserting it.</DialogDescription>
            </DialogHeader>
            {sourceImage && (
              <div className="grid grid-cols-[1fr_auto] gap-8 py-4">
                <div className="flex justify-center items-center">
                  <ReactCrop
                      crop={crop}
                      onChange={c => setCrop(c)}
                      onComplete={c => setCompletedCrop(c)}
                  >
                      <img 
                        ref={imgRef} 
                        src={sourceImage} 
                        onLoad={onImageLoad} 
                        alt="Crop preview" 
                        style={{filter: `brightness(${brightness}%) contrast(${contrast}%)`}}
                      />
                  </ReactCrop>
                </div>
                <div className="grid gap-6">
                    <div className="grid gap-2 text-center">
                        <Label htmlFor="brightness-slider">Brightness</Label>
                         <Slider 
                            id="brightness-slider"
                            orientation="vertical"
                            value={[brightness]} 
                            onValueChange={(val) => setBrightness(val[0])}
                            max={200}
                            step={1}
                            className="h-48 mx-auto"
                        />
                        <span className="text-sm font-medium">{brightness}%</span>
                    </div>
                    <div className="grid gap-2 text-center">
                        <Label htmlFor="contrast-slider">Contrast</Label>
                         <Slider 
                            id="contrast-slider"
                            orientation="vertical"
                            value={[contrast]} 
                            onValueChange={(val) => setContrast(val[0])}
                            max={200}
                            step={1}
                            className="h-48 mx-auto"
                        />
                        <span className="text-sm font-medium">{contrast}%</span>
                    </div>
                </div>
              </div>
            )}
            <DialogFooter>
                <Button variant="outline" onClick={() => {
                    setIsCropping(false);
                    setSourceImage(null);
                }}>Cancel</Button>
                <Button onClick={handleInsertImage} disabled={isInserting}>
                    {isInserting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isInserting ? "Inserting..." : "Insert Image"}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
