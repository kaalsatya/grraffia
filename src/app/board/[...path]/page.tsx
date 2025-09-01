
'use client';

import React, { useEffect, useState, useContext, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Trash2, Save, CaseSensitive, Send, ZoomIn, ZoomOut, RotateCw, ChevronsLeft, ChevronsRight, ArrowUpLeft, ArrowUpRight, ArrowLeft as ArrowLeftIcon, ArrowRight, ArrowDownLeft, ArrowDownRight, ImageIcon, Loader2 } from 'lucide-react';
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
import { processImage } from '@/ai/flows/process-image-flow';


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
  const [isScanning, setIsScanning] = useState(false);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


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
                    const { src, ...rest } = item;
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
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const crop = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, 16 / 9, width, height),
      width,
      height
    );
    setCrop(crop);
    setCompletedCrop(crop);
  };

  async function getCroppedImg(
    image: HTMLImageElement,
    crop: Crop,
    fileName: string
  ): Promise<{ dataUrl: string, blob: Blob }> {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = Math.floor(crop.width * scaleX);
    canvas.height = Math.floor(crop.height * scaleY);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error("Could not get canvas context");
    }

    const pixelRatio = window.devicePixelRatio;
    canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
    canvas.height = Math.floor(crop.height * scaleY * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width * scaleX,
      crop.height * scaleY
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        const dataUrl = canvas.toDataURL('image/png');
        resolve({ dataUrl, blob });
      }, 'image/png', 1);
    });
  }

  const handleScanDocument = async () => {
    if (!completedCrop || !imgRef.current) return;
    
    setIsScanning(true);
    try {
        const { dataUrl: croppedDataUrl, blob: croppedBlob } = await getCroppedImg(imgRef.current, completedCrop, 'cropped-image.png');
        
        const { photoDataUri: processedDataUri } = await processImage({ photoDataUri: croppedDataUrl });

        const newFilename = `scanned-${Date.now()}.png`;
        const fileDirectory = getFileDirectory();
        const fullPath = fileDirectory ? `${fileDirectory}/${newFilename}` : newFilename;

        const base64Data = processedDataUri.split(',')[1];
        const binaryData = atob(base64Data);
        const arrayBuffer = new ArrayBuffer(binaryData.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        for (let i = 0; i < binaryData.length; i++) {
            uint8Array[i] = binaryData.charCodeAt(i);
        }
        const finalBlob = new Blob([uint8Array], { type: 'image/png' });
        
        await writeFile(fullPath, finalBlob as any);

        const newImageItem: ImageItem = {
            id: `img-${Date.now()}`,
            type: 'image',
            filename: newFilename,
            position: [50, 50],
            rotation: 0,
            scale: 0.5,
            width: imgRef.current.naturalWidth,
            height: imgRef.current.naturalHeight,
            src: URL.createObjectURL(finalBlob)
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
        toast({ title: "Scanning failed", description: "Could not process the image.", variant: "destructive" });
    } finally {
        setIsScanning(false);
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
                  <Button variant="outline" size="icon" onClick={() => handleMoveItem('up')} disabled={!selectedItemId}><svg width="20" height="20" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.5 2C7.77614 2 8 2.22386 8 2.5L8 12.5C8 12.7761 7.77614 13 7.5 13C7.22386 13 7 12.7761 7 12.5L7 2.5C7 2.22386 7.22386 2 7.5 2Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path><path d="M4.14645 5.14645C4.34171 4.95118 4.65829 4.95118 4.85355 5.14645L7.5 7.79289L10.1464 5.14645C10.3417 4.95118 10.6583 4.95118 10.8536 5.14645C11.0488 5.34171 11.0488 5.65829 10.8536 5.85355L7.85355 8.85355C7.65829 9.04882 7.34171 9.04882 7.14645 8.85355L4.14645 5.85355C3.95118 5.65829 3.95118 5.34171 4.14645 5.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd" transform="rotate(-180, 7.5, 7)"></path></svg></Button>
                  <Button variant="outline" size="icon" onClick={() => handleMoveItem('up-right')} disabled={!selectedItemId}><ArrowUpRight className="h-5 w-5"/></Button>
                  <Button variant="outline" size="icon" onClick={() => handleMoveItem('left')} disabled={!selectedItemId}><svg width="20" height="20" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 7.5C2 7.22386 2.22386 7 2.5 7H12.5C12.7761 7 13 7.22386 13 7.5C13 7.77614 12.7761 8 12.5 8H2.5C2.22386 8 2 7.77614 2 7.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path><path d="M5.14645 4.14645C4.95118 4.34171 4.95118 4.65829 5.14645 4.85355L7.79289 7.5L5.14645 10.1464C4.95118 10.3417 4.95118 10.6583 5.14645 10.8536C5.34171 11.0488 5.65829 11.0488 5.85355 10.8536L8.85355 7.85355C9.04882 7.65829 9.04882 7.34171 8.85355 7.14645L5.85355 4.14645C5.65829 3.95118 5.34171 3.95118 5.14645 4.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg></Button>
                  <Button variant="outline" size="icon" onClick={handleRotateItem} disabled={!selectedItemId}><RotateCw className="h-5 w-5"/></Button>
                  <Button variant="outline" size="icon" onClick={() => handleMoveItem('right')} disabled={!selectedItemId}><svg width="20" height="20" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 7.5C13 7.77614 12.7761 8 12.5 8L2.5 8C2.22386 8 2 7.77614 2 7.5C2 7.22386 2.22386 7 2.5 7L12.5 7C12.7761 7 13 7.22386 13 7.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path><path d="M9.85355 10.8536C10.0488 10.6583 10.0488 10.3417 9.85355 10.1464L7.20711 7.5L9.85355 4.85355C10.0488 4.65829 10.0488 4.34171 9.85355 4.14645C9.65829 3.95118 9.34171 3.95118 9.14645 4.14645L6.14645 7.14645C5.95118 7.34171 5.95118 7.65829 6.14645 7.85355L9.14645 10.8536C9.34171 11.0488 9.65829 11.0488 9.85355 10.8536Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg></Button>
                  <Button variant="outline" size="icon" onClick={() => handleMoveItem('down-left')} disabled={!selectedItemId}><ArrowDownLeft className="h-5 w-5"/></Button>
                  <Button variant="outline" size="icon" onClick={() => handleMoveItem('down')} disabled={!selectedItemId}><svg width="20" height="20" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.5 13C7.22386 13 7 12.7761 7 12.5L7 2.5C7 2.22386 7.22386 2 7.5 2C7.77614 2 8 2.22386 8 2.5L8 12.5C8 12.7761 7.77614 13 7.5 13Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path><path d="M10.8536 9.85355C10.6583 10.0488 10.3417 10.0488 10.1464 9.85355L7.5 7.20711L4.85355 9.85355C4.65829 10.0488 4.34171 10.0488 4.14645 9.85355C3.95118 9.65829 3.95118 9.34171 4.14645 9.14645L7.14645 6.14645C7.34171 5.95118 7.65829 5.95118 7.85355 6.14645L10.8536 9.14645C11.0488 9.34171 11.0488 9.65829 10.8536 9.85355Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg></Button>
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

      <Dialog open={isCropping} onOpenChange={setIsCropping}>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Scan Document</DialogTitle>
                <DialogDescription>Crop the image and click Scan to process it.</DialogDescription>
            </DialogHeader>
            {sourceImage && (
              <div className="flex justify-center items-center">
                <ReactCrop
                    crop={crop}
                    onChange={c => setCrop(c)}
                    onComplete={c => setCompletedCrop(c)}
                    aspect={16/9}
                >
                    <img ref={imgRef} src={sourceImage} onLoad={onImageLoad} alt="Crop preview" />
                </ReactCrop>
              </div>
            )}
            <DialogFooter>
                <Button variant="outline" onClick={() => {
                    setIsCropping(false);
                    setSourceImage(null);
                }}>Cancel</Button>
                <Button onClick={handleScanDocument} disabled={isScanning}>
                    {isScanning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isScanning ? "Scanning..." : "Scan Document"}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
