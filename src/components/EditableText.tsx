'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Trash2 } from 'lucide-react';

interface EditableTextProps {
  id: string;
  content: string;
  position: [number, number];
  fontSize: number;
  onSave: (id: string, newContent: string) => void;
  onMove: (id: string, newPosition: [number, number]) => void;
  onResize: (id: string, newSize: number) => void;
  onDelete: (id: string) => void;
  canvasBounds: DOMRect | undefined | null;
}

export const EditableText: React.FC<EditableTextProps> = ({ id, content, position, fontSize, onSave, onMove, onResize, onDelete, canvasBounds }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(content);
  const [pos, setPos] = useState(position);
  const [size, setSize] = useState(fontSize);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  
  const [isActive, setIsActive] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // --- Event Handlers ---

  const handleDoubleClick = () => {
    setIsActive(true);
    setIsEditing(true);
  };
  
  const handleBlur = () => {
    if (isEditing) {
      setIsEditing(false);
      setIsActive(false);
      if (text.trim() !== content) {
        onSave(id, text);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      setText(content);
      setIsEditing(false);
      setIsActive(false);
    }
  };

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
     if (isEditing) return;
     e.preventDefault();
     e.stopPropagation();
     (e.target as HTMLElement).setPointerCapture(e.pointerId);
     setIsActive(true);
     setIsDragging(true);
  }, [isEditing]);

  const handleResizePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsResizing(true);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!canvasBounds || !containerRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const { width, height } = canvasBounds;
    const elementRect = containerRef.current.getBoundingClientRect();

    if (isDragging) {
      const newX = pos[0] + (e.movementX / width) * 100;
      const newY = pos[1] + (e.movementY / height) * 100;
      
      const clampedX = Math.max(0, Math.min(100, newX));
      const clampedY = Math.max(0, Math.min(100, newY));

      setPos([clampedX, clampedY]);
    }

    if (isResizing) {
        // A simple resizing logic, could be improved
        const newSize = size + (e.movementX + e.movementY) * 0.5;
        const clampedSize = Math.max(8, newSize); // min font size 8
        setSize(clampedSize);
    }
  }, [isDragging, isResizing, pos, size, canvasBounds]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    if (isDragging) {
      onMove(id, pos);
      setIsDragging(false);
    }
    if (isResizing) {
      onResize(id, size);
      setIsResizing(false);
    }
  }, [isDragging, isResizing, pos, size, id, onMove, onResize]);


  // --- Effects ---

  useEffect(() => {
    setPos(position);
  }, [position]);

  useEffect(() => {
    setSize(fontSize);
  }, [fontSize]);

  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
      adjustTextareaHeight();
    }
  }, [isEditing, adjustTextareaHeight]);
  
  useEffect(() => {
    if (isEditing) {
      adjustTextareaHeight();
    }
  }, [text, isEditing, adjustTextareaHeight]);

  // Handle clicking outside to deactivate
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsActive(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${pos[0]}%`,
    top: `${pos[1]}%`,
    transform: 'translate(-50%, -50%)',
    fontSize: `${size}px`,
    lineHeight: 1.2,
    textAlign: 'center',
    minWidth: '2ch',
    color: 'black',
    cursor: isDragging ? 'grabbing' : 'grab',
    userSelect: 'none',
    border: isActive ? '1px dashed #007aff' : '1px solid transparent',
    padding: '4px',
    transition: 'border-color 0.2s',
  };
  
  const textareaStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.8)',
    outline: 'none',
    resize: 'none',
    width: '100%',
    overflow: 'hidden',
    color: 'black',
    font: 'inherit',
    lineHeight: 'inherit',
    textAlign: 'inherit',
    padding: '0',
    border: 'none',
    cursor: 'text'
  };

  const controlBaseStyle: React.CSSProperties = {
      position: 'absolute',
      width: '16px',
      height: '16px',
      background: '#007aff',
      border: '1px solid white',
      borderRadius: '50%',
      display: isActive ? 'flex' : 'none',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      cursor: 'pointer',
      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  };

  return (
    <div 
        ref={containerRef}
        style={containerStyle} 
        onDoubleClick={handleDoubleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={isDragging || isResizing ? handlePointerMove : undefined}
        onPointerUp={isDragging || isResizing ? handlePointerUp : undefined}
        onClick={(e) => { e.stopPropagation(); setIsActive(true); }}
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={textareaStyle}
          rows={1}
          onClick={(e) => e.stopPropagation()} // Prevent click from bubbling to container
        />
      ) : (
        <div>
          {content}
        </div>
      )}

      {/* Delete Button */}
       <div
        style={{ ...controlBaseStyle, top: '-8px', right: '-8px', cursor: 'pointer' }}
        onClick={(e) => { e.stopPropagation(); onDelete(id); }}
        onPointerDown={(e) => e.stopPropagation()} // Prevent drag start
      >
        <Trash2 size={10} />
      </div>

       {/* Resize Handle */}
      <div
        style={{ ...controlBaseStyle, bottom: '-8px', right: '-8px', cursor: 'nwse-resize' }}
        onPointerDown={handleResizePointerDown}
      />

    </div>
  );
};
