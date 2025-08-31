'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Folder, File, FolderPlus, FilePlus, MoreVertical, Trash2 } from 'lucide-react';
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

export default function Home() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [directoryContents, setDirectoryContents] = useState<FileSystemItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [isCreateFileDialogOpen, setCreateFileDialogOpen] = useState(false);
  const [isCreateFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  
  const [itemToDelete, setItemToDelete] = useState<FileSystemItem | null>(null);


  const getDirectoryContents = async (handle: FileSystemDirectoryHandle | null = directoryHandle) => {
    if (handle) {
      try {
        const contents: FileSystemItem[] = [];
        for await (const entry of handle.values()) {
          contents.push({ name: entry.name, kind: entry.kind });
        }
        setDirectoryContents(contents);
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
        setDirectoryHandle(handle);
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
    if (directoryHandle && newItemName) {
      try {
        await directoryHandle.getFileHandle(newItemName, { create: true });
        setNewItemName('');
        setCreateFileDialogOpen(false);
        await getDirectoryContents();
      } catch (err) {
        setError(`Could not create file: ${newItemName}`);
        console.error(err);
      }
    }
  };

  const handleCreateFolder = async () => {
    if (directoryHandle && newItemName) {
      try {
        await directoryHandle.getDirectoryHandle(newItemName, { create: true });
        setNewItemName('');
        setCreateFolderDialogOpen(false);
        await getDirectoryContents();
      } catch (err) {
        setError(`Could not create folder: ${newItemName}`);
        console.error(err);
      }
    }
  };
  
  const handleDeleteItem = async () => {
    if (directoryHandle && itemToDelete) {
      try {
        await directoryHandle.removeEntry(itemToDelete.name, { recursive: itemToDelete.kind === 'directory' });
        setItemToDelete(null);
        await getDirectoryContents();
      } catch (err) {
        setError(`Could not delete: ${itemToDelete.name}`);
        console.error(err);
      }
    }
  };

  useEffect(() => {
    getDirectoryContents();
  }, [directoryHandle]);
  
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

  if (!directoryHandle) {
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
              <CardTitle>Mounted to folder "{directoryHandle.name}"</CardTitle>
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
                <ul className="space-y-2">
                  {directoryContents.map((item) => (
                    <li key={item.name} className="flex items-center gap-2">
                      {item.kind === 'directory' ? <Folder className="h-5 w-5 shrink-0 text-primary" /> : <File className="h-5 w-5 shrink-0 text-secondary-foreground" />}
                      <span className="flex-grow truncate">{item.name}</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">More options</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setItemToDelete(item)} className="text-red-500">
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
            <DialogTitle>Create New File</DialogTitle>
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
