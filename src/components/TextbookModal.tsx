import React, { useState, useEffect, useRef } from 'react';
import { Textbook } from '../types';
import { X, Upload, FileUp, Loader2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Assign public CDN worker to avoid bundling path resolution errors in the sandbox
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;

interface TextbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (textbookData: Omit<Textbook, 'id' | 'createdAt' | 'pages'> & { pageImages?: { [key: number]: string } }) => void;
  textbookToEdit?: Textbook | null;
}

export default function TextbookModal({
  isOpen,
  onClose,
  onSave,
  textbookToEdit,
}: TextbookModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startPage, setStartPage] = useState<number>(1);
  const [endPage, setEndPage] = useState<number>(10);
  const [coverOption, setCoverOption] = useState<'upload' | 'firstPage'>('firstPage');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  
  // Custom multupage map
  const [pageImages, setPageImages] = useState<{ [key: number]: string }>({});
  
  // Loading & parsing animations
  const [isParsing, setIsParsing] = useState(false);
  const [parsingProgress, setParsingProgress] = useState(0);
  const [parsingStatus, setParsingStatus] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (textbookToEdit) {
      setTitle(textbookToEdit.title);
      setDescription(textbookToEdit.description);
      setStartPage(textbookToEdit.startPage);
      setEndPage(textbookToEdit.endPage);
      setCoverImage(textbookToEdit.coverImage);
      setCoverOption(textbookToEdit.coverImage ? 'upload' : 'firstPage');
      setPageImages(textbookToEdit.pageImages || {});
    } else {
      setTitle('');
      setDescription('');
      setStartPage(1);
      setEndPage(10);
      setCoverImage(null);
      setCoverOption('firstPage');
      setPageImages({});
    }
  }, [textbookToEdit, isOpen]);

  if (!isOpen) return null;

  // Process standard single images
  const processImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const resultStr = reader.result as string;
      setCoverImage(resultStr);
      setCoverOption('upload');
      
      // Make this single image act as Page 1
      setPageImages({ 1: resultStr });
      setStartPage(1);
      setEndPage(1); // 1~1
      
      // Try to autofill name if empty
      if (!title) {
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        setTitle(nameWithoutExt);
      }
    };
    reader.readAsDataURL(file);
  };

  // REAL VECTOR PDF PARSING to Base64 image slides!
  const processPDFFile = async (file: File) => {
    setIsParsing(true);
    setParsingProgress(5);
    setParsingStatus('PDF 파일을 읽어오는 중입니다...');
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      
      setParsingStatus(`총 ${numPages}페이지를 감지했습니다. 이미지 고해상도 변환 중...`);
      setParsingProgress(15);

      const parsedImages: { [key: number]: string } = {};
      
      // Iterate pages and render on an offscreen canvas
      for (let pNum = 1; pNum <= numPages; pNum++) {
        setParsingStatus(`페이지 변환 중: ${pNum} / ${numPages} 슬라이드...`);
        setParsingProgress(Math.floor(15 + (pNum / numPages) * 80));
        
        try {
          const page = await pdf.getPage(pNum);
          const viewport = page.getViewport({ scale: 1.5 }); // High-quality 1.5x scale
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (context) {
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({
              canvasContext: context,
              viewport: viewport,
              canvas: canvas
            } as any).promise;
            
            const qualityJpeg = canvas.toDataURL('image/jpeg', 0.85);
            parsedImages[pNum] = qualityJpeg;
          }
        } catch (pageErr) {
          console.error(`Error rendering page ${pNum}`, pageErr);
        }
      }

      setParsingProgress(100);
      setParsingStatus('변환 및 가상 스케치북 적재 완료!');
      
      // Update local states
      setPageImages(parsedImages);
      setStartPage(1);
      setEndPage(numPages); // AUTOMATIC 1 ~ END PAGE!
      
      // Title automatic filling
      const cleanTitle = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setTitle(cleanTitle);
      setDescription(`불러온 PDF교안: ${numPages}페이지로 구성됨.`);
      
      // Automatically assign page 1 as the Cover
      if (parsedImages[1]) {
        setCoverImage(parsedImages[1]);
        setCoverOption('upload');
      }

    } catch (err) {
      console.error("Failed to parse PDF", err);
      alert("PDF 파일을 해석하는 중 에러가 발생했습니다. 파일 형식을 확인해주세요.");
    } finally {
      // Small timeout for smooth UX transition
      setTimeout(() => {
        setIsParsing(false);
      }, 700);
    }
  };

  const handleGenericFile = (file: File) => {
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      processPDFFile(file);
    } else {
      processImageFile(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleGenericFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleGenericFile(file);
    }
  };

  const triggerFileInput = () => {
    if (isParsing) return;
    fileInputRef.current?.click();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("교재 제목을 입력해주세요!");
      return;
    }
    
    onSave({
      title,
      description,
      startPage,
      endPage: Math.max(startPage, endPage),
      coverImage: coverOption === 'upload' ? coverImage : null,
      pageImages: Object.keys(pageImages).length > 0 ? pageImages : undefined,
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#00000090] backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all duration-200">
      
      {/* 1. Normal State Content */}
      <div 
        className="bg-white rounded-3xl border-4 border-[#51105c] w-full max-w-[760px] overflow-hidden m-shadow-lg flex flex-col transform scale-100 animate-in fade-in zoom-in-95 duration-150"
        id="textbook-modal-container"
      >
        {/* Modal Header */}
        <div className="bg-[#8E24AA] border-b-4 border-[#51105c] p-4 text-white flex justify-between items-center px-6 selection:bg-purple-900">
          <h2 className="text-2xl font-bold tracking-wide" id="modal-title">
            {textbookToEdit ? '교재 수정하기' : '교재 생성 / PDF 불러오기'}
          </h2>
          <button 
            type="button" 
            onClick={onClose}
            className="text-white hover:text-pink-200 transition-colors cursor-pointer"
            id="close-modal-icon-btn"
          >
            <X size={28} strokeWidth={3} />
          </button>
        </div>

        {/* Modal Content - Two Column layout */}
        <div className="relative">
          {/* Active Parsing Loader Overlay */}
          {isParsing && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-xs flex flex-col justify-center items-center z-30 p-12 text-center select-none animate-fade-in">
              <Loader2 size={56} className="text-[#8E24AA] animate-spin mb-4" />
              <h3 className="text-2xl font-black text-[#51105c] mb-2">교재 가상 스펙트럼 변환 중</h3>
              <p className="text-sm font-sans text-gray-500 font-semibold mb-6">{parsingStatus}</p>
              
              {/* Cute progress slider */}
              <div className="w-full max-w-sm bg-gray-100 rounded-full h-4 border-2 border-[#51105c] overflow-hidden p-0.5" id="parsing-bar-outer">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${parsingProgress}%` }}
                ></div>
              </div>
              <span className="font-mono text-sm font-bold text-[#8E24AA] mt-2 block">{parsingProgress}% 완료</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6 md:p-8 flex flex-col gap-6 bg-white shrink-0">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
              
              {/* Left Column: Cover Preview Area */}
              <div className="md:col-span-2 flex flex-col gap-3">
                <span className="text-xl font-bold text-[#51105c]" id="cover-label-group">
                  [ 표 지 ]
                </span>
                
                <div 
                  onClick={triggerFileInput}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`relative aspect-[3/4] border-4 border-[#51105c] rounded-xl flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all duration-200 ${
                    dragActive ? 'bg-pink-100 border-dashed scale-98' : 'bg-gray-50 hover:bg-pink-50/50'
                  }`}
                  id="modal-cover-preview-box"
                >
                  {coverOption === 'upload' && coverImage ? (
                    <img 
                      src={coverImage} 
                      alt="Cover Preview" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-4 text-center select-none">
                      <span className="text-3xl font-black text-[#51105c]/70 mb-2">표지</span>
                      <span className="text-xs text-gray-500 font-sans leading-normal">
                        {coverOption === 'firstPage' ? '(교재 첫페이지가 표지로 사용됩니다)' : '클릭하여 이미지 업로드'}
                      </span>
                    </div>
                  )}
                  
                  {/* Upload overlay hover trigger */}
                  <div className="absolute inset-x-0 bottom-0 bg-[#51105c]/80 text-white py-1.5 text-center text-xs opacity-0 hover:opacity-100 transition-opacity flex justify-center items-center gap-1 font-sans">
                    <Upload size={12} /> 이미지 변경
                  </div>
                </div>
                
                {/* Radio buttons exactly matching the screens */}
                <div className="flex justify-around items-center gap-4 mt-2 font-sans text-[#51105c]" id="cover-selector-group">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-bold">
                    <input 
                      type="radio" 
                      name="coverType" 
                      checked={coverOption === 'upload'}
                      onChange={() => setCoverOption('upload')}
                      className="w-4 h-4 accent-[#9c27b0] cursor-pointer"
                    />
                    업로드하기
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-bold">
                    <input 
                      type="radio" 
                      name="coverType" 
                      checked={coverOption === 'firstPage'}
                      onChange={() => setCoverOption('firstPage')}
                      className="w-4 h-4 accent-[#9c27b0] cursor-pointer"
                    />
                    첫페이지로
                  </label>
                </div>
                
                {/* Hidden image/pdf input */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileInputChange} 
                  accept="image/*,application/pdf" 
                  className="hidden" 
                />
              </div>

              {/* Right Column: Textbook Details */}
              <div className="md:col-span-3 flex flex-col gap-4">
                <span className="text-xl font-bold text-[#51105c]" id="details-label-group">
                  [ 세 부 사 항 ]
                </span>
                
                {/* Title input */}
                <div className="flex items-center gap-2 mt-1">
                  <label className="text-lg font-bold text-[#51105c] w-16 shrink-0 select-none">
                    제 목 :
                  </label>
                  <input 
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="교재 제목을 입력하세요"
                    className="flex-1 border-2 border-[#51105c] p-2 px-3 rounded-lg font-sans font-medium focus:outline-hidden focus:ring-2 focus:ring-[#8E24AA] bg-[#fdf2fe] text-[#51105c]"
                    id="modal-input-title"
                  />
                </div>

                {/* Description input */}
                <div className="flex items-center gap-2">
                  <label className="text-lg font-bold text-[#51105c] w-16 shrink-0 select-none">
                    설 명 :
                  </label>
                  <input 
                    type="text" 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="설명을 입력하세요"
                    className="flex-1 border-2 border-[#51105c] p-2 px-3 rounded-lg font-sans font-medium focus:outline-hidden focus:ring-2 focus:ring-[#8E24AA] bg-[#fdf2fe] text-[#51105c]"
                    id="modal-input-desc"
                  />
                </div>

                {/* Page slider or limits */}
                <div className="flex flex-col gap-1">
                  <label className="text-md font-bold text-[#51105c] tracking-tight select-none">
                    불러올 페이지 범위:
                  </label>
                  <div className="flex items-center gap-2 font-mono">
                    <input 
                      type="number" 
                      min={1} 
                      max={100}
                      value={startPage}
                      onChange={(e) => setStartPage(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 border-2 border-[#51105c] p-2 rounded-lg font-bold text-center bg-[#fdf2fe] text-[#51105c]"
                      id="modal-input-start-page"
                    />
                    <span className="text-lg font-bold font-sans">~</span>
                    <input 
                      type="number" 
                      min={startPage} 
                      max={500}
                      value={endPage}
                      onChange={(e) => setEndPage(Math.max(startPage, parseInt(e.target.value) || startPage))}
                      className="w-20 border-2 border-[#51105c] p-2 rounded-lg font-bold text-center bg-[#fdf2fe] text-[#51105c]"
                      id="modal-input-end-page"
                    />
                    <span className="text-sm font-sans text-gray-500 font-semibold ml-2">페이지</span>
                  </div>
                </div>

                {/* Large Drag & Drop Box styled exactly like the PDF uploads */}
                <div 
                  onClick={triggerFileInput}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-4 border-[#51105c] rounded-xl flex-1 min-h-[140px] flex flex-col items-center justify-center p-4 text-center cursor-pointer select-none transition-all duration-150 ${
                    dragActive ? 'bg-purple-50' : 'bg-[#fff5ff] hover:bg-[#ffeaff]'
                  }`}
                  id="modal-large-drag-zone"
                >
                  <FileUp size={42} className="text-[#8E24AA] mb-2 stroke-[2.5]" />
                  <span className="text-xl font-bold text-[#8E24AA] leading-none mb-1">
                    교 재 / PDF 업 로 드
                  </span>
                  <p className="text-xs text-gray-500 font-sans px-4 mt-1 leading-normal">
                    교재 이미지 혹은 <b>PDF 파일</b>을 여기에 끌어놓거나 클릭하여 추가해주십시오. 자동으로 1페이지부터 끝까지 분할 설정됩니다.
                  </p>
                </div>

              </div>
            </div>

            {/* Complete button at the bottom */}
            <div className="flex justify-start pt-3 border-t-2 border-gray-100 mt-2">
              <button 
                type="submit"
                className="bg-[#8E24AA] hover:bg-[#51105c] active:translate-y-1 text-white text-xl font-bold px-8 py-2.5 rounded-xl border-3 border-[#51105c] m-shadow-sm transition-all cursor-pointer"
                id="modal-submit-btn"
              >
                완 료
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
