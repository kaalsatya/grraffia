'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface EditableTextProps {
  id: string;
  content: string;
  position: [number, number];
  fontSize: number;
  onSave: (id: string, newContent: string) => void;
}

export const EditableText: React.FC<EditableTextProps> = ({ id, content, position, fontSize, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };
  
  const handleBlur = () => {
    if (isEditing) {
      setIsEditing(false);
      if (text.trim() !== content) {
        onSave(id, text);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      setText(content);
      setIsEditing(false);
    }
  };
  
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


  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${position[0]}%`,
    top: `${position[1]}%`,
    transform: 'translate(-50%, -50%)',
    fontSize: `${fontSize}px`,
    lineHeight: 1.2,
    textAlign: 'center',
    minWidth: '2ch', // minimum width to avoid jumpy behavior
  };
  
  const textStyle: React.CSSProperties = {
    whiteSpace: 'pre-wrap',
    cursor: 'pointer',
    color: 'black',
    padding: '4px',
  };

  const textareaStyle: React.CSSProperties = {
    border: '1px dashed #999',
    background: 'rgba(255, 255, 255, 0.8)',
    outline: 'none',
    resize: 'none',
    width: '100%',
    overflow: 'hidden',
    color: 'black',
    font: 'inherit',
    lineHeight: 'inherit',
    textAlign: 'inherit',
    padding: '4px',
  };

  return (
    <div style={containerStyle} onDoubleClick={handleDoubleClick}>
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={textareaStyle}
          rows={1}
        />
      ) : (
        <div style={textStyle}>
          {content}
        </div>
      )}
    </div>
  );
};
