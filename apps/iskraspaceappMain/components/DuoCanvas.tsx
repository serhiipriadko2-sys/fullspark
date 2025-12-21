import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { DuoCanvasNote } from '../types';
import { XIcon, PlusIcon } from './icons';

interface DuoCanvasProps {
  onClose: () => void;
}

const NOTE_COLORS = [
    'bg-yellow-800/20 border-yellow-500/30',
    'bg-blue-800/20 border-blue-500/30',
    'bg-green-800/20 border-green-500/30',
    'bg-pink-800/20 border-pink-500/30',
    'bg-purple-800/20 border-purple-500/30',
];

const DuoCanvas: React.FC<DuoCanvasProps> = ({ onClose }) => {
    const [notes, setNotes] = useState<DuoCanvasNote[]>([]);

    useEffect(() => {
        setNotes(storageService.getDuoCanvasNotes());
    }, []);

    useEffect(() => {
        storageService.saveDuoCanvasNotes(notes);
    }, [notes]);

    const addNote = () => {
        const newNote: DuoCanvasNote = {
            id: `note-${Date.now()}`,
            text: '',
            color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
        };
        setNotes(prev => [...prev, newNote]);
    };

    const deleteNote = (id: string) => {
        setNotes(prev => prev.filter(note => note.id !== id));
    };

    const updateNoteText = (id: string, text: string) => {
        setNotes(prev => prev.map(note => note.id === id ? { ...note, text } : note));
    };

    return (
        <div className="absolute inset-0 bg-bg/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="w-full h-full max-w-4xl max-h-[90vh] bg-surface border border-border rounded-2xl shadow-deep m-4 flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b border-border shrink-0">
                    <h2 className="font-serif text-2xl text-text">Общий Canvas</h2>
                    <div className="flex items-center space-x-4">
                        <button onClick={addNote} className="flex items-center space-x-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-black transition-colors hover:bg-primary/80">
                            <PlusIcon className="w-5 h-5" />
                            <span>Добавить Заметку</span>
                        </button>
                        <button onClick={onClose} className="text-text-muted hover:text-text">
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                </header>
                <main className="flex-grow p-6 overflow-y-auto">
                    <div className="flex flex-wrap gap-6">
                        {notes.map(note => (
                            <div key={note.id} className={`relative w-64 h-64 p-4 rounded-lg border shadow-soft group transition-transform hover:-translate-y-1 ${note.color}`}>
                                <textarea
                                    value={note.text}
                                    onChange={(e) => updateNoteText(note.id, e.target.value)}
                                    placeholder="Мысли, идеи, мечты..."
                                    className="w-full h-full bg-transparent resize-none text-text focus:outline-none font-serif text-lg"
                                />
                                <button onClick={() => deleteNote(note.id)} className="absolute top-2 right-2 p-1 rounded-full bg-black/30 text-text-muted opacity-0 group-hover:opacity-100 hover:text-text transition-opacity">
                                    <XIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                         {notes.length === 0 && (
                            <div className="w-full text-center py-20">
                                <p className="text-text-muted text-lg">Холст пуст.</p>
                                <p className="text-text-muted">Нажмите "Добавить Заметку", чтобы оставить сообщение.</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DuoCanvas;
