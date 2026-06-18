export interface DrawingStroke {
  id: string; // unique stroke id
  tool: 'pencil' | 'felt' | 'highlighter' | 'eraser';
  color: string;
  width: number;
  points: { x: number; y: number }[];
}

export interface TextbookPage {
  pageNumber: number;
  strokes: DrawingStroke[];
  notes?: string;
}

export interface Textbook {
  id: string;
  title: string;
  description: string;
  coverImage: string | null; // Base64 encoding of uploaded cover or null
  startPage: number;
  endPage: number;
  createdAt: number;
  pages: { [key: number]: DrawingStroke[] }; // Maps pageNumber to active strokes
  pageImages?: { [key: number]: string }; // Maps pageNumber to background PDF page base64 images
}
