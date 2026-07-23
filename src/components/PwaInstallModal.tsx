import React from 'react';
import { 
  X, 
  Download, 
  Laptop, 
  Smartphone, 
  Share2, 
  PlusSquare, 
  HelpCircle, 
  ExternalLink, 
  AlertTriangle,
  Monitor
} from 'lucide-react';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
}

export default function PwaInstallModal({ isOpen, onClose, deferredPrompt }: PwaInstallModalProps) {
  if (!isOpen) return null;

  const isIframe = window.self !== window.top;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isDesktop = !isIOS && !isAndroid;

  const handleNativeInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('Installation outcome:', outcome);
      onClose();
    }
  };

  const handleOpenNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans text-[#fafafa]">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shrink-0 border border-slate-700 bg-slate-950 shadow-md">
              <img 
                src="/icon_512.png" 
                alt="Aurora Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.onerror = null;
                  target.src = '/icon_192.png';
                }}
              />
            </div>
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-100 font-mono flex items-center gap-1.5">
                Instalar Aurora <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded tracking-normal normal-case">PWA</span>
              </h4>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">Acceso nativo desde escritorio y móviles</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs leading-relaxed">
          
          {/* IFRAME WARNING BLOCK */}
          {isIframe && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-2xl space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-extrabold uppercase tracking-wider text-[11px] block">Visor de AI Studio Activo</span>
                  <p className="text-[11px] text-zinc-300 leading-normal">
                    Estás viendo la aplicación dentro de un cuadro incrustado (iframe). Por seguridad, los navegadores **bloquean** la instalación de aplicaciones PWA desde aquí.
                  </p>
                </div>
              </div>
              <div className="pt-1.5 flex justify-end">
                <button
                  onClick={handleOpenNewTab}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-[10px] font-mono transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ExternalLink className="h-3 w-3" />
                  ABRIR EN PESTAÑA NUEVA
                </button>
              </div>
            </div>
          )}

          {/* NATIVE TRIGGER IF PROMPT AVAILABLE */}
          {deferredPrompt && (
            <div className="p-5 bg-blue-600/10 border border-blue-500/25 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <span className="font-extrabold text-[11px] uppercase tracking-wider text-blue-400 block">Soporte Nativo Detectado</span>
                <p className="text-zinc-300 text-[11px]">Tu navegador es compatible con la instalación directa.</p>
              </div>
              <button
                onClick={handleNativeInstall}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs font-mono transition-colors cursor-pointer shrink-0 shadow-lg shadow-blue-900/30 flex items-center gap-1.5"
              >
                <Download className="h-4 w-4" />
                INSTALAR AHORA
              </button>
            </div>
          )}

          {/* DETAILED GUIDES GRID */}
          <div className="space-y-4">
            <span className="font-extrabold text-[10px] uppercase tracking-widest text-zinc-400 font-mono block border-b border-zinc-800 pb-1.5">
              Instrucciones por Plataforma:
            </span>

            {/* PC DESKTOP GUIDE */}
            <div className={`p-4 bg-zinc-950/40 border rounded-2xl space-y-3 transition-colors ${isDesktop ? 'border-blue-500/20 bg-blue-950/5' : 'border-zinc-850'}`}>
              <div className="flex items-center gap-2.5">
                <Laptop className={`h-4.5 w-4.5 ${isDesktop ? 'text-blue-400' : 'text-zinc-500'}`} />
                <span className="font-extrabold font-mono text-[11px] uppercase">Computadoras (Chrome, Edge, Brave, Opera)</span>
                {isDesktop && <span className="ml-auto text-[8px] bg-blue-500/10 text-blue-400 font-mono font-bold uppercase px-1.5 py-0.5 rounded">Recomendado aquí</span>}
              </div>
              <ul className="list-decimal pl-5 space-y-1.5 text-zinc-300 font-mono text-[10.5px]">
                <li>Asegúrate de que estás en una pestaña independiente (no en el editor de AI Studio).</li>
                <li>Mira a la derecha de la barra de direcciones de tu navegador, verás un icono de **pantalla con una flecha de descarga** <Monitor className="inline h-3 w-3 mx-1 text-blue-400" />.</li>
                <li>Haz clic en ese icono y confirma la instalación.</li>
                <li>O abre el menú de tres puntos <span className="font-bold">⋮</span> y selecciona <span className="text-white font-bold">"Instalar Aurora..."</span>.</li>
              </ul>
            </div>

            {/* MOBILE ANDROID GUIDE */}
            <div className={`p-4 bg-zinc-950/40 border rounded-2xl space-y-3 transition-colors ${isAndroid ? 'border-blue-500/20 bg-blue-950/5' : 'border-zinc-850'}`}>
              <div className="flex items-center gap-2.5">
                <Smartphone className={`h-4.5 w-4.5 ${isAndroid ? 'text-blue-400' : 'text-zinc-500'}`} />
                <span className="font-extrabold font-mono text-[11px] uppercase">Dispositivos Android (Chrome)</span>
                {isAndroid && <span className="ml-auto text-[8px] bg-blue-500/10 text-blue-400 font-mono font-bold uppercase px-1.5 py-0.5 rounded">Detectado</span>}
              </div>
              <ul className="list-decimal pl-5 space-y-1.5 text-zinc-300 font-mono text-[10.5px]">
                <li>Abre el menú de opciones del navegador (tres puntos <span className="font-bold">⋮</span> en la esquina superior derecha).</li>
                <li>Busca y presiona la opción <span className="text-white font-bold">"Instalar aplicación"</span> o <span className="text-white font-bold">"Agregar a la pantalla de inicio"</span>.</li>
                <li>Sigue las instrucciones en pantalla para crear un acceso directo en tu escritorio móvil como si fuera una app nativa.</li>
              </ul>
            </div>

            {/* MOBILE IOS APPLE GUIDE */}
            <div className={`p-4 bg-zinc-950/40 border rounded-2xl space-y-3 transition-colors ${isIOS ? 'border-blue-500/20 bg-blue-950/5' : 'border-zinc-850'}`}>
              <div className="flex items-center gap-2.5">
                <Smartphone className={`h-4.5 w-4.5 ${isIOS ? 'text-blue-400' : 'text-zinc-500'}`} />
                <span className="font-extrabold font-mono text-[11px] uppercase">Dispositivos iOS / Apple (Safari)</span>
                {isIOS && <span className="ml-auto text-[8px] bg-blue-500/10 text-blue-400 font-mono font-bold uppercase px-1.5 py-0.5 rounded">Detectado</span>}
              </div>
              <ul className="list-decimal pl-5 space-y-1.5 text-zinc-300 font-mono text-[10.5px]">
                <li>Abre el sitio web en el navegador <span className="text-white font-bold">Safari</span> (es obligatorio en iOS).</li>
                <li>Toca el botón <span className="text-white font-bold">"Compartir"</span> (icono de un cuadro con una flecha hacia arriba <Share2 className="inline h-3.5 w-3.5 text-blue-400" /> en la parte inferior).</li>
                <li>Desplázate hacia abajo y selecciona la opción <span className="text-white font-bold">"Agregar al inicio"</span> (<span className="text-zinc-400 font-bold">Add to Home Screen</span> <PlusSquare className="inline h-3.5 w-3.5 text-blue-400" />).</li>
              </ul>
            </div>

          </div>

          {/* HELP NOTE */}
          <div className="text-[10px] text-zinc-500 font-mono text-center flex items-center justify-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5 shrink-0" />
            <span>Las PWAs se ejecutan en segundo plano, sin marcos de navegador y con rendimiento optimizado.</span>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold cursor-pointer transition-colors"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
}
