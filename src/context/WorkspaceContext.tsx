
'use client';

import React,
{
  createContext,
  useState,
  useCallback,
  ReactNode,
  useEffect
} from 'react';

export interface FileSystemItem {
  name: string;
  kind: 'file' | 'directory';
  handle: FileSystemHandle;
}

export interface PathSegment {
  name: string;
  handle: FileSystemDirectoryHandle;
}

interface WorkspaceContextType {
  rootDirectoryHandle: FileSystemDirectoryHandle | null;
  currentDirectoryHandle: FileSystemDirectoryHandle | null;
  directoryContents: FileSystemItem[];
  path: PathSegment[];
  error: string | null;
  mount: () => Promise<void>;
  getDirectoryContents: (handle: FileSystemDirectoryHandle) => Promise<void>;
  handleItemClick: (item: FileSystemItem) => string | void;
  handleBreadcrumbClick: (index: number) => void;
  handleBackClick: () => void;
  createFile: (fileName: string, content: string) => Promise<void>;
  createFolder: (folderName: string) => Promise<void>;
  deleteItem: (item: FileSystemItem) => Promise<void>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<void>;
}

export const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const [rootDirectoryHandle, setRootDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [currentDirectoryHandle, setCurrentDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [directoryContents, setDirectoryContents] = useState<FileSystemItem[]>([]);
  const [path, setPath] = useState<PathSegment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const getDirectoryContents = useCallback(async (handle: FileSystemDirectoryHandle) => {
    setError(null);
    try {
      const contents: FileSystemItem[] = [];
      for await (const entry of handle.values()) {
        if (entry.kind === 'directory' || (entry.kind === 'file' && entry.name.endsWith('.board'))) {
          contents.push({ name: entry.name, kind: entry.kind, handle: entry });
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
  }, []);

  const mount = useCallback(async () => {
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
  }, [getDirectoryContents]);

  const handleBreadcrumbClick = useCallback((index: number) => {
    const newPath = path.slice(0, index + 1);
    const newHandle = newPath[newPath.length - 1].handle;
    setPath(newPath);
    setCurrentDirectoryHandle(newHandle);
    getDirectoryContents(newHandle);
  }, [path, getDirectoryContents]);

  const handleBackClick = useCallback(() => {
    if (path.length > 1) {
      handleBreadcrumbClick(path.length - 2);
    }
  }, [path, handleBreadcrumbClick]);

  const handleItemClick = useCallback((item: FileSystemItem) => {
    if (item.kind === 'directory' && item.handle.kind === 'directory') {
      setCurrentDirectoryHandle(item.handle);
      setPath(prevPath => [...prevPath, { name: item.name, handle: item.handle }]);
      getDirectoryContents(item.handle);
    } else if (item.kind === 'file') {
      const pathParts = path.slice(1).map(p => p.name);
      pathParts.push(item.name);
      const fullPath = pathParts.join('/');
      return fullPath;
    }
  }, [path, getDirectoryContents]);

  const createFile = useCallback(async (fileName: string, content: string) => {
    if (!currentDirectoryHandle) return;
    try {
      const fileHandle = await currentDirectoryHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      await getDirectoryContents(currentDirectoryHandle);
    } catch (err) {
      setError(`Could not create file: ${fileName}`);
      console.error(err);
    }
  }, [currentDirectoryHandle, getDirectoryContents]);

  const createFolder = useCallback(async (folderName: string) => {
    if (!currentDirectoryHandle) return;
    try {
      await currentDirectoryHandle.getDirectoryHandle(folderName, { create: true });
      await getDirectoryContents(currentDirectoryHandle);
    } catch (err) {
      setError(`Could not create folder: ${folderName}`);
      console.error(err);
    }
  }, [currentDirectoryHandle, getDirectoryContents]);

  const deleteItem = useCallback(async (item: FileSystemItem) => {
    if (!currentDirectoryHandle) return;
    try {
      await currentDirectoryHandle.removeEntry(item.name, { recursive: item.kind === 'directory' });
      await getDirectoryContents(currentDirectoryHandle);
    } catch (err) {
      setError(`Could not delete: ${item.name}`);
      console.error(err);
    }
  }, [currentDirectoryHandle, getDirectoryContents]);

  const getFileHandle = useCallback(async (filePath: string, create = false): Promise<FileSystemFileHandle | null> => {
      if (!rootDirectoryHandle) return null;
      let currentHandle: FileSystemDirectoryHandle = rootDirectoryHandle;
      const parts = filePath.split('/');
      const fileName = parts.pop();
      if (!fileName) return null;

      for (const part of parts) {
          currentHandle = await currentHandle.getDirectoryHandle(part, { create });
      }

      return await currentHandle.getFileHandle(fileName, { create });
  }, [rootDirectoryHandle]);


  const readFile = useCallback(async (filePath: string): Promise<string> => {
    const fileHandle = await getFileHandle(filePath);
    if (!fileHandle) throw new Error("File not found");
    const file = await fileHandle.getFile();
    return await file.text();
  }, [getFileHandle]);


  const writeFile = useCallback(async (filePath: string, content: string): Promise<void> => {
      const fileHandle = await getFileHandle(filePath, true);
      if (!fileHandle) throw new Error("Could not get file handle");
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
  }, [getFileHandle]);

  useEffect(() => {
    if (currentDirectoryHandle) {
        getDirectoryContents(currentDirectoryHandle)
    }
  }, [currentDirectoryHandle, getDirectoryContents]);


  return (
    <WorkspaceContext.Provider
      value={{
        rootDirectoryHandle,
        currentDirectoryHandle,
        directoryContents,
        path,
        error,
        mount,
        getDirectoryContents,
        handleItemClick,
        handleBreadcrumbClick,
        handleBackClick,
        createFile,
        createFolder,
        deleteItem,
        readFile,
        writeFile
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};
