'use client';

import { useRef, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Undo2, Trash2, Eraser, Pencil } from 'lucide-react';
import type { DrawingNode as DrawingNodeType } from '@/types/hc-templates';

interface DrawingNodeProps {
  node: DrawingNodeType;
  value: string | undefined;
  onChange: (value: string) => void;
}

export function DrawingNode({ node, value, onChange }: DrawingNodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const historyRef = useRef<ImageData[]>([]);
  const modeRef = useRef<'draw' | 'erase'>('draw');

  const width = node.ui?.width || 400;
  const height = node.ui?.height || 300;
  const strokeWidth = node.ui?.strokeWidth || 4;
  const colors = node.ui?.colors || ['#000000', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b'];
  const currentColorRef = useRef(colors[0]);

  const saveState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (historyRef.current.length > 20) {
      historyRef.current.shift();
    }
  }, []);

  const saveToValue = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onChange(dataUrl);
  }, [onChange]);

  const getPosition = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    saveState();
    isDrawingRef.current = true;
    lastPosRef.current = getPosition(e);
  }, [saveState, getPosition]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getPosition(e);

    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (modeRef.current === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(255,255,255,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = currentColorRef.current;
    }

    ctx.stroke();
    lastPosRef.current = pos;
  }, [getPosition, strokeWidth]);

  const stopDrawing = useCallback(() => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      saveToValue();
    }
  }, [saveToValue]);

  const undo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (historyRef.current.length > 0) {
      const imageData = historyRef.current.pop();
      if (imageData) {
        ctx.putImageData(imageData, 0, 0);
        saveToValue();
      }
    }
  }, [saveToValue]);

  const clear = useCallback(() => {
    saveState();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveToValue();
  }, [saveState, saveToValue]);

  const setMode = useCallback((mode: 'draw' | 'erase') => {
    modeRef.current = mode;
  }, []);

  const setColor = useCallback((color: string) => {
    currentColorRef.current = color;
    modeRef.current = 'draw';
  }, []);

  return (
    <div className="space-y-3">
      <Label>{node.title}</Label>

      <div className="flex gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMode('draw')}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMode('erase')}
        >
          <Eraser className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={undo}
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clear}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <div className="flex gap-1">
          {colors.map((color) => (
            <button
              key={color}
              type="button"
              className="w-6 h-6 rounded border-2 border-gray-300 hover:border-gray-400"
              style={{ backgroundColor: color }}
              onClick={() => setColor(color)}
            />
          ))}
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden inline-block">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="bg-white cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      {value && (
        <p className="text-xs text-muted-foreground">
          Dibujo guardado
        </p>
      )}
    </div>
  );
}
