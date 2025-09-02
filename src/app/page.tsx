
'use client';

import React, { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Folder, File, FolderPlus, FilePlus, MoreVertical, Trash2, ArrowLeft } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { BackgroundAnimation } from '@/components/BackgroundAnimation';
import { WorkspaceContext, FileSystemItem } from '@/context/WorkspaceContext';

const initialBoardContent = `{
  "slides": [
    {
      "slide_number": 1,
      "items": [
        {
          "id": "initial-text",
          "type": "text",
          "content": "Welcome to your presentation!",
          "position": [50, 50],
          "font_size": 36,
          "width": 400,
          "rotation": 0
        }
      ]
    }
  ]
}`;

export default function Home() {
  const router = useRouter();
  const [showWelcome, setShowWelcome] = useState(true);
  
  useEffect(() => {
    if (sessionStorage.getItem('welcomeScreenShown')) {
      setShowWelcome(false);
    }
  }, []);

  const handleGetStarted = () => {
    sessionStorage.setItem('welcomeScreenShown', 'true');
    setShowWelcome(false);
  }

  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("Home component must be used within a WorkspaceProvider");
  }
  const {
    rootDirectoryHandle,
    mount,
    path,
    directoryContents,
    handleBreadcrumbClick,
    handleItemClick: contextHandleItemClick,
    handleBackClick,
    createFile,
    createFolder,
    deleteItem,
    error,
  } = context;

  const [isCreateFileDialogOpen, setCreateFileDialogOpen] = useState(false);
  const [isCreateFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  
  const { toast } = useToast();

  const handleCreateFile = async () => {
    const finalFileName = newItemName.endsWith('.board') ? newItemName : `${newItemName}.board`;
    await createFile(finalFileName, initialBoardContent);
    setNewItemName('');
    setCreateFileDialogOpen(false);
    toast({
      title: "File Created",
      description: `"${finalFileName}" has been created.`,
    });
  };

  const handleCreateFolder = async () => {
    await createFolder(newItemName);
    setNewItemName('');
    setCreateFolderDialogOpen(false);
    toast({
      title: "Folder Created",
      description: `"${newItemName}" has been created.`,
    });
  };
  
  const handleDeleteItem = async (itemToDelete: FileSystemItem) => {
    await deleteItem(itemToDelete);
    toast({
      title: `${itemToDelete.kind === 'directory' ? 'Folder' : 'File'} Deleted`,
      description: `"${itemToDelete.name}" has been deleted.`,
    });
  };

  const handleItemClick = (item: FileSystemItem) => {
    const fullPath = contextHandleItemClick(item);
    if (item.kind === 'file' && fullPath) {
        router.push(`/board/${encodeURIComponent(fullPath)}`);
    }
  }

  if (showWelcome) {
    return (
      <>
        <BackgroundAnimation />
        <main className="flex min-h-screen flex-col items-center justify-center bg-transparent p-8">
          <div className="mx-auto max-w-4xl w-full text-center">
            <h1 className="font-headline text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
              Welcome to grraffia
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              A new way to interact with your file system.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button onClick={handleGetStarted} size="lg">
                Get Started
              </Button>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!rootDirectoryHandle) {
    return (
      <>
        <BackgroundAnimation />
        <main className="flex min-h-screen flex-col items-center justify-center bg-transparent p-8">
          <div className="mx-auto max-w-4xl w-full text-center">
            <h1 className="font-headline text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
              Your Workspace
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Get started by selecting your working folder.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button onClick={mount} size="lg">
                Mount Folder
              </Button>
            </div>
            {error && (
              <p className="mt-6 text-red-500">{error}</p>
            )}
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <BackgroundAnimation />
      <main className="flex min-h-screen flex-col items-center justify-start bg-transparent p-8 pt-24">
        <div className="mx-auto max-w-4xl w-full">
          <Card className="text-left bg-card/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                {path.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleBackClick}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back</span>
                  </Button>
                )}
                <div className="flex items-center gap-1.5 text-sm sm:text-base whitespace-nowrap overflow-x-auto">
                  {path.map((segment, index) => (
                    <React.Fragment key={index}>
                      <button onClick={() => handleBreadcrumbClick(index)} className="hover:underline disabled:hover:no-underline disabled:cursor-text" disabled={index === path.length -1}>
                        {segment.name}
                      </button>
                      {index < path.length - 1 && (
                        <span className="text-muted-foreground">&gt;</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Sheet open={isCreateFolderDialogOpen} onOpenChange={setCreateFolderDialogOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <FolderPlus className="h-5 w-5" />
                      <span className="sr-only">Create Folder</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Create New Folder</SheetTitle>
                      <SheetDescription>
                        Enter a name for your new folder.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="grid gap-4 py-4">
                      <Input
                        placeholder="Folder name"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                      />
                       <Button onClick={handleCreateFolder}>Create</Button>
                    </div>
                  </SheetContent>
                </Sheet>

                <Sheet open={isCreateFileDialogOpen} onOpenChange={setCreateFileDialogOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <FilePlus className="h-5 w-5" />
                      <span className="sr-only">Create File</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Create New Board File</SheetTitle>
                       <SheetDescription>
                        Enter a name for your new board file. The .board extension will be added automatically.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="grid gap-4 py-4">
                      <Input
                          placeholder="File name"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleCreateFile()}
                        />
                      <Button onClick={handleCreateFile}>Create</Button>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </CardHeader>
            <CardContent>
              {directoryContents.length > 0 ? (
                <ul className="space-y-1">
                  {directoryContents.map((item) => (
                    <li key={item.name} className="flex items-center gap-2 group">
                      <button onClick={() => handleItemClick(item)} className="flex items-center gap-2 flex-grow text-left p-1 rounded-md hover:bg-accent">
                        {item.kind === 'directory' ? <Folder className="h-5 w-5 shrink-0 text-primary" /> : <File className="h-5 w-5 shrink-0 text-secondary-foreground" />}
                        <span className="flex-grow truncate">{item.name}</span>
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">More options</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDeleteItem(item)} className="text-red-500 focus:text-red-500">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>This folder is empty.</p>
              )}
            </CardContent>
          </Card>
          <div className="mt-6 flex items-center justify-center gap-x-6">
            <Button onClick={mount}>
              Mount Another Folder
            </Button>
          </div>
          {error && (
            <p className="mt-6 text-red-500">{error}</p>
          )}
        </div>
      </main>
    </>
  );
}
