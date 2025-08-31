'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ResizeDirection = 'fontSize' | 'left' | 'right';

interface EditableTextProps {
  id: string;
  content: string;
  position: [number, number];
  fontSize: number;
  width?: number;
  onSave: (id: string, newContent: string) => void;
  onMove: (id: string, newPosition: [number, number]) => void;
  onResize: (id: string, newSize: number) => void;
  onWidthChange: (id: string, newWidth: number) => void;
  onDelete: (id: string) => void;
  onPointerUp: (id: string, finalState: { position: [number, number], fontSize: number, width?: number }) => void;
  canvasBounds: DOMRect | undefined | null;
}

export const EditableText: React.FC<EditableTextProps> = ({ 
  id, content, position, fontSize, width,
  onSave, onMove, onResize, onWidthChange, onDelete, onPointerUp,
  canvasBounds 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(content);

  // Local state for interactive updates
  const [pos, setPos] = useState(position);
  const [fs, setFs] = useState(fontSize);
  const [w, setW] = useState(width || 200);

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<ResizeDirection | null>(null);
  
  const [isActive, setIsActive] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Update local state if props change from outside
  useEffect(() => { setPos(position); }, [position]);
  useEffect(() => { setFs(fontSize); }, [fontSize]);
  useEffect(() => { setW(width || 200); }, [width]);

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
     if (e.target !== containerRef.current) return;
     
     setIsActive(true);
     
     longPressTimerRef.current = setTimeout(() => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        setIsDragging(true);
        longPressTimerRef.current = null;
     }, 300); // 300ms for long press

  }, [isEditing]);

  const handleResizePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>, direction: ResizeDirection) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsResizing(direction);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!canvasBounds || !containerRef.current) return;

    if (longPressTimerRef.current) {
      // If user moves before long press timeout, cancel it.
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (!isDragging && !isResizing) return;
    
    e.preventDefault();
    e.stopPropagation();

    const { width: canvasWidth, height: canvasHeight } = canvasBounds;

    if (isDragging) {
      const newX = pos[0] + (e.movementX / canvasWidth) * 100;
      const newY = pos[1] + (e.movementY / canvasHeight) * 100;
      
      const clampedX = Math.max(0, Math.min(100, newX));
      const clampedY = Math.max(0, Math.min(100, newY));

      const newPos: [number, number] = [clampedX, clampedY];
      setPos(newPos);
      onMove(id, newPos);
    }

    if (isResizing) {
        if (isResizing === 'fontSize') {
            const newSize = fs + (e.movementX + e.movementY) * 0.5;
            const clampedSize = Math.max(8, newSize); // min font size 8
            setFs(clampedSize);
            onResize(id, clampedSize);
        } else {
            const dx = e.movementX;
            let newWidth = w;
            if (isResizing === 'left') {
                newWidth = w - dx;
            } else if (isResizing === 'right') {
                newWidth = w + dx;
            }
            const clampedWidth = Math.max(50, newWidth); // min width 50px
            setW(clampedWidth);
            onWidthChange(id, clampedWidth);
        }
    }
  }, [isDragging, isResizing, pos, fs, w, canvasBounds, onMove, onResize, onWidthChange, id]);

  const handleGlobalPointerUp = useCallback((e: PointerEvent) => {
    if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
    }

    if (isDragging || isResizing) {
        onPointerUp(id, { position: pos, fontSize: fs, width: w });
    }

    setIsDragging(false);
    setIsResizing(null);
    const target = e.target as HTMLElement;
     if (target && target.hasPointerCapture(e.pointerId)) {
        target.releasePointerCapture(e.pointerId);
    }
  }, [isDragging, isResizing, id, pos, fs, w, onPointerUp]);


  // Adjust textarea height on edit
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
        if(isActive && !isEditing) setIsActive(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isActive, isEditing]);


  useEffect(() => {
    const onPointerMoveGlobal = (e: PointerEvent) => handlePointerMove(e as any);
    
    // Add listeners only when an interaction (drag, resize, or long-press) is possible
    if (isActive || isResizing) {
        window.addEventListener('pointermove', onPointerMoveGlobal);
        window.addEventListener('pointerup', handleGlobalPointerUp);
    }

    return () => {
        window.removeEventListener('pointermove', onPointerMoveGlobal);
        window.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, [isActive, isResizing, handlePointerMove, handleGlobalPointerUp]);


  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${pos[0]}%`,
    top: `${pos[1]}%`,
    transform: 'translate(-50%, -50%)',
    width: `${w}px`,
    fontSize: `${fs}px`,
    lineHeight: 1.2,
    color: 'black',
    cursor: isDragging ? 'grabbing' : (isActive ? 'grab' : 'default'),
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
    height: 'auto',
    overflow: 'hidden',
    color: 'black',
    font: 'inherit',
    lineHeight: 'inherit',
    textAlign: 'inherit',
    padding: '0',
    border: 'none',
    cursor: 'text',
  };
  
  const controlBaseStyle: React.CSSProperties = {
      position: 'absolute',
      background: '#007aff',
      display: isActive ? 'flex' : 'none',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      zIndex: 10,
  };

  return (
    <div 
        ref={containerRef}
        style={containerStyle} 
        onDoubleClick={handleDoubleClick}
        onPointerDown={handlePointerDown}
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
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div style={{ wordWrap: 'break-word', pointerEvents: 'none' }}>
          {content}
        </div>
      )}

      {/* Delete Button */}
       <div
        style={{ ...controlBaseStyle, top: '-8px', right: '-8px', cursor: 'pointer', width: '16px', height: '16px', borderRadius: '50%' }}
        onClick={(e) => { e.stopPropagation(); onDelete(id); }}
        onPointerDown={(e) => e.stopPropagation()} // Prevent drag start
      >
        <Trash2 size={10} />
      </div>

       {/* Font Size Handle */}
      <div
        style={{ ...controlBaseStyle, bottom: '-8px', right: '-8px', cursor: 'nwse-resize', width: '16px', height: '16px', borderRadius: '50%' }}
        onPointerDown={(e) => handleResizePointerDown(e, 'fontSize')}
      />

       {/* Width Handles */}
        <div
            style={{...controlBaseStyle, top: '50%', left: '-4px', transform: 'translateY(-50%)', cursor: 'ew-resize', width: '8px', height: '24px', borderRadius: '4px' }}
            onPointerDown={(e) => handleResizePointerDown(e, 'left')}
        />
        <div
            style={{...controlBaseStyle, top: '50%', right: '-4px', transform: 'translateY(-50%)', cursor: 'ew-resize', width: '8px', height: '24px', borderRadius: '4px' }}
            onPointerDown={(e) => handleResizePointerDown(e, 'right')}
        />

    </div>
  );
};
