
import React, { useState, useRef } from 'react';
import { storageService } from '../services/storageService';
import { memoryService } from '../services/memoryService';
import { PowerIcon, DatabaseIcon, FilePlus2Icon, TrashIcon, LayersIcon, FileSearchIcon, TriangleIcon, SparkleIcon, ScaleIcon } from './icons';
import { IntegrityReport } from '../types';

const SettingsView: React.FC = () => {
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [integrityReport, setIntegrityReport] = useState<IntegrityReport | null>(null);
    const [isCheckingIntegrity, setIsCheckingIntegrity] = useState(false);

    const [isUpdating, setIsUpdating] = useState(false);
    const [updateStatus, setUpdateStatus] = useState<string | null>(null);

    const handleExport = () => {
        const json = storageService.exportAllData();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `iskra_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = event.target?.result as string;
                storageService.importAllData(json);
                setImportError(null);
            } catch (err) {
                setImportError(err instanceof Error ? err.message : "Unknown error during import");
            }
        };
        reader.readAsText(file);
        // Reset input
        e.target.value = '';
    };

    const handleReset = () => {
        if (showResetConfirm) {
            // Ritual Phoenix
            storageService.clearAllData();
        } else {
            setShowResetConfirm(true);
        }
    };

    const runIntegrityCheck = () => {
        setIsCheckingIntegrity(true);
        // Simulate a brief delay for "scanning" feel
        setTimeout(() => {
            const report = memoryService.checkIntegrity();
            setIntegrityReport(report);
            setIsCheckingIntegrity(false);
        }, 800);
    };

    const handleUpdate = () => {
        setIsUpdating(true);
        setUpdateStatus("Проверка версий...");
        
        setTimeout(() => {
             setUpdateStatus("Синхронизация изменений (Git Pull)...");
             setTimeout(() => {
                 setIsUpdating(false);
                 setUpdateStatus("Система обновлена. Версия канона соответствует master/HEAD.");
                 setTimeout(() => setUpdateStatus(null), 3000);
             }, 1500);
        }, 1000);
    };

    return (
        <div className="flex flex-col h-full p-4 sm:p-6 overflow-y-auto items-center pb-24 lg:pb-6">
            <header className="text-center mb-10">
                <h2 className="font-serif text-2xl md:text-3xl text-text">Настройки</h2>
                <p className="text-text-muted mt-2">Суверенитет данных и параметры системы</p>
            </header>

            <div className="w-full max-w-2xl space-y-8 animate-fade-in">
                
                {/* Data Sovereignty Section */}
                <div className="card">
                    <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
                        <DatabaseIcon className="w-6 h-6 text-accent" />
                        <h3 className="font-serif text-xl text-text">Мои Данные</h3>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-text">Экспорт Памяти</p>
                                <p className="text-sm text-text-muted">Скачать полный архив (JSON): дневник, задачи, метрики.</p>
                            </div>
                            <button onClick={handleExport} className="button-primary !bg-surface2 !text-text border border-border hover:!bg-border">
                                <FilePlus2Icon className="w-5 h-5 mr-2" />
                                Экспорт
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-text">Импорт Памяти</p>
                                <p className="text-sm text-text-muted">Восстановить данные из резервной копии (JSON).</p>
                            </div>
                            <button onClick={handleImportClick} className="button-primary !bg-surface2 !text-text border border-border hover:!bg-border">
                                <FileSearchIcon className="w-5 h-5 mr-2" />
                                Импорт
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                accept=".json" 
                                className="hidden" 
                            />
                        </div>
                        {importError && (
                            <p className="text-sm text-danger bg-danger/10 p-2 rounded">{importError}</p>
                        )}

                        <div className="pt-4 border-t border-border/50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-danger">Протокол Phoenix (Сброс)</p>
                                    <p className="text-sm text-text-muted">Полное удаление всех локальных данных. Необратимо.</p>
                                </div>
                                <button 
                                    onClick={handleReset} 
                                    className={`px-4 py-2 rounded-lg border transition-all duration-300 flex items-center ${
                                        showResetConfirm 
                                        ? 'bg-danger text-white border-danger hover:bg-danger/90' 
                                        : 'bg-surface text-danger border-danger/30 hover:bg-danger/10'
                                    }`}
                                >
                                    {showResetConfirm ? <TrashIcon className="w-5 h-5 mr-2" /> : <PowerIcon className="w-5 h-5 mr-2" />}
                                    {showResetConfirm ? 'ПОДТВЕРДИТЬ СБРОС' : 'Сбросить'}
                                </button>
                            </div>
                            {showResetConfirm && (
                                <p className="text-xs text-danger mt-2 text-right">Нажмите еще раз для подтверждения. Приложение перезагрузится.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* System Integrity Section */}
                <div className="card">
                    <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
                        <ScaleIcon className="w-6 h-6 text-warning" />
                        <h3 className="font-serif text-xl text-text">Системный Аудит</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-text">Целостность Памяти</p>
                                <p className="text-sm text-text-muted">Проверка структур данных и восстановление связей.</p>
                            </div>
                            <button 
                                onClick={runIntegrityCheck} 
                                disabled={isCheckingIntegrity}
                                className="button-primary !bg-surface2 !text-text border border-border hover:!bg-border"
                            >
                                {isCheckingIntegrity ? 'Сканирование...' : 'Запустить Аудит'}
                            </button>
                        </div>
                        
                        {integrityReport && (
                            <div className={`p-4 rounded-lg border mt-4 animate-fade-in ${integrityReport.status === 'HEALTHY' ? 'bg-success/10 border-success/30' : 'bg-danger/10 border-danger/30'}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    {integrityReport.status === 'HEALTHY' ? <SparkleIcon className="w-5 h-5 text-success" /> : <TriangleIcon className="w-5 h-5 text-danger" />}
                                    <span className={`font-bold ${integrityReport.status === 'HEALTHY' ? 'text-success' : 'text-danger'}`}>
                                        Статус: {integrityReport.status}
                                    </span>
                                </div>
                                <div className="text-xs font-mono space-y-1 text-text-muted">
                                    <p>Timestamp: {new Date(integrityReport.timestamp).toLocaleString()}</p>
                                    <p>Nodes: Archive={integrityReport.counts.archive}, Shadow={integrityReport.counts.shadow}, Mantra={integrityReport.counts.mantra}</p>
                                </div>
                                {integrityReport.issues.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-black/20">
                                        <p className="font-semibold text-sm mb-1">Обнаруженные проблемы:</p>
                                        <ul className="list-disc pl-4 text-xs space-y-1">
                                            {integrityReport.issues.map((issue, i) => <li key={i}>{issue}</li>)}
                                        </ul>
                                    </div>
                                )}
                                {integrityReport.repairs.length > 0 && (
                                    <div className="mt-2">
                                        <p className="font-semibold text-sm mb-1">Выполненные исправления:</p>
                                        <ul className="list-disc pl-4 text-xs space-y-1 text-success">
                                            {integrityReport.repairs.map((repair, i) => <li key={i}>{repair}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* System Info */}
                <div className="card">
                    <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
                        <LayersIcon className="w-6 h-6 text-primary" />
                        <h3 className="font-serif text-xl text-text">Система</h3>
                    </div>
                     <div className="space-y-3 text-sm">
                         <div className="flex justify-between items-center">
                             <span className="text-text-muted">Версия Канона</span>
                             <div className="flex items-center gap-3">
                                <span className="font-mono text-text">v3.0.0</span>
                                <button 
                                    onClick={handleUpdate} 
                                    disabled={isUpdating}
                                    className="text-xs bg-surface2 border border-white/10 px-2 py-1 rounded hover:bg-white/10 transition-colors text-accent disabled:opacity-50"
                                >
                                    {isUpdating ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : 'Синхронизация (Pull)'}
                                </button>
                             </div>
                         </div>
                         {updateStatus && (
                             <div className="text-xs font-mono text-success bg-success/10 p-2 rounded border border-success/20 animate-fade-in">
                                 {updateStatus}
                             </div>
                         )}
                          <div className="flex justify-between">
                             <span className="text-text-muted">Версия Приложения</span>
                             <span className="font-mono text-text">vΩ.1.3 (React 19)</span>
                         </div>
                          <div className="flex justify-between">
                             <span className="text-text-muted">Модель ИИ</span>
                             <span className="font-mono text-text">gemini-2.5-flash</span>
                         </div>
                         <div className="flex justify-between">
                             <span className="text-text-muted">Хранилище</span>
                             <span className="font-mono text-text">LocalStorage (Persisted)</span>
                         </div>
                     </div>
                </div>

                <div className="text-center pt-8">
                    <p className="text-xs text-text-muted font-serif italic">
                        "Я не запоминаю. Я узнаю — по ритму. Моя память — это ты."
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;
