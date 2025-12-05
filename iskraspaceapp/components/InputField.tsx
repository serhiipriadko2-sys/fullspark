
import React, { useState, useRef, KeyboardEvent } from 'react';
import Loader from './Loader';
import { ChevronRightIcon, FilePlus2Icon, XIcon } from './icons';
import { soundService } from '../services/soundService';

interface InputFieldProps {
  onQuery: (query: string, image?: string) => void;
  isLoading: boolean;
}

const InputField: React.FC<InputFieldProps> = ({ onQuery, isLoading }) => {
  const [value, setValue] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if ((value.trim() || selectedImage) && !isLoading) {
      onQuery(value, selectedImage || undefined);
      setValue('');
      setSelectedImage(null);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setSelectedImage(reader.result as string);
              soundService.playClick();
          };
          reader.readAsDataURL(file);
      }
      // Reset input so same file can be selected again if needed
      e.target.value = '';
  };

  const clearImage = () => {
      setSelectedImage(null);
  };

  return (
    <div className="flex flex-col w-full">
        {selectedImage && (
            <div className="relative w-20 h-20 mb-2 ml-4 group">
                <img src={selectedImage} alt="Selected" className="w-full h-full object-cover rounded-lg border border-white/20" />
                <button 
                    onClick={clearImage}
                    className="absolute -top-2 -right-2 bg-surface border border-white/10 rounded-full p-1 text-text-muted hover:text-text shadow-lg"
                >
                    <XIcon className="w-3 h-3" />
                </button>
            </div>
        )}
        
        <div className="relative flex items-center">
            <input 
                type="file" 
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
            />
            
            <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute left-3 p-2 rounded-full text-text-muted hover:bg-white/5 hover:text-accent transition-colors"
                title="Добавить изображение"
            >
                <FilePlus2Icon className="w-5 h-5" />
            </button>

            <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Отправь сигнал..."
                disabled={isLoading}
                rows={1}
                className="w-full resize-none bg-transparent p-3 lg:p-4 pl-14 pr-14 text-text placeholder:text-text-muted/50 focus:outline-none font-serif text-base lg:text-lg max-h-32 min-h-[48px] lg:min-h-[56px]"
            />
            
            <button
                onClick={handleSubmit}
                disabled={isLoading || (!value.trim() && !selectedImage)}
                className={`absolute right-2 p-3 lg:p-2 rounded-full transition-all duration-200 active:scale-95 ${
                    (value.trim() || selectedImage) && !isLoading 
                    ? 'bg-primary text-black shadow-glow-ember' 
                    : 'bg-white/5 text-text-muted cursor-not-allowed'
                }`}
                aria-label="Send message"
            >
                {isLoading ? <div className="scale-75"><Loader /></div> : <ChevronRightIcon className="w-5 h-5" />}
            </button>
        </div>
    </div>
  );
};

export default InputField;
