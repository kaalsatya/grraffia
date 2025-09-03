
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { X, Trash2, Camera, Sigma, Plus, Delete } from 'lucide-react';
import { cn } from '@/lib/utils';
import functionPlot from 'function-plot';
import html2canvas from 'html2canvas';

interface GraphingCanvasProps {
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
}

const keyboardLayout = [
    ['x', 'y', 'pi', '^', '(', ')', 'sqrt'],
    ['7', '8', '9', '+', '-', 'sin', 'cos'],
    ['4', '5', '6', '*', '/', 'tan', 'log'],
    ['1', '2', '3', '.', '=', 'e', 'abs'],
];

export const GraphingCanvas: React.FC<GraphingCanvasProps> = ({ onClose, onCapture }) => {
  const plotContainerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const [formulas, setFormulas] = useState<{ id: number; value: string; color: string }[]>([
    { id: 1, value: 'x^2', color: '#3366cc' },
  ]);
  const [nextId, setNextId] = useState(2);
  const [activeInputIndex, setActiveInputIndex] = useState<number | null>(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const colors = ['#3366cc', '#dc3912', '#ff9900', '#109618', '#990099', '#0099c6'];

  const drawPlot = useCallback(() => {
    if (plotRef.current && plotContainerRef.current) {
      try {
        plotRef.current.innerHTML = '';
        functionPlot({
          target: plotRef.current,
          width: plotContainerRef.current.clientWidth,
          height: plotContainerRef.current.clientHeight,
          grid: true,
          data: formulas
            .filter(f => f.value.trim() !== '')
            .map(f => ({
                fn: f.value,
                color: f.color,
                graphType: 'polyline'
            })),
        });
      } catch(e) {
        console.error("Error plotting function:", e);
      }
    }
  }, [formulas]);

  useEffect(() => {
    drawPlot();
    const handleResize = () => drawPlot();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawPlot]);
  
  useEffect(() => {
    if (activeInputIndex !== null && inputRefs.current[activeInputIndex]) {
      inputRefs.current[activeInputIndex]?.focus();
    }
  }, [activeInputIndex]);

  const handleFormulaChange = (id: number, value: string) => {
    setFormulas(formulas.map(f => (f.id === id ? { ...f, value } : f)));
  };

  const addFormula = () => {
    const newColor = colors[formulas.length % colors.length];
    const newFormula = { id: nextId, value: '', color: newColor };
    setFormulas([...formulas, newFormula]);
    setActiveInputIndex(formulas.length);
    setNextId(nextId + 1);
  };

  const removeFormula = (id: number) => {
    setFormulas(formulas.filter(f => f.id !== id));
    if (formulas.length === 1) {
        setFormulas([{ id: nextId, value: '', color: colors[0] }]);
        setNextId(nextId + 1);
    }
     setActiveInputIndex(Math.max(0, formulas.length - 2));
  };

  const handleKeyboardClick = (key: string) => {
    if (activeInputIndex === null) return;

    const input = inputRefs.current[activeInputIndex];
    const formulaId = formulas[activeInputIndex].id;
    if (!input) return;

    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    const currentValue = input.value;
    let newValue = '';
    let cursorPosOffset = key.length;
    
    if (key === 'sqrt' || key === 'sin' || key === 'cos' || key === 'tan' || key === 'log' || key === 'abs') {
        newValue = currentValue.substring(0, start) + `${key}()` + currentValue.substring(end);
        cursorPosOffset = key.length + 1;
    } else if (key === '=') {
        drawPlot();
        return;
    } else if (key === 'backspace') {
      if (start > 0) {
        newValue = currentValue.substring(0, start - 1) + currentValue.substring(end);
        cursorPosOffset = -1;
      } else {
        newValue = currentValue;
        cursorPosOffset = 0;
      }
    } else {
        newValue = currentValue.substring(0, start) + key + currentValue.substring(end);
    }

    handleFormulaChange(formulaId, newValue);

    const newCursorPos = start + cursorPosOffset;
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };
  
  const handleCapture = async () => {
    if (plotRef.current) {
        const canvas = await html2canvas(plotRef.current, { useCORS: true, backgroundColor: '#ffffff' });
        const dataUrl = canvas.toDataURL('image/png');
        onCapture(dataUrl);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-background text-foreground">
      <header className="flex-shrink-0 h-12 flex items-center justify-between px-3 border-b">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Sigma/>Graphing Calculator</h2>
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleCapture}><Camera /><span className="sr-only">Capture</span></Button>
            <Button variant="ghost" size="icon" onClick={onClose}><X /><span className="sr-only">Close</span></Button>
        </div>
      </header>

      <main ref={plotContainerRef} className="flex-grow w-full relative">
        <div ref={plotRef} className="w-full h-full bg-white" />
      </main>
      
      <footer className="flex-shrink-0">
        <Card className="rounded-t-lg rounded-b-none border-t-2 border-x-0 border-b-0">
            <CardContent className="p-2 grid gap-2">
                <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-2">
                    {formulas.map((f, index) => (
                        <div key={f.id} className="flex items-center gap-2 flex-shrink-0">
                        <span className="w-2 h-6 rounded-full" style={{ backgroundColor: f.color }} />
                        <Input
                            ref={el => (inputRefs.current[index] = el)}
                            type="text"
                            readOnly
                            value={f.value}
                            onFocus={() => setActiveInputIndex(index)}
                            onClick={() => setActiveInputIndex(index)}
                            onKeyDown={(e) => { 
                              if (e.key === 'Enter') drawPlot() 
                              e.preventDefault();
                            }}
                            className="flex-grow bg-muted border-muted-foreground/30"
                            placeholder="y = f(x)"
                        />
                        <Button variant="ghost" size="icon" onClick={() => removeFormula(f.id)} disabled={formulas.length <= 1 && f.value === ''}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                        </div>
                    ))}
                </div>
                 <Button onClick={addFormula} variant="outline" size="sm" className="w-full">
                    <Plus className="h-4 w-4 mr-2" /> Add Formula
                </Button>
                
                <div className="grid grid-cols-7 gap-1 pt-2">
                    {keyboardLayout.flat().map((key) => (
                    <Button key={key} variant="outline" className="h-8 text-sm p-2" onClick={() => handleKeyboardClick(key)}>
                        {key}
                    </Button>
                    ))}
                    <Button variant="outline" className="h-8 col-span-1 p-2" onClick={() => handleKeyboardClick('0')}>
                        0
                    </Button>
                     <Button variant="outline" className="h-8 col-span-1 p-2" onClick={() => handleKeyboardClick('backspace')}>
                        <Delete />
                    </Button>
                </div>
            </CardContent>
        </Card>
      </footer>
    </div>
  );
};
