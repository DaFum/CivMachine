'use client';

import { useEffect, useRef, useState } from 'react';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function GameShell() {
  const installPrompt = useRef<InstallPromptEvent | null>(null);
  const gameFrame = useRef<HTMLIFrameElement | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js');
    }

    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      installPrompt.current = event as InstallPromptEvent;
      setCanInstall(true);
    };
    const onInstalled = () => {
      installPrompt.current = null;
      setCanInstall(false);
    };
    const onFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));

    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    document.addEventListener('fullscreenchange', onFullscreen);

    const readyFallback = window.setTimeout(() => setIsLoaded(true), 1800);
    let readyCheck: number | undefined;
    if (gameFrame.current?.contentDocument?.readyState === 'complete') {
      window.clearTimeout(readyFallback);
      readyCheck = window.setTimeout(() => setIsLoaded(true), 0);
    }

    return () => {
      window.clearTimeout(readyFallback);
      if (readyCheck !== undefined) window.clearTimeout(readyCheck);
      window.removeEventListener('beforeinstallprompt', onInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      document.removeEventListener('fullscreenchange', onFullscreen);
    };
  }, []);

  const install = async () => {
    const prompt = installPrompt.current;
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === 'accepted') {
      installPrompt.current = null;
      setCanInstall(false);
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
  };

  return (
    <main className="app-frame">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      {!isLoaded && (
        <div className="boot-screen" role="status" aria-live="polite">
          <span className="boot-sigil" aria-hidden="true">RCE</span>
          <p>REALITY NODE WIRD INITIALISIERT</p>
          <i aria-hidden="true" />
        </div>
      )}

      <iframe
        ref={gameFrame}
        className={`game-viewport${isLoaded ? ' is-ready' : ''}`}
        src="/game/index.html"
        title="Reality Consumption Engine"
        allow="fullscreen"
        onLoad={() => setIsLoaded(true)}
      />

      <nav className="app-controls" aria-label="App-Steuerung">
        {canInstall && (
          <button type="button" onClick={install} aria-label="App installieren">
            <span aria-hidden="true">↓</span>
            <b>INSTALLIEREN</b>
          </button>
        )}
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Vollbild verlassen' : 'Vollbild öffnen'}
        >
          <span aria-hidden="true">{isFullscreen ? '↙' : '↗'}</span>
          <b>{isFullscreen ? 'VERLASSEN' : 'VOLLBILD'}</b>
        </button>
      </nav>
    </main>
  );
}
