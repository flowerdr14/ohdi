import React, { useRef, useState, useEffect } from 'react';
import { DrawingStroke, Textbook } from '../types';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Pencil, 
  Grid, 
  Video, 
  LogOut, 
  Trash2, 
  Undo2, 
  ChevronUp, 
  ChevronDown,
  Info
} from 'lucide-react';

interface DrawCanvasProps {
  textbook: Textbook;
  onExit: () => void;
  onUpdateTextbook: (updated: Textbook) => void;
}

export default function DrawCanvas({
  textbook,
  onExit,
  onUpdateTextbook,
}: DrawCanvasProps) {
  const [currentPage, setCurrentPage] = useState<number>(textbook.startPage);
  const [isDrawingMode, setIsDrawingMode] = useState<boolean>(true);
  const [showGridMode, setShowGridMode] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  
  // Brush controls
  const [selectedTool, setSelectedTool] = useState<'pencil' | 'felt' | 'highlighter' | 'eraser'>('pencil');
  const [brushColor, setBrushColor] = useState<string>('#FF0000'); // Default Red as user image leftmost
  const [brushWidth, setBrushWidth] = useState<number>(4);

  // Background style helper if no PDF image is loaded
  const [bgStyle, setBgStyle] = useState<'plain' | 'grid' | 'ruled' | 'music'>('plain');

  // Undo/Redo stack map
  const [undoStack, setUndoStack] = useState<{ [page: number]: DrawingStroke[][] }>({});
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const currentStrokeRef = useRef<DrawingStroke | null>(null);

  // DRAGGABLE TOOLBAR POSITION STATE
  const [toolPos, setToolPos] = useState({ x: 80, y: 640 }); // Default float near bottom-left center
  const [isDraggingTool, setIsDraggingTool] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  // High-performance canvas virtual coordinate resolution (Classic A4 Aspect ratio)
  const COORD_WIDTH = 900;
  const COORD_HEIGHT = 1250;

  // Sync canvas redraw when dependencies change
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const parent = canvas.parentElement;
      if (!parent) return;

      // Fit and expand page cleanly in workspace
      const parentWidth = parent.clientWidth;
      const parentHeight = parent.clientHeight;
      
      const targetAspect = COORD_WIDTH / COORD_HEIGHT;
      const parentAspect = parentWidth / parentHeight;
      
      let newWidth = parentWidth;
      let newHeight = parentHeight;
      
      if (parentAspect > targetAspect) {
        newHeight = parentHeight * 0.98; // Ensure slight spacing padding
        newWidth = newHeight * targetAspect;
      } else {
        newWidth = parentWidth * 0.98;
        newHeight = newWidth / targetAspect;
      }
      
      canvas.style.width = `${newWidth}px`;
      canvas.style.height = `${newHeight}px`;
      
      canvas.width = newWidth * window.devicePixelRatio;
      canvas.height = newHeight * window.devicePixelRatio;
      
      redrawCanvas();
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    window.addEventListener('resize', handleResize);
    // Initial draw
    handleResize();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [currentPage, textbook.pages, textbook.pageImages, selectedTool, brushColor, brushWidth, bgStyle]);

  // Main high-fidelity drawing compositor
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scaleX = canvas.width / COORD_WIDTH;
    const scaleY = canvas.height / COORD_HEIGHT;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Check if custom parsed PDF page image exists for current page!
    const customPageImage = textbook.pageImages?.[currentPage] || (currentPage === textbook.startPage ? textbook.coverImage : null);

    if (customPageImage) {
      const img = new Image();
      img.src = customPageImage;
      img.onload = () => {
        ctx.save();
        ctx.scale(scaleX, scaleY);
        ctx.drawImage(img, 0, 0, COORD_WIDTH, COORD_HEIGHT);
        ctx.restore();
        drawStrokes(ctx, scaleX, scaleY);
      };
      if (img.complete) {
        ctx.save();
        ctx.scale(scaleX, scaleY);
        ctx.drawImage(img, 0, 0, COORD_WIDTH, COORD_HEIGHT);
        ctx.restore();
        drawStrokes(ctx, scaleX, scaleY);
        return;
      }
    } else {
      // Use premium vector backgrounds as native layouts
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.scale(scaleX, scaleY);

      if (bgStyle === 'grid') {
        // Soft purple grid guide
        ctx.strokeStyle = '#f0def2';
        ctx.lineWidth = 1;
        const gridGap = 40;
        for (let x = 0; x < COORD_WIDTH; x += gridGap) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, COORD_HEIGHT);
          ctx.stroke();
        }
        for (let y = 0; y < COORD_HEIGHT; y += gridGap) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(COORD_WIDTH, y);
          ctx.stroke();
        }
      } else if (bgStyle === 'ruled') {
        // Ruled paper lines for standard korean writing
        ctx.strokeStyle = '#e2a1e060';
        ctx.lineWidth = 2;
        const lineGap = 50;
        for (let y = 100; y < COORD_HEIGHT - 50; y += lineGap) {
          ctx.beginPath();
          ctx.moveTo(50, y);
          ctx.lineTo(COORD_WIDTH - 50, y);
          ctx.stroke();
        }
      } else if (bgStyle === 'music') {
        // Pentagram music lines for lesson use
        ctx.strokeStyle = '#51105c30';
        ctx.lineWidth = 1;
        const drawStaff = (startHeight: number) => {
          for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.moveTo(40, startHeight + i * 14);
            ctx.lineTo(COORD_WIDTH - 40, startHeight + i * 14);
            ctx.stroke();
          }
        };
        drawStaff(200);
        drawStaff(450);
        drawStaff(700);
        drawStaff(950);
      }

      ctx.restore();
      drawStrokes(ctx, scaleX, scaleY);
    }
  };

  const drawStrokes = (ctx: CanvasRenderingContext2D, scaleX: number, scaleY: number) => {
    const pageStrokes = textbook.pages[currentPage] || [];
    
    pageStrokes.forEach((stroke) => {
      if (stroke.points.length < 1) return;
      
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (stroke.tool === 'highlighter') {
        ctx.globalAlpha = 0.50;
        ctx.lineWidth = stroke.width * 5; // Extra thick highlighter
        ctx.strokeStyle = stroke.color;
        ctx.globalCompositeOperation = 'multiply';
      } else if (stroke.tool === 'felt') {
        ctx.globalAlpha = 1.0;
        ctx.lineWidth = stroke.width * 2.5;
        ctx.strokeStyle = stroke.color;
      } else if (stroke.tool === 'eraser') {
        // White vector opaque stroke
        ctx.globalAlpha = 1.0;
        ctx.lineWidth = stroke.width * 6;
        ctx.strokeStyle = '#FFFFFF';
      } else { // pencil
        ctx.globalAlpha = 0.95;
        ctx.lineWidth = stroke.width;
        ctx.strokeStyle = stroke.color;
      }
      
      ctx.beginPath();
      const firstPoint = stroke.points[0];
      ctx.moveTo(firstPoint.x * scaleX, firstPoint.y * scaleY);
      
      for (let i = 1; i < stroke.points.length; i++) {
        const pt = stroke.points[i];
        ctx.lineTo(pt.x * scaleX, pt.y * scaleY);
      }
      
      ctx.stroke();
      ctx.restore();
    });
  };

  const getCanvasCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * COORD_WIDTH;
    const y = ((clientY - rect.top) / rect.height) * COORD_HEIGHT;
    return { x, y };
  };

  const handleEraserAtPoint = (x: number, y: number) => {
    const pageStrokes = textbook.pages[currentPage] || [];
    const eraseRadius = brushWidth * 10;
    let hasChanged = false;
    
    const filteredStrokes = pageStrokes.filter((stroke) => {
      if (stroke.points.length === 0) return true;
      const touches = stroke.points.some((pt) => {
        const dist = Math.hypot(pt.x - x, pt.y - y);
        return dist < eraseRadius;
      });
      if (touches) hasChanged = true;
      return !touches;
    });

    if (hasChanged) {
      pushToUndoStack(pageStrokes);
      updatePageStrokes(filteredStrokes);
    }
  };

  const handleStartDraw = (clientX: number, clientY: number) => {
    if (!isDrawingMode || showGridMode) return;
    
    const { x, y } = getCanvasCoords(clientX, clientY);
    
    if (selectedTool === 'eraser') {
      isDrawingRef.current = true;
      handleEraserAtPoint(x, y);
      return;
    }
    
    isDrawingRef.current = true;
    
    const newStroke: DrawingStroke = {
      id: Math.random().toString(36).substring(2, 9),
      tool: selectedTool,
      color: brushColor,
      width: brushWidth,
      points: [{ x, y }]
    };
    
    currentStrokeRef.current = newStroke;
    pushToUndoStack(textbook.pages[currentPage] || []);
    updatePageStrokes([...(textbook.pages[currentPage] || []), newStroke]);
  };

  const handleMoveDraw = (clientX: number, clientY: number) => {
    if (!isDrawingRef.current || !isDrawingMode || showGridMode) return;
    
    const { x, y } = getCanvasCoords(clientX, clientY);
    
    if (selectedTool === 'eraser') {
      handleEraserAtPoint(x, y);
      return;
    }
    
    const currentStroke = currentStrokeRef.current;
    if (!currentStroke) return;
    
    currentStroke.points.push({ x, y });
    
    const currentList = textbook.pages[currentPage] || [];
    const updatedList = currentList.map((stk) => {
      if (stk.id === currentStroke.id) {
        return { ...stk, points: [...currentStroke.points] };
      }
      return stk;
    });
    
    updatePageStrokes(updatedList);
  };

  const handleEndDraw = () => {
    isDrawingRef.current = false;
    currentStrokeRef.current = null;
  };

  const updatePageStrokes = (updatedStrokes: DrawingStroke[]) => {
    const updatedPages = {
      ...textbook.pages,
      [currentPage]: updatedStrokes
    };
    onUpdateTextbook({
      ...textbook,
      pages: updatedPages
    });
  };

  const pushToUndoStack = (snapshot: DrawingStroke[]) => {
    const currentUndos = undoStack[currentPage] || [];
    setUndoStack({
      ...undoStack,
      [currentPage]: [...currentUndos, snapshot]
    });
  };

  const handleUndo = () => {
    const currentUndos = undoStack[currentPage] || [];
    if (currentUndos.length === 0) return;
    const previousState = currentUndos[currentUndos.length - 1];
    const newUndos = currentUndos.slice(0, currentUndos.length - 1);
    
    setUndoStack({
      ...undoStack,
      [currentPage]: newUndos
    });
    updatePageStrokes(previousState);
  };

  const handleClearPage = () => {
    pushToUndoStack(textbook.pages[currentPage] || []);
    updatePageStrokes([]);
  };

  const handlePrevPage = () => {
    if (currentPage > textbook.startPage) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < textbook.endPage) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleAddNewPage = () => {
    const newEndPage = textbook.endPage + 1;
    onUpdateTextbook({
      ...textbook,
      endPage: newEndPage
    });
    setCurrentPage(newEndPage);
  };

  // ----------------------------------------------------
  // DRAG AND DROP FLOATING TOOLBAR LOGIC (Move anywhere!)
  // ----------------------------------------------------
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag if clicking on outer border, background card, or handle
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;

    setIsDraggingTool(true);
    dragStartRef.current = {
      x: e.clientX - toolPos.x,
      y: e.clientY - toolPos.y
    };
    target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingTool) return;
    
    let newX = e.clientX - dragStartRef.current.x;
    let newY = e.clientY - dragStartRef.current.y;
    
    // Bounds clamping inside screen
    const boundaryOffset = 40;
    newX = Math.max(boundaryOffset, Math.min(window.innerWidth - 600, newX));
    newY = Math.max(boundaryOffset, Math.min(window.innerHeight - 200, newY));

    setToolPos({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingTool) {
      setIsDraggingTool(false);
      const target = e.target as HTMLElement;
      target.releasePointerCapture(e.pointerId);
    }
  };

  // The 6 colors exactly requested by the customer image (Red, Blue, Yellow, Green, White, Black)
  const userColors = [
    { value: '#FF0000', label: '빨강' },
    { value: '#0000FF', label: '파랑' },
    { value: '#FFFF00', label: '노랑' },
    { value: '#00B050', label: '초록' },
    { value: '#FFFFFF', label: '흰색' },
    { value: '#000000', label: '검정' },
  ];

  // Map chosen tool to custom stylized korean icons for central wheel
  const getCentralToolIcon = () => {
    switch(selectedTool) {
      case 'eraser': return '🧼';
      case 'highlighter': return '🖍️';
      case 'felt': return '🖋️';
      default: return '✏️';
    }
  };

  // Exit trigger playful dialog (Direct exit to lobby as requested!)
  const handleDirectExit = () => {
    onExit();
  };

  return (
    <div className="min-h-screen bg-[#ECA1E0] flex flex-col relative overflow-hidden" id="drawpage-root">
      
      {/* Top Floating App Bar */}
      <header className="bg-white/85 backdrop-blur-md border-b-4 border-[#51105c] p-3 px-6 flex justify-between items-center z-10 m-shadow-sm select-none shrink-0" id="drawpage-header">
        <div className="flex items-center gap-3">
          {/* Logo on the far Left */}
          <span className="bg-[#8E24AA] text-white font-black text-xs px-2.5 py-1.5 rounded-md border-2 border-[#51105c] tracking-wider uppercase font-sans m-shadow-sm">
            OHDI (오디)
          </span>
          <h2 className="text-xl font-bold tracking-tight text-[#51105c] flex items-center gap-1 select-none font-sans">
            {textbook.title} 
            <span className="text-xs font-sans font-black text-[#51105c] bg-purple-100 rounded-full px-3 py-1 ml-2 border-2 border-[#51105c]">
              {currentPage} / {textbook.endPage} 페이지
            </span>
          </h2>
        </div>
        
        {/* Dynamic Theme Selection helper if drawpage is default blank */}
        <div className="flex items-center gap-2 font-sans select-none">
          {!textbook.pageImages?.[currentPage] && (
            <div className="flex items-center bg-white border-2 border-[#51105c] rounded-lg p-0.5 px-1 bg-purple-50 text-[11px] font-bold mr-2">
              <span className="text-gray-500 mr-2">배경:</span>
              <button onClick={() => setBgStyle('plain')} className={`px-2 py-0.5 rounded cursor-pointer ${bgStyle === 'plain' ? 'bg-[#8E24AA] text-white' : 'text-gray-600'}`}>플레인</button>
              <button onClick={() => setBgStyle('grid')} className={`px-2 py-0.5 rounded cursor-pointer ${bgStyle === 'grid' ? 'bg-[#8E24AA] text-white' : 'text-gray-600'}`}>모눈종이</button>
              <button onClick={() => setBgStyle('ruled')} className={`px-2 py-0.5 rounded cursor-pointer ${bgStyle === 'ruled' ? 'bg-[#8E24AA] text-white' : 'text-gray-600'}`}>무지선</button>
              <button onClick={() => setBgStyle('music')} className={`px-2 py-0.5 rounded cursor-pointer ${bgStyle === 'music' ? 'bg-[#8E24AA] text-white' : 'text-gray-600'}`}>오선지</button>
            </div>
          )}

          {showGridMode ? (
            <span className="bg-[#9c27b0] text-white px-3 py-1 rounded-full text-xs font-bold border-2 border-[#51105c]">
              ● 격자 뷰
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="bg-[#8E24AA] text-white px-3 py-1 rounded-full text-xs font-black border-2 border-[#51105c]">
                ● DRAW MODE
              </span>
              {isRecording && (
                <div className="flex items-center gap-1 bg-red-100 border-2 border-red-500 px-2 py-0.5 rounded-full text-red-600 font-bold text-xs animate-pulse">
                  REC
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Workspace Frame container */}
      <div className="flex-1 flex overflow-hidden p-4 md:p-6 gap-6 relative" ref={containerRef} id="drawpage-workspace">
        
        {/* LEFT CANVAS: BIG CENTRAL WHITEBOARD (Occupies maximum screen) */}
        <div className="flex-1 flex items-center justify-center relative rounded-3xl overflow-hidden bg-pink-100/30 p-2 border-4 border-dashed border-[#51105c]/30" id="canvas-container-outer">
          
          {showGridMode ? (
            /* PAGES GRID VIEW */
            <div className="absolute inset-0 bg-white/95 backdrop-blur-md overflow-y-auto p-4 md:p-8 animate-fade-in z-25" id="canvas-grid-mode">
              <div className="max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-gray-100 font-sans">
                  <h3 className="text-2xl font-bold text-[#51105c] flex items-center gap-2">
                    <Grid size={24} /> 전체 페이지 격자 모드
                  </h3>
                  <p className="text-gray-500 text-sm font-semibold select-none">
                    가상 대시보드에서 칠판을 선택하면 즉시 해당 슬라이드로 순간 이동합니다.
                  </p>
                </div>
                
                {/* 24-box visual representation */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4" id="grid-pages-container">
                  {Array.from({ length: textbook.endPage - textbook.startPage + 1 }, (_, i) => {
                    const pageNum = textbook.startPage + i;
                    const pageDraws = textbook.pages[pageNum] || [];
                    const isCurrent = pageNum === currentPage;
                    const customImage = textbook.pageImages?.[pageNum] || (pageNum === textbook.startPage ? textbook.coverImage : null);
                    
                    return (
                      <div 
                        key={pageNum}
                        onClick={() => {
                          setCurrentPage(pageNum);
                          setShowGridMode(false);
                        }}
                        className={`aspect-[3/4] border-3 rounded-2xl bg-white flex flex-col justify-between p-3 cursor-pointer select-none m-shadow-sm transition-all duration-150 ${
                          isCurrent 
                            ? 'border-[#9c27b0] ring-4 ring-[#e2a5e1] scale-102' 
                            : 'border-[#51105c] hover:bg-pink-50 hover:scale-103'
                        }`}
                      >
                        <div className="border border-gray-100 rounded-md flex-1 bg-white relative overflow-hidden flex items-center justify-center">
                          {customImage ? (
                            <img 
                              src={customImage} 
                              alt={`Page ${pageNum} preview`} 
                              className="absolute inset-0 w-full h-full object-cover" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="text-xs text-gray-300 font-sans font-bold">도큐먼트 {pageNum}p</span>
                          )}
                          
                          {pageDraws.length > 0 && (
                            <div className="absolute bottom-1 right-1 bg-black/75 text-white text-[9px] px-1 rounded font-mono">
                              {pageDraws.length}획
                            </div>
                          )}
                        </div>
                        <span className="text-center text-xs font-bold text-[#51105c] mt-2 block font-sans">
                          {pageNum} 페이지
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* CANVAS COMPONENT DISPLAY (Expanded and highly polished) */
            <div 
              className="relative shadow-2xl rounded-2xl bg-white border-4 border-[#51105c] overflow-hidden m-shadow-lg max-w-full max-h-full aspect-[900/1250] transition-all duration-200" 
              id="actual-canvas-parent"
            >
              <canvas
                ref={canvasRef}
                onMouseDown={(e) => handleStartDraw(e.clientX, e.clientY)}
                onMouseMove={(e) => handleMoveDraw(e.clientX, e.clientY)}
                onMouseUp={handleEndDraw}
                onMouseLeave={handleEndDraw}
                onTouchStart={(e) => {
                  if (e.touches.length > 0) {
                    const t = e.touches[0];
                    handleStartDraw(t.clientX, t.clientY);
                  }
                }}
                onTouchMove={(e) => {
                  if (e.touches.length > 0) {
                    const t = e.touches[0];
                    handleMoveDraw(t.clientX, t.clientY);
                  }
                }}
                onTouchEnd={handleEndDraw}
                className="block cursor-crosshair touch-none bg-white"
                id="whiteboard-canvas-core"
              />
            </div>
          )}

        </div>

        {/* SIDEBAR RIGHT CONTROL PANEL ASIDE */}
        <aside 
          className="w-20 md:w-24 bg-[#fbf0ff]/95 rounded-3xl border-4 border-[#51105c] flex flex-col justify-between p-3 select-none m-shadow shrink-0 z-15"
          id="canvas-right-control-panel-aside"
        >
          {/* Top segment: Navigation buttons */}
          <div className="flex flex-col gap-3 items-center">
            
            {/* Click to add new page button ("+") */}
            <button
              type="button"
              onClick={handleAddNewPage}
              className="w-12 h-12 rounded-full bg-white hover:bg-emerald-50 text-emerald-600 border-3 border-[#51105c] flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all m-shadow-sm"
              title="새 흰 도화지 추가"
              id="sidebar-add-page-btn"
            >
              <Plus size={26} strokeWidth={3} />
            </button>

            <span className="w-8 h-1 bg-[#51105c]/15 rounded-full my-1"></span>

            {/* Click to previous page ("<") */}
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={currentPage <= textbook.startPage}
              className={`w-12 h-12 rounded-full border-3 border-[#51105c] flex items-center justify-center transition-all m-shadow-sm ${
                currentPage <= textbook.startPage
                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none'
                  : 'bg-white text-[#51105c] hover:bg-purple-100/50 cursor-pointer hover:scale-105 active:scale-95'
              }`}
              title="이전 페이지"
              id="sidebar-prev-page-btn"
            >
              <ChevronLeft size={24} strokeWidth={3} />
            </button>

            {/* Click to next page (">") */}
            <button
              type="button"
              onClick={handleNextPage}
              disabled={currentPage >= textbook.endPage}
              className={`w-12 h-12 rounded-full border-3 border-[#51105c] flex items-center justify-center transition-all m-shadow-sm ${
                currentPage >= textbook.endPage
                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none'
                  : 'bg-white text-[#51105c] hover:bg-purple-100/50 cursor-pointer hover:scale-105 active:scale-95'
              }`}
              title="다음 페이지"
              id="sidebar-next-page-btn"
            >
              <ChevronRight size={24} strokeWidth={3} />
            </button>

            <span className="w-8 h-1 bg-[#51105c]/15 rounded-full my-1"></span>

            {/* Pencil button (Toggle canvas drawing options bar visibility) */}
            <button
              type="button"
              onClick={() => {
                setIsDrawingMode(!isDrawingMode);
                setShowGridMode(false);
              }}
              className={`w-12 h-12 rounded-full border-3 border-[#51105c] flex items-center justify-center transition-all m-shadow-sm ${
                isDrawingMode && !showGridMode
                  ? 'bg-[#8E24AA] text-white active:scale-95'
                  : 'bg-white text-[#51105c] hover:bg-purple-100/50 hover:scale-105'
              }`}
              title="판서 도구모음 토글"
              id="sidebar-pencil-toggle-btn"
            >
              <Pencil size={20} strokeWidth={2.5} />
            </button>

            {/* Magnifying Glass/Grid Overview button */}
            <button
              type="button"
              onClick={() => {
                setShowGridMode(!showGridMode);
              }}
              className={`w-12 h-12 rounded-full border-3 border-[#51105c] flex items-center justify-center transition-all m-shadow-sm ${
                showGridMode
                  ? 'bg-[#8E24AA] text-white'
                  : 'bg-white text-[#51105c] hover:bg-[#fff0fc] hover:scale-105'
              }`}
              title="전체 페이지 목록 보기"
              id="sidebar-grid-view-btn"
            >
              <Grid size={22} strokeWidth={2.5} />
            </button>

          </div>

          {/* Bottom segment: Exit and Recording */}
          <div className="flex flex-col gap-3 items-center">
            
            {/* Record / Sync download textbook JSON file (Acts as REC) */}
            <button
              type="button"
              onClick={() => {
                setIsRecording(!isRecording);
                if (!isRecording) {
                  alert("🔴 수강/교안용 판서 로컬 기록이 시작되었습니다. 수업이 끝난 후 이 버튼을 다시 누르면 판서 데이터가 저장된 JSON 파일이 무손실 추출됩니다!");
                } else {
                  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(textbook, null, 2));
                  const downloadAnchor = document.createElement('a');
                  downloadAnchor.setAttribute("href", dataStr);
                  downloadAnchor.setAttribute("download", `OHDI_${textbook.title}_판서기록.json`);
                  document.body.appendChild(downloadAnchor);
                  downloadAnchor.click();
                  downloadAnchor.remove();
                  alert("💾 판서 무손실 JSON 백업이 다운로드되었습니다. 언제든 다시 업로드하여 불러오실 수 있습니다!");
                }
              }}
              className={`w-12 h-12 rounded-full border-3 border-[#51105c] flex flex-col items-center justify-center transition-all m-shadow-sm font-sans text-[10px] font-black ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-white text-red-600 hover:bg-red-50 hover:scale-105'
              }`}
              title="판서 기록 시작/종료"
              id="sidebar-record-btn"
            >
              <Video size={18} strokeWidth={2.5} />
              <span>REC</span>
            </button>

            {/* EXIT button to close board mode immediately back to lobby! */}
            <button
              type="button"
              onClick={handleDirectExit}
              className="w-12 h-12 rounded-full bg-red-100 hover:bg-red-200 text-red-700 border-3 border-[#51105c] flex flex-col items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all m-shadow-sm font-sans text-[9px] font-black"
              title="나가기"
              id="sidebar-exit-btn"
            >
              <LogOut size={16} strokeWidth={2.5} />
              <span>EXIT</span>
            </button>

          </div>

        </aside>

        {/* ---------------------------------------------------- */}
        {/* CARTOON DIGITAL INTERACTIVE whiteBOARD CONTROLS FLOATER */}
        {/* EXACT COMPILATION OF THE SPECIFIED IMAGE AT THE BOTTOM */}
        {/* ---------------------------------------------------- */}
        {isDrawingMode && !showGridMode && (
          <div 
            ref={toolbarRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={{ 
              position: 'absolute',
              left: `${toolPos.x}px`,
              top: `${toolPos.y}px`,
              touchAction: 'none'
            }}
            className={`flex items-center bg-[#D3BDF2]/95 backdrop-blur-md rounded-full border-4 border-[#51105c] ${isDraggingTool ? 'm-shadow-lg cursor-grabbing scale-102 bg-[#bf9eff]/95' : 'm-shadow cursor-grab'} p-3 md:p-4 z-40 transition-transform duration-100 ease-out select-none`}
            id="draggable-cartoon-wheel-toolbar"
          >
            {/* DRAG HANDLE GUIDE SYMBOL (Leftmost helper) */}
            <div className="absolute -left-2 top-11 p-1 bg-[#8E24AA] rounded-full border-2 border-[#51105c] text-white hover:scale-110 pointer-events-none">
              <span className="text-[9px] font-black uppercase font-sans tracking-wide block py-1.5 px-0.5">M O V E</span>
            </div>

            {/* SECTION 1: Horizontal Color Pellet Pills (Exactly 6 colors requested) */}
            <div className="flex items-center gap-3 border-r-3 border-[#51105c]/35 pr-5 mr-4" id="wheel-colors">
              {userColors.map((col) => (
                <button
                  key={col.value}
                  type="button"
                  onClick={() => {
                    setBrushColor(col.value);
                    if (selectedTool === 'eraser') {
                      setSelectedTool('pencil');
                    }
                  }}
                  style={{ backgroundColor: col.value }}
                  className={`w-9 h-9 rounded-full border-3 border-[#51105c] cursor-pointer hover:scale-115 active:scale-95 transition-all ${
                    brushColor === col.value && selectedTool !== 'eraser'
                      ? 'ring-4 ring-pink-300 scale-110 shadow-md transform translate-y-[-2px]'
                      : 'shadow-inner'
                  }`}
                  title={`${col.label} 색상`}
                />
              ))}
            </div>

            {/* SECTION 2: Vertical Oval Stepper Thickness Panel */}
            <div className="flex items-center mr-5" id="wheel-thickness-oval">
              <div className="flex flex-col items-center bg-[#E5D7FA] border-3 border-[#51105c] rounded-3xl py-1 px-3.5 select-none w-14 relative" id="thickness-pill-premium">
                {/* Stepper Up button */}
                <button 
                  type="button"
                  onClick={() => setBrushWidth(prev => Math.min(22, prev + 1))}
                  className="text-xs text-[#51105c] hover:scale-120 hover:text-[#9c27b0] cursor-pointer font-black h-5 flex items-center justify-center"
                  id="thickness-up-arrow"
                >
                  <ChevronUp size={16} strokeWidth={3.5} />
                </button>
                
                {/* Sized Core number */}
                <span className="font-sans font-black text-2xl text-[#51105c] my-0.5 select-none leading-none">
                  {brushWidth}
                </span>
                
                {/* Stepper Down button */}
                <button 
                  type="button"
                  onClick={() => setBrushWidth(prev => Math.max(1, prev - 1))}
                  className="text-xs text-[#51105c] hover:scale-120 hover:text-[#9c27b0] cursor-pointer font-black h-5 flex items-center justify-center"
                  id="thickness-down-arrow"
                >
                  <ChevronDown size={16} strokeWidth={3.5} />
                </button>
              </div>
            </div>

            {/* SECTION 3: Large Royal Circle Wheel (As requested with surrounding widgets) */}
            <div className="relative w-28 h-28 flex items-center justify-center rounded-full bg-[#BFA3F0] border-4 border-[#51105c]" id="wheel-radial-box">
              
              {/* Core representational central trigger shape */}
              <button 
                type="button"
                className="w-16 h-16 rounded-full bg-[#673AB7] hover:bg-[#51105c] border-3 border-[#51105c] flex items-center justify-center text-white text-3xl transition-transform active:scale-95 shadow-md m-shadow-sm select-none cursor-pointer z-10"
                title={`현재 대표 도구: ${selectedTool}`}
              >
                {getCentralToolIcon()}
              </button>

              {/* Outside Radial Tool: Thin Pencil (Top) */}
              <button
                type="button"
                onClick={() => setSelectedTool('pencil')}
                className={`absolute top-0 flex items-center justify-center transition-all p-1 rounded-full cursor-pointer border-2 bg-white border-[#51105c] ${
                  selectedTool === 'pencil' ? 'scale-120 bg-amber-200' : 'hover:scale-110'
                }`}
                style={{ transform: 'translate(0px, -11px)' }}
                title="연필"
              >
                ✏️
              </button>

              {/* Outside Radial Tool: Thick Marker Pen (Right) */}
              <button
                type="button"
                onClick={() => setSelectedTool('felt')}
                className={`absolute right-0 flex items-center justify-center transition-all p-1 rounded-full cursor-pointer border-2 bg-white border-[#51105c] ${
                  selectedTool === 'felt' ? 'scale-120 bg-amber-200' : 'hover:scale-110'
                }`}
                style={{ transform: 'translate(10px, 0px)' }}
                title="펜"
              >
                🖋️
              </button>

              {/* Outside Radial Tool: Eraser 🧼 (Bottom-Right) */}
              <button
                type="button"
                onClick={() => setSelectedTool('eraser')}
                className={`absolute flex items-center justify-center transition-all p-1 rounded-full cursor-pointer border-2 bg-white border-[#51105c] ${
                  selectedTool === 'eraser' ? 'scale-120 bg-emerald-200 font-sans' : 'hover:scale-110'
                }`}
                style={{ transform: 'translate(38px, 38px)' }}
                title="지우개"
              >
                🧼
              </button>

              {/* Outside Radial Tool: Bin Trashcan (Bottom) */}
              <button
                type="button"
                onClick={handleClearPage}
                className="absolute flex items-center justify-center transition-all p-1.5 rounded-full cursor-pointer border-2 bg-red-100 hover:bg-red-200 hover:scale-115 border-[#51105c]"
                style={{ transform: 'translate(0px, 44px)' }}
                title="현재 슬라이드 전체 지우기"
              >
                <Trash2 size={15} strokeWidth={2.5} className="text-red-700" />
              </button>

              {/* Outside Radial Tool: Highlighter/Neon marker 🖍️ (Left or Top-Left as helper) */}
              <button
                type="button"
                onClick={() => setSelectedTool('highlighter')}
                className={`absolute flex items-center justify-center transition-all p-1 rounded-full cursor-pointer border-2 bg-white border-[#51105c] ${
                  selectedTool === 'highlighter' ? 'scale-120 bg-amber-200' : 'hover:scale-110'
                }`}
                style={{ transform: 'translate(-42px, -18px)' }}
                title="형광펜"
              >
                🖍️
              </button>

              {/* Outside Radial Tool: Back/Undo Helper */}
              <button
                type="button"
                onClick={handleUndo}
                className="absolute flex items-center justify-center transition-all p-1 rounded-full cursor-pointer border-2 bg-blue-100 hover:bg-blue-200 hover:scale-115 border-[#51105c]"
                style={{ transform: 'translate(-44px, 20px)' }}
                title="뒤로가기 되돌리기"
              >
                <Undo2 size={13} strokeWidth={3} className="text-blue-700" />
              </button>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
