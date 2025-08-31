'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Folder, File, FolderPlus, FilePlus, MoreVertical, Trash2, ArrowLeft } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

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
  
  const [itemToDelete, setItemToDelete] = useState<FileSystemItem | null>(null);

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
      } catch (err) {
        setError(`Could not create folder: ${newItemName}`);
        console.error(err);
      }
    }
  };
  
  const handleDeleteItem = async () => {
    if (currentDirectoryHandle && itemToDelete) {
      try {
        await currentDirectoryHandle.removeEntry(itemToDelete.name, { recursive: itemToDelete.kind === 'directory' });
        setItemToDelete(null);
        await getDirectoryContents(currentDirectoryHandle);
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
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
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
    );
  }

  if (!rootDirectoryHandle) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
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
    );
  }

  return (
    <>
      <main className="flex min-h-screen flex-col items-center justify-start bg-background p-8 pt-24">
        <div className="mx-auto max-w-4xl w-full">
          <Card className="text-left">
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
                <Button variant="ghost" size="icon" onClick={() => setCreateFolderDialogOpen(true)}>
                  <FolderPlus className="h-5 w-5" />
                  <span className="sr-only">Create Folder</span>
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setCreateFileDialogOpen(true)}>
                  <FilePlus className="h-5 w-5" />
                   <span className="sr-only">Create File</span>
                </Button>
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
                          <DropdownMenuItem onClick={() => setItemToDelete(item)} className="text-red-500 focus:text-red-500">
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
      
      {/* Create New File Dialog */}
      <Dialog open={isCreateFileDialogOpen} onOpenChange={setCreateFileDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Board File</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              placeholder="File name"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFile()}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateFileDialogOpen(false)}>Cancel</Button>
            <Button type="submit" onClick={handleCreateFile}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Create New Folder Dialog */}
      <Dialog open={isCreateFolderDialogOpen} onOpenChange={setCreateFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              placeholder="Folder name"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateFolderDialogOpen(false)}>Cancel</Button>
            <Button type="submit" onClick={handleCreateFolder}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the {itemToDelete?.kind} "{itemToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
