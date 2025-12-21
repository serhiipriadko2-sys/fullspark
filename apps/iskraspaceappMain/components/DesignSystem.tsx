
import React from 'react';
import Loader from './Loader';
import { SparkleIcon } from './icons';

const ColorSwatch: React.FC<{ name: string; hex: string; className: string }> = ({ name, hex, className }) => (
  <div className="flex items-center space-x-4">
    <div className={`h-16 w-16 rounded-lg border border-border ${className}`} />
    <div>
      <p className="font-semibold text-text">{name}</p>
      <p className="font-mono text-sm text-text-muted">{hex}</p>
    </div>
  </div>
);

const DesignSystem: React.FC = () => {
  return (
    <div className="h-full overflow-y-auto p-6 text-text animate-fade-in pb-24 lg:pb-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10">
          <h1 className="font-serif text-4xl font-bold text-text">Дизайн-система "Искра"</h1>
          <p className="mt-2 text-lg text-text-muted">Живой стайлгайд для компонентов и стилей Iskra Space.</p>
        </header>

        {/* Colors Section */}
        <section className="mb-12">
          <h2 className="font-serif text-3xl mb-6 border-b border-border pb-2">Палитра Цветов</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <ColorSwatch name="Primary (Ember)" hex="#FF7A00" className="bg-primary" />
            <ColorSwatch name="Accent (Electric)" hex="#4DA3FF" className="bg-accent" />
            <ColorSwatch name="Success" hex="#2ECC71" className="bg-success" />
            <ColorSwatch name="Warning" hex="#FFB020" className="bg-warning" />
            <ColorSwatch name="Danger" hex="#E5484D" className="bg-danger" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-6">
            <ColorSwatch name="Background" hex="#0B0F14" className="bg-bg" />
            <ColorSwatch name="Surface" hex="#0E131A" className="bg-surface" />
            <ColorSwatch name="Surface 2" hex="#121823" className="bg-surface2" />
            <ColorSwatch name="Border" hex="#1C2530" className="bg-border" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-6">
            <ColorSwatch name="Text" hex="#E6E8EB" className="bg-text" />
            <ColorSwatch name="Text Muted" hex="#A9B0B8" className="bg-text-muted" />
          </div>
        </section>

        {/* Typography Section */}
        <section className="mb-12">
          <h2 className="font-serif text-3xl mb-6 border-b border-border pb-2">Типографика</h2>
          <div className="space-y-4">
            <div>
                <p className="text-sm text-accent font-mono mb-1">Font Family: Sans (Inter)</p>
                <p className="font-sans text-xl">The quick brown fox jumps over the lazy dog.</p>
            </div>
             <div>
                <p className="text-sm text-accent font-mono mb-1">Font Family: Serif (Cormorant Garamond)</p>
                <p className="font-serif text-2xl">The quick brown fox jumps over the lazy dog.</p>
            </div>
             <div>
                <p className="text-sm text-accent font-mono mb-1">Font Family: Mono (JetBrains Mono)</p>
                <p className="font-mono text-lg">const iskra = "rhythm";</p>
            </div>
          </div>
        </section>

        {/* Components Section */}
        <section>
          <h2 className="font-serif text-3xl mb-6 border-b border-border pb-2">Компоненты</h2>
          <div className="space-y-8">
            {/* Buttons */}
            <div>
              <h3 className="text-xl font-serif mb-4">Кнопки</h3>
              <div className="flex items-center space-x-4">
                <button className="button-primary">Primary Button</button>
                <button className="button-primary" disabled>Disabled Button</button>
              </div>
            </div>

            {/* Cards */}
            <div>
              <h3 className="text-xl font-serif mb-4">Карточки</h3>
              <div className="card max-w-sm">
                <h4 className="font-serif text-xl text-text">Это .card компонент</h4>
                <p className="text-text-muted mt-2">Он используется для оборачивания контентных блоков, придавая им глубину и структуру.</p>
              </div>
            </div>

            {/* Inputs */}
            <div>
              <h3 className="text-xl font-serif mb-4">Поля ввода</h3>
              <div className="space-y-4 max-w-sm">
                 <input
                    type="text"
                    placeholder="Стандартное поле ввода"
                    className="w-full rounded-lg border border-border bg-surface p-3 text-text focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                />
                 <textarea
                    placeholder="Текстовая область"
                    rows={3}
                    className="w-full resize-none rounded-lg border border-border bg-surface p-3 text-text focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                />
              </div>
            </div>

            {/* Other Elements */}
            <div>
              <h3 className="text-xl font-serif mb-4">Другие элементы</h3>
              <div className="flex items-center space-x-8">
                <div>
                  <p className="text-text-muted mb-2">Загрузчик</p>
                  <Loader />
                </div>
                 <div>
                  <p className="text-text-muted mb-2">Иконка</p>
                  <SparkleIcon className="h-6 w-6 text-primary" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DesignSystem;
