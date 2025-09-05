import React, { useRef, useState, useMemo, useEffect } from 'react';
import PillPhysics, { PillPhysicsHandles } from './components/PillPhysics';
import MainMenu from './components/MainMenu';

const CogIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const CloseIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);


const App: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pillPhysicsRef = useRef<PillPhysicsHandles>(null);

  const demos = useMemo(() => ({
    pills: {
      title: 'Физика Таблеток',
      description: 'Интерактивная 2D-симуляция физики. Используйте кнопки ниже или наклоняйте ваше устройство, чтобы играть с таблетками.',
      component: <PillPhysics ref={pillPhysicsRef} />,
      controls: [
        { label: 'Добавить еще', action: () => pillPhysicsRef.current?.add() },
        { label: 'Встряхнуть', action: () => pillPhysicsRef.current?.shake() },
        { label: 'Очистить', action: () => pillPhysicsRef.current?.clear() },
      ],
    },
  }), []);

  const currentDemo = activeDemo ? demos[activeDemo as keyof typeof demos] : null;

  useEffect(() => {
    const lockOrientation = async () => {
      try {
        // FIX: Cast screen.orientation to `any` to access the experimental `lock` method.
        // The `lock` property is not available on the standard `ScreenOrientation` type.
        if (screen.orientation && (screen.orientation as any).lock) {
          await (screen.orientation as any).lock(screen.orientation.type);
        }
      } catch (error) {
        console.warn('Screen orientation lock failed:', error);
      }
    };

    const unlockOrientation = () => {
      // FIX: Cast screen.orientation to `any` to access the experimental `unlock` method.
      if (screen.orientation && (screen.orientation as any).unlock) {
        (screen.orientation as any).unlock();
      }
    };

    if (currentDemo) {
      lockOrientation();
    } else {
      unlockOrientation();
    }

    return () => {
      unlockOrientation();
    };
  }, [currentDemo]);

  if (!currentDemo) {
    return <MainMenu onSelectDemo={setActiveDemo} />;
  }

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-gray-900 text-white">
      {currentDemo.component}
      <div className="absolute top-0 right-0 z-10 m-4 md:m-8 flex flex-col items-end gap-2">
        <button
          onClick={() => setIsMenuOpen(prev => !prev)}
          className="icon-button md:hidden"
          aria-label={isMenuOpen ? "Закрыть панель управления" : "Открыть панель управления"}
        >
          {isMenuOpen ? <CloseIcon /> : <CogIcon />}
        </button>
        <div 
          className={`
            ${isMenuOpen ? 'flex' : 'hidden'} md:flex 
            flex-col items-start text-left p-6 rounded-2xl shadow-2xl bg-black/40 
            backdrop-blur-lg border border-white/10 max-w-sm w-[calc(100vw-2rem)] sm:w-auto
          `}
        >
          <button onClick={() => setActiveDemo(null)} className="back-button mb-4">
            &larr; Назад в меню
          </button>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
            {currentDemo.title}
          </h1>
          <p className="text-sm text-gray-300 mb-4">
            {currentDemo.description}
          </p>
          <div className="flex flex-col items-stretch gap-3 w-full">
            {currentDemo.controls.map(control => (
               <button key={control.label} onClick={control.action} className="control-button">
                {control.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        .control-button {
          padding: 0.6rem 1.2rem;
          font-size: 0.9rem;
          font-weight: 600;
          text-align: center;
          color: white;
          background-color: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 0.5rem;
          backdrop-filter: blur(10px);
          transition: background-color 0.2s ease-in-out, transform 0.1s ease-in-out;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .control-button:hover {
          background-color: rgba(255, 255, 255, 0.2);
        }
        .control-button:active {
          transform: scale(0.97);
        }
        .back-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          font-size: 0.9rem;
          font-weight: 600;
          color: white;
          background-color: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 0.5rem;
          backdrop-filter: blur(10px);
          transition: background-color 0.2s ease-in-out, transform 0.1s ease-in-out;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          width: fit-content;
        }
        .back-button:hover {
          background-color: rgba(255, 255, 255, 0.2);
        }
        .back-button:active {
          transform: scale(0.97);
        }
        .icon-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 3rem;
          height: 3rem;
          color: white;
          background-color: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 9999px;
          backdrop-filter: blur(10px);
          transition: background-color 0.2s ease-in-out, transform 0.1s ease-in-out;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .icon-button:hover {
          background-color: rgba(255, 255, 255, 0.2);
        }
        .icon-button:active {
          transform: scale(0.95);
        }
        .icon-button svg {
            width: 1.5rem;
            height: 1.5rem;
        }
      `}</style>
    </main>
  );
};

export default App;