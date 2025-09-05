import React from 'react';

interface MainMenuProps {
  onSelectDemo: (demo: string) => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onSelectDemo }) => {
  return (
    <main className="w-screen h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
          Интерактивные Демо
        </h1>
        <p className="text-lg text-gray-300">Выберите демонстрацию, чтобы начать</p>
      </div>
      <div className="max-w-md w-full">
        <div 
          className="demo-card"
          onClick={() => onSelectDemo('pills')}
          role="button"
          tabIndex={0}
          aria-label="Запустить демо 'Физика Таблеток'"
        >
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-2 text-white">Физика Таблеток</h2>
            <p className="text-gray-400">
              Интерактивная 2D-симуляция физики таблеток. Добавляйте, встряхивайте и очищайте экран.
            </p>
          </div>
        </div>
        {/* New demo cards can be added here in the future */}
      </div>
      <style>{`
        .demo-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
          overflow: hidden;
        }
        .demo-card:hover {
          transform: translateY(-5px);
          background: rgba(255, 255, 255, 0.1);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
        }
        .demo-card:focus, .demo-card:focus-visible {
          outline: 2px solid #48dbfb;
          outline-offset: 2px;
        }
      `}</style>
    </main>
  );
};

export default MainMenu;