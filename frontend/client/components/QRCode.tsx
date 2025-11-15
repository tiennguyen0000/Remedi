import React from 'react';

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

// Simple QR code-like pattern generator (fake QR code for display)
export function QRCode({ value, size = 200, className }: QRCodeProps) {
  const patternUrl = React.useMemo(() => {
    if (!value || typeof document === 'undefined') return '';
    
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);

    // Black squares pattern
    ctx.fillStyle = '#000000';
    const cellSize = size / 25;
    
    // Position markers (top-left, top-right, bottom-left)
    const drawMarker = (x: number, y: number) => {
      const markerSize = cellSize * 7;
      // Outer square
      ctx.fillStyle = '#000000';
      ctx.fillRect(x, y, markerSize, markerSize);
      // Inner white square
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x + cellSize * 2, y + cellSize * 2, cellSize * 3, cellSize * 3);
      // Center black square
      ctx.fillStyle = '#000000';
      ctx.fillRect(x + cellSize * 3, y + cellSize * 3, cellSize, cellSize);
    };

    drawMarker(0, 0);
    drawMarker(size - cellSize * 7, 0);
    drawMarker(0, size - cellSize * 7);

    // Data pattern based on text hash
    ctx.fillStyle = '#000000';
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = ((hash << 5) - hash) + value.charCodeAt(i);
      hash = hash & hash;
    }

    for (let i = 0; i < 25; i++) {
      for (let j = 0; j < 25; j++) {
        // Skip marker areas
        if (
          (i < 9 && j < 9) ||
          (i < 9 && j >= 16) ||
          (i >= 16 && j < 9)
        ) {
          continue;
        }
        
        // Random pattern based on hash
        const seed = (Math.abs(hash) + i * 25 + j) % 3;
        if (seed === 0) {
          ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
        }
      }
    }

    return canvas.toDataURL();
  }, [value, size]);

  if (!patternUrl) {
    return (
      <div 
        className={`inline-block ${className} border-2 border-gray-300 rounded bg-white flex items-center justify-center`} 
        style={{ width: size, height: size }}
      >
        <span className="text-xs text-gray-400">QR Code</span>
      </div>
    );
  }

  return (
    <div className={`inline-block ${className}`}>
      <img
        src={patternUrl}
        alt="QR Code"
        className="border-2 border-gray-300 rounded"
        width={size}
        height={size}
      />
    </div>
  );
}
