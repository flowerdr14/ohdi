import React, { useState, useEffect } from 'react';
import { Textbook } from './types';
import TextbookModal from './components/TextbookModal';
import DeleteModal from './components/DeleteModal';
import DrawCanvas from './components/DrawCanvas';
import { 
  Search, 
  Plus, 
  X, 
  Pencil, 
  LogOut, 
  XCircle, 
  BookOpen, 
  Download, 
  Upload,
  Info
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'OHDI_TEXTBOOKS_STORAGE';

// Native default beautifully-themed textbooks to showcase highboard functionalities
const INITIAL_BOOKS: Textbook[] = [
  {
    id: 'book-1',
    title: '초등 국어 3-1학기',
    description: '따라쓰기 연습 단원 및 한글 맞춤법 기초 판서용 국어 교안입니다.',
    coverImage: null,
    startPage: 1,
    endPage: 8,
    createdAt: Date.now() - 172800000,
    pages: {}
  },
  {
    id: 'book-2',
    title: '미술 실습 입문',
    description: '명도, 채도, 삼원색 조화 기법 설명 및 크로키 스케치 연습.',
    coverImage: null,
    startPage: 1,
    endPage: 12,
    createdAt: Date.now() - 86400000,
    pages: {}
  },
  {
    id: 'book-3',
    title: '과학 생태계 구조',
    description: '먹이 사슬 관계도 드로잉 및 자연 생리 환경 조사 도구입니다.',
    coverImage: null,
    startPage: 1,
    endPage: 6,
    createdAt: Date.now() - 10000,
    pages: {}
  }
];

export default function App() {
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTextbook, setActiveTextbook] = useState<Textbook | null>(null);
  
  // Interactive mode trackers
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Modals system state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [textbookToEdit, setTextbookToEdit] = useState<Textbook | null>(null);
  const [textbookToDelete, setTextbookToDelete] = useState<Textbook | null>(null);

  // Load from database on startup
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        setTextbooks(JSON.parse(saved));
      } catch (e) {
        console.error("Local storage stale, falling back to clean assets", e);
        setTextbooks(INITIAL_BOOKS);
      }
    } else {
      setTextbooks(INITIAL_BOOKS);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_BOOKS));
    }
  }, []);

  const saveToStorage = (updatedList: Textbook[]) => {
    setTextbooks(updatedList);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
  };

  // Create or Update Textbook from user modal actions
  const handleSaveTextbook = (formData: Omit<Textbook, 'id' | 'createdAt' | 'pages'> & { pageImages?: { [key: number]: string } }) => {
    if (textbookToEdit) {
      // Preserve existing doodles and strokes, update titles and boundaries
      const updated = textbooks.map((book) => {
        if (book.id === textbookToEdit.id) {
          return {
            ...book,
            title: formData.title,
            description: formData.description,
            coverImage: formData.coverImage,
            startPage: formData.startPage,
            endPage: formData.endPage,
            pageImages: formData.pageImages || book.pageImages,
          };
        }
        return book;
      });
      saveToStorage(updated);
      setTextbookToEdit(null);
      setIsEditMode(false);
      alert("교재 정보가 수정되었습니다!");
    } else {
      // Pure new creation + dynamic drawings registry
      const newBook: Textbook = {
        id: 'book-' + Math.random().toString(36).substring(2, 9),
        title: formData.title,
        description: formData.description,
        coverImage: formData.coverImage,
        startPage: formData.startPage,
        endPage: formData.endPage,
        createdAt: Date.now(),
        pages: {},
        pageImages: formData.pageImages
      };
      
      const updated = [newBook, ...textbooks];
      saveToStorage(updated);
      alert("새 교재 교안이 라이브러리에 저장되었습니다! [열기]를 눌러 수업을 시작해 보세요.");
    }
  };

  const handleConfirmDelete = () => {
    if (textbookToDelete) {
      const updated = textbooks.filter(book => book.id !== textbookToDelete.id);
      saveToStorage(updated);
      setTextbookToDelete(null);
      setIsDeleteMode(false);
      alert("해당 교재가 스마트 삭제되었습니다.");
    }
  };

  const filteredTextbooks = textbooks.filter(book => {
    return book.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
           book.description.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleJSONImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const imported: Textbook = JSON.parse(reader.result as string);
          if (imported.title && typeof imported.startPage === 'number') {
            imported.id = 'imported-' + Math.random().toString(36).substring(2, 9);
            const list = [imported, ...textbooks];
            saveToStorage(list);
            alert(`📥 [${imported.title}] 판서 데이터를 성공적으로 불렀습니다!`);
          } else {
            alert("유효하지 않은 판서 파일 형식입니다.");
          }
        } catch (err) {
          alert("JSON 데이터를 분석하는 과정에서 오류가 발생했습니다.");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleExitApp = () => {
    const confirmExit = confirm(
      "OHDI(오디) 인터랙티브 보드를 종료하시겠습니까?\n모든 데이터는 브라우저 내부 보관함에 영구 보관됩니다."
    );
    if (confirmExit) {
      alert("판서 교안 프로그램이 성공적으로 보존되었습니다 ✏️🎨");
    }
  };

  if (activeTextbook) {
    return (
      <DrawCanvas 
        textbook={activeTextbook}
        onExit={() => {
          // Instantly sync list and route back to lobby
          const savedList = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (savedList) {
            setTextbooks(JSON.parse(savedList));
          }
          setActiveTextbook(null);
        }}
        onUpdateTextbook={(updatedBook) => {
          const updatedList = textbooks.map(b => b.id === updatedBook.id ? updatedBook : b);
          saveToStorage(updatedList);
          setActiveTextbook(updatedBook);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#ECA1E0]" id="lobby-root">
      
      {/* 1. Header Banner - Logo to the Left! */}
      <header className="bg-white/80 backdrop-blur-md border-b-4 border-[#51105c] p-6 text-left selection:bg-purple-900 m-shadow-sm shrink-0" id="lobby-header">
        <div className="max-w-[1440px] mx-auto w-full flex flex-col sm:flex-row sm:items-baseline gap-2">
          <h1 className="text-4xl font-black text-[#51105c] tracking-tight stroke-white" id="main-brand-title">
            OHDI (오디)
          </h1>
          <p className="text-[#8E24AA] font-mono text-xs sm:text-sm font-black tracking-wider" id="main-brand-sub">
            On Hyperboard Document Interactiveboard
          </p>
        </div>
      </header>

      {/* 2. Main Lobby Content layout splitting Side Menu and Grid */}
      <div className="flex-1 flex flex-col md:flex-row p-6 gap-6 overflow-hidden max-w-[1440px] mx-auto w-full" id="lobby-body">
        
        {/* SIDE BAR BUTTONS AREA */}
        <aside className="w-full md:w-64 flex flex-col gap-4 select-none shrink-0" id="lobby-sidebar">
          
          {/* A. 교재 찾기 Search Bar Container */}
          <div className="relative" id="search-input-wrapper">
            <input 
              type="text"
              placeholder="교재 찾기"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#E2A5E1] border-3 border-[#51105c] rounded-full py-3 pl-5 pr-12 text-[#51105c] font-bold placeholder-[#51105c]/60 text-lg focus:outline-hidden focus:ring-2 focus:ring-[#8E24AA] m-shadow-sm transition-all"
              id="lobby-search-input"
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-[#51105c]" size={22} strokeWidth={3} />
          </div>

          <span className="w-full h-1 bg-[#51105c]/10 rounded-full my-1"></span>

          {/* B. Action Buttons */}
          <button
            type="button"
            onClick={() => {
              setTextbookToEdit(null);
              setIsCreateModalOpen(true);
            }}
            className="w-full bg-[#E2A5E1] hover:bg-white active:translate-y-1 text-[#51105c] font-black text-xl py-3.5 px-6 rounded-full border-3 border-[#51105c] flex items-center gap-3 m-shadow transition-all cursor-pointer select-none"
            id="btn-create-textbook"
          >
            <Plus className="text-[#51105c]" size={26} strokeWidth={3.5} />
            <span>교재/PDF 생성</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsDeleteMode(!isDeleteMode);
              setIsEditMode(false);
            }}
            className={`w-full font-black text-xl py-3.5 px-6 rounded-full border-3 border-[#51105c] flex items-center gap-3 m-shadow transition-all cursor-pointer select-none ${
              isDeleteMode 
                ? 'bg-red-500 text-white animate-pulse shadow-inner' 
                : 'bg-[#E2A5E1] hover:bg-white text-[#51105c]'
            }`}
            id="btn-toggle-delete"
          >
            <X className={isDeleteMode ? "text-white" : "text-[#51105c]"} size={26} strokeWidth={3.5} />
            <span>교재삭제</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsEditMode(!isEditMode);
              setIsDeleteMode(false);
            }}
            className={`w-full font-black text-xl py-3.5 px-6 rounded-full border-3 border-[#51105c] flex items-center gap-3 m-shadow transition-all cursor-pointer select-none relative ${
              isEditMode 
                ? 'bg-amber-400 text-white' 
                : 'bg-[#E2A5E1] hover:bg-white text-[#51105c]'
            }`}
            id="btn-toggle-edit"
          >
            <Pencil className={isEditMode ? "text-white" : "text-[#51105c]"} size={20} strokeWidth={3} />
            <span>교재수정</span>
          </button>

          <button
            type="button"
            onClick={handleExitApp}
            className="w-full bg-[#E2A5E1] hover:bg-red-100 text-[#51105c] font-black text-xl py-3 px-6 rounded-full border-3 border-[#51105c] flex items-center gap-3 m-shadow transition-all cursor-pointer select-none mt-auto"
            id="btn-exit-app"
          >
            <XCircle className="text-red-500" size={24} strokeWidth={3} />
            <span>종료</span>
          </button>

          {/* C. Interactive Hints and import tools */}
          <div className="bg-white/95 p-4 border-3 border-[#51105c] rounded-2xl m-shadow-sm flex flex-col gap-1 text-[#51105c] mt-4 select-none font-sans">
            <span className="text-sm font-black flex items-center gap-1.5 text-[#8E24AA]">
              💡 오디 활용법
            </span>
            <p className="text-[11px] text-gray-500 font-sans leading-relaxed">
              PDF 교안 파일을 [교재/PDF 생성] 창에 끌어다 놓으시면 각 페이지가 가상 도화지 배경으로 자동 분할 등록됩니다!
            </p>
            
            {/* Local backup data restore */}
            <div className="mt-2 border-t border-gray-100 pt-2 flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-gray-400 block font-sans">백업 판서 가져오기:</span>
              <label className="bg-purple-55 hover:bg-purple-100 border-2 border-dashed border-[#51105c] rounded-lg p-1.5 text-center text-xs font-sans font-bold cursor-pointer block select-none text-[#51105c]">
                <Upload size={12} className="inline mr-1" /> 파일 선택 (.json)
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleJSONImport} 
                  className="hidden" 
                />
              </label>
            </div>
          </div>

        </aside>

        {/* MAIN TEXTBOOKS GRID (CENTER SECTION) */}
        <main className="flex-1 overflow-y-auto pr-2" id="lobby-grid-view">
          
          {isDeleteMode && (
            <div className="bg-red-50 border-3 border-red-400 text-red-700 p-3 px-4 rounded-xl font-bold mb-4 animate-fade-in select-none font-sans text-sm">
              ⚠️ <b>삭제 모드 활성화:</b> 아래 카드 하단의 <b>[삭제]</b>를 누르면 기기에 보존된 판서와 교재가 안전하게 삭제됩니다.
            </div>
          )}

          {isEditMode && (
            <div className="bg-amber-50 border-3 border-amber-400 text-amber-900 p-3 px-4 rounded-xl font-bold mb-4 animate-fade-in select-none font-sans text-sm">
              ℹ️ <b>수정 모드 활성화:</b> 카드 하단의 <b>[수정]</b>을 눌러 교재 구성, 제목, 시작/끝 슬라이드를 변경하세요.
            </div>
          )}

          {filteredTextbooks.length === 0 ? (
            <div className="bg-white/80 rounded-3xl border-4 border-dashed border-[#51105c]/30 p-12 text-center select-none my-12 animate-fade-in text-pretty" id="empty-state-notice">
              <BookOpen size={48} className="mx-auto text-[#8E24AA]/40 mb-3" />
              <p className="text-xl font-black text-[#8E24AA]">검색 결과 없음</p>
              <p className="text-sm font-sans text-gray-500 mt-1 font-semibold">왼쪽 사이드바의 <b>[교재/PDF 생성]</b> 버튼을 통해 문서를 복구하거나 올리세요.</p>
            </div>
          ) : (
            /* Cards collection exactly conforming to Screen 1 */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-1" id="textbooks-cards-grid">
              {filteredTextbooks.map((book) => {
                const totalPageDraws = (Object.values(book.pages) as any[]).reduce((sum: number, strokes: any) => sum + (strokes?.length || 0), 0);
                // Background cover logic
                const displayCover = book.pageImages?.[book.startPage] || book.coverImage;
                
                return (
                  <div 
                    key={book.id}
                    className="bg-[#C38BD4] rounded-3xl border-4 border-[#51105c] overflow-hidden m-shadow flex flex-col transition-all hover:scale-102 hover:bg-[#c995da]"
                  >
                    {/* A. Cover Display Rectangle */}
                    <div className="p-4" id={`book-header-${book.id}`}>
                      <div className="bg-white aspect-[3/4] border-4 border-[#51105c] rounded-xl overflow-hidden flex flex-col items-center justify-center relative select-none">
                        {displayCover ? (
                          <img 
                            src={displayCover} 
                            alt={book.title} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="text-center p-4">
                            <span className="text-3xl font-black text-[#51105c]/70 tracking-wide font-sans block mb-1">교재</span>
                            {totalPageDraws > 0 ? (
                              <span className="inline-block text-[11px] text-emerald-600 bg-emerald-50 rounded-full border border-emerald-200 px-2 mt-1 font-bold">
                                판서 {totalPageDraws}개 획 기록됨
                              </span>
                            ) : (
                              <span className="text-[11px] text-gray-400 font-sans block">빈 화이트보드 템플릿</span>
                            )}
                          </div>
                        )}
                        
                        {/* Page counts badge */}
                        <div className="absolute top-2 right-2 bg-[#8E24AA] text-white text-[11px] font-black px-2 py-0.5 border-2 border-[#51105c] rounded-md font-sans">
                          {book.startPage}~{book.endPage}p
                        </div>
                      </div>
                    </div>

                    {/* B. Title & Description Box in curly brackets `{ }` */}
                    <div className="px-4 text-center select-none" id={`book-info-${book.id}`}>
                      <h3 className="text-xl font-bold text-[#51105c] tracking-tight truncate px-1 font-sans">
                        { '{ ' }{book.title}{ ' }' }
                      </h3>
                      <p className="text-[#51105c] text-xs font-sans h-8 line-clamp-2 px-3 mt-1 text-gray-700/90 leading-snug">
                        {book.description || '(등록된 설명이 없습니다)'}
                      </p>
                    </div>

                    {/* C. Quick functional links: "열기 | 삭제 | 수정" */}
                    <div className="border-t-3 border-[#51105c]/30 mt-4 p-3 bg-white/40 flex justify-around items-center text-sm font-bold text-[#51105c]" id={`book-actions-${book.id}`}>
                      
                      <button 
                        type="button"
                        onClick={() => {
                          setActiveTextbook(book);
                        }}
                        className="hover:text-[#8E24AA] cursor-pointer hover:underline py-1 px-3 hover:bg-white/80 rounded-md transition-all font-sans font-black text-sm"
                        id={`action-open-${book.id}`}
                      >
                        열기
                      </button>
                      
                      <span className="text-[#51105c]/30 select-none">|</span>
                      
                      <button 
                        type="button"
                        onClick={() => {
                          setTextbookToDelete(book);
                        }}
                        className="hover:text-red-600 cursor-pointer hover:underline py-1 px-3 hover:bg-white/80 rounded-md transition-all font-sans font-black text-sm"
                        id={`action-delete-${book.id}`}
                      >
                        삭제
                      </button>

                      <span className="text-[#51105c]/30 select-none">|</span>

                      <button 
                        type="button"
                        onClick={() => {
                          setTextbookToEdit(book);
                        }}
                        className="hover:text-amber-700 cursor-pointer hover:underline py-1 px-3 hover:bg-white/80 rounded-md transition-all font-sans font-black text-sm"
                        id={`action-edit-${book.id}`}
                      >
                        수정
                      </button>

                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </main>

      </div>

      {/* MODALS IN LOBBY */}
      <TextbookModal 
        isOpen={isCreateModalOpen || !!textbookToEdit}
        onClose={() => {
          setIsCreateModalOpen(false);
          setTextbookToEdit(null);
        }}
        onSave={handleSaveTextbook}
        textbookToEdit={textbookToEdit}
      />

      <DeleteModal 
        isOpen={!!textbookToDelete}
        onClose={() => setTextbookToDelete(null)}
        onConfirm={handleConfirmDelete}
        textbookTitle={textbookToDelete ? textbookToDelete.title : ''}
      />

    </div>
  );
}
