'use client';

import React, { useState } from 'react';
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

interface FileSystemItem {
  name: string;
  kind: 'file' | 'directory';
}

interface PathSegment {
  name: string;
  handle: FileSystemDirectoryHandle;
}

export default function Home() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [rootDirectoryHandle, setRootDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [currentDirectoryHandle, setCurrentDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [directoryContents, setDirectoryContents] = useState<FileSystemItem[]>([]);
  const [path, setPath] = useState<PathSegment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [isCreateFileDialogOpen, setCreateFileDialogOpen] = useState(false);
  const [isCreateFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  
  const { toast } = useToast();

  const getDirectoryContents = async (handle: FileSystemDirectoryHandle | null) => {
    if (handle) {
      try {
        const contents: FileSystemItem[] = [];
        for await (const entry of handle.values()) {
          if (entry.kind === 'directory' || (entry.kind === 'file' && entry.name.endsWith('.board'))) {
            contents.push({ name: entry.name, kind: entry.kind });
          }
        }
        setDirectoryContents(contents.sort((a, b) => {
          if (a.kind === 'directory' && b.kind === 'file') return -1;
          if (a.kind === 'file' && b.kind === 'directory') return 1;
          return a.name.localeCompare(b.name);
        }));
      } catch (err) {
        setError('Could not read directory contents.');
        console.error(err);
      }
    }
  };

  const handleMountClick = async () => {
    setError(null);
    setDirectoryContents([]);
    try {
      if ('showDirectoryPicker' in window) {
        const handle = await window.showDirectoryPicker();
        setRootDirectoryHandle(handle);
        setCurrentDirectoryHandle(handle);
        setPath([{ name: handle.name, handle }]);
        await getDirectoryContents(handle);
      } else {
        setError('Your browser does not support the File System Access API.');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User cancelled the folder selection
      } else {
        setError('An error occurred while trying to access the folder.');
        console.error(err);
      }
    }
  };

  const handleCreateFile = async () => {
    if (currentDirectoryHandle && newItemName) {
      const finalFileName = newItemName.endsWith('.board') ? newItemName : `${newItemName}.board`;
      try {
        await currentDirectoryHandle.getFileHandle(finalFileName, { create: true });
        setNewItemName('');
        setCreateFileDialogOpen(false);
        await getDirectoryContents(currentDirectoryHandle);
        toast({
          title: "File Created",
          description: `"${finalFileName}" has been created.`,
        });
      } catch (err) {
        setError(`Could not create file: ${finalFileName}`);
        console.error(err);
      }
    }
  };

  const handleCreateFolder = async () => {
    if (currentDirectoryHandle && newItemName) {
      try {
        await currentDirectoryHandle.getDirectoryHandle(newItemName, { create: true });
        setNewItemName('');
        setCreateFolderDialogOpen(false);
        await getDirectoryContents(currentDirectoryHandle);
        toast({
            title: "Folder Created",
            description: `"${newItemName}" has been created.`,
        });
      } catch (err) {
        setError(`Could not create folder: ${newItemName}`);
        console.error(err);
      }
    }
  };
  
  const handleDeleteItem = async (itemToDelete: FileSystemItem) => {
    if (currentDirectoryHandle && itemToDelete) {
      try {
        await currentDirectoryHandle.removeEntry(itemToDelete.name, { recursive: itemToDelete.kind === 'directory' });
        await getDirectoryContents(currentDirectoryHandle);
        toast({
          title: `${itemToDelete.kind === 'directory' ? 'Folder' : 'File'} Deleted`,
          description: `"${itemToDelete.name}" has been deleted.`,
        });
      } catch (err) {
        setError(`Could not delete: ${itemToDelete.name}`);
        console.error(err);
      }
    }
  };

  const handleItemClick = async (item: FileSystemItem) => {
    if (item.kind === 'directory' && currentDirectoryHandle) {
      try {
        const newHandle = await currentDirectoryHandle.getDirectoryHandle(item.name);
        setCurrentDirectoryHandle(newHandle);
        setPath(prevPath => [...prevPath, { name: newHandle.name, handle: newHandle }]);
        await getDirectoryContents(newHandle);
      } catch (err) {
        setError(`Could not open folder: ${item.name}`);
        console.error(err);
      }
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    const newPath = path.slice(0, index + 1);
    const newHandle = newPath[newPath.length - 1].handle;
    setPath(newPath);
    setCurrentDirectoryHandle(newHandle);
    getDirectoryContents(newHandle);
  };
  
  const handleBackClick = () => {
    if (path.length > 1) {
      handleBreadcrumbClick(path.length - 2);
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
              <Button onClick={() => setShowWelcome(false)} size="lg">
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
              <Button onClick={handleMountClick} size="lg">
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
                      <button onClick={() => handleItemClick(item)} className="flex items-center gap-2 flex-grow text-left p-1 rounded-md hover:bg-accent disabled:hover:bg-transparent" disabled={item.kind === 'file'}>
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
            <Button onClick={handleMountClick}>
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
