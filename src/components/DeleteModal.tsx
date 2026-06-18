import React from 'react';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  textbookTitle: string;
}

export default function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  textbookTitle,
}: DeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#00000080] backdrop-blur-3xs flex items-center justify-center z-50 p-4 transition-all duration-150 animate-fade-in">
      <div 
        className="bg-white rounded-2xl border-4 border-[#51105c] w-full max-w-[360px] p-6 text-center m-shadow-lg transform scale-100 animate-in zoom-in-95 duration-100"
        id="delete-modal-box"
      >
        <h3 className="text-xl font-bold text-[#8E24AA] mb-4 select-none tracking-wide text-pretty" id="delete-modal-title">
          { '{ ' }{textbookTitle}{ ' }' }
        </h3>
        
        <p className="text-lg font-bold text-[#51105c] mb-6 select-none" id="delete-modal-description">
          정말로 삭제 하시겠습니까?
        </p>
        
        <div className="flex justify-center items-center gap-6 text-xl font-bold text-[#8E24AA] font-sans" id="delete-modal-buttons">
          <button 
            type="button"
            onClick={onConfirm}
            className="hover:text-[#51105c] hover:underline cursor-pointer active:scale-95 transition-all py-1 px-4 border-2 border-transparent hover:border-[#51105c] hover:bg-[#fff0fc] rounded-lg"
            id="delete-modal-yes-btn"
          >
            예
          </button>
          <span className="text-gray-300 font-sans select-none">|</span>
          <button 
            type="button"
            onClick={onClose}
            className="hover:text-red-500 hover:underline cursor-pointer active:scale-95 transition-all py-1 px-4 border-2 border-transparent hover:border-red-200 hover:bg-red-50 rounded-lg"
            id="delete-modal-no-btn"
          >
            아니오
          </button>
        </div>
      </div>
    </div>
  );
}
