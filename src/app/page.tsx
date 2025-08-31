'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Folder, File } from 'lucide-react';

interface FileSystemItem {
  name: string;
  kind: 'file' | 'directory';
}

export default function Home() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [directoryContents, setDirectoryContents] = useState<FileSystemItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleMountClick = async () => {
    setError(null);
    setDirectoryContents([]);
    try {
      if ('showDirectoryPicker' in window) {
        const handle = await window.showDirectoryPicker();
        setDirectoryHandle(handle);
      } else {
        setError('Your browser does not support the File System Access API.');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User cancelled the folder selection, do nothing or show a message.
      } else {
        setError('An error occurred while trying to access the folder.');
        console.error(err);
      }
    }
  };

  useEffect(() => {
    const getDirectoryContents = async () => {
      if (directoryHandle) {
        try {
          const contents: FileSystemItem[] = [];
          for await (const entry of directoryHandle.values()) {
            contents.push({ name: entry.name, kind: entry.kind });
          }
          setDirectoryContents(contents);
        } catch (err) {
          setError('Could not read directory contents.');
          console.error(err);
        }
      }
    };

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
    <main className="flex min-h-screen flex-col items-center justify-start bg-background p-8 pt-24">
      <div className="mx-auto max-w-4xl w-full">
        <Card className="text-left">
          <CardHeader>
            <CardTitle>Mounted to folder "{directoryHandle.name}"</CardTitle>
          </CardHeader>
          <CardContent>
            {directoryContents.length > 0 ? (
              <ul className="space-y-2">
                {directoryContents.map((item) => (
                  <li key={item.name} className="flex items-center gap-2">
                    {item.kind === 'directory' ? <Folder className="h-5 w-5 shrink-0 text-primary" /> : <File className="h-5 w-5 shrink-0 text-secondary-foreground" />}
                    <span className="truncate">{item.name}</span>
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
  );
}
