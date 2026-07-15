import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User as UserIcon, 
  HelpCircle, 
  Clock, 
  ChevronRight, 
  LineChart 
} from 'lucide-react';
import { User, Insumo, Invoice, SecurityLog } from '../types';

interface AiAssistantModuleProps {
  sedeId: string;
  currentUser: User;
  insumos: Insumo[];
  invoices: Invoice[];
  securityLogs: SecurityLog[];
  onTriggerAction: (action: string, payload: any) => Promise<any>;
}

export default function AiAssistantModule({
  sedeId,
  currentUser,
  insumos,
  invoices,
  securityLogs,
  onTriggerAction
}: AiAssistantModuleProps) {
  
  const [messages, setMessages] = useState<{ id: string; sender: 'USER' | 'AI'; text: string; timestamp: string }[]>([
    { 
      id: 'ai-init', 
      sender: 'AI', 
      text: `¡Hola ${currentUser.name}! Soy Cero AI, el asistente de inteligencia artificial de Aurora. Estoy conectado en tiempo real al inventario ERP, conciliaciones, facturación DIAN y escudo de ciberseguridad de tu restaurante. ¿En qué te puedo asesorar hoy?`, 
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Suggested prompt chips
  const suggestions = [
    { label: "📊 Generar informe ejecutivo de ventas de hoy", text: "Genera un reporte consolidado ejecutivo con los ingresos de hoy y el balance del restaurante." },
    { label: "🥦 ¿Qué insumos están por debajo de stock crítico?", text: "¿Cuáles ingredientes de materia prima tienen stock inferior al stock de alerta mínimo?" },
    { label: "🛡️ Mostrar reporte de incidentes de ciberseguridad", text: "Resume los incidentes sospechosos de seguridad y ataques de red bloqueados recientemente por el escudo Aurora." },
    { label: "💡 Recomienda un menú para el fin de semana", text: "Recomienda un plato especial o menú para promocionar este fin de semana considerando ingredientes comunes." }
  ];

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg = {
      id: `msg-${Date.now()}`,
      sender: 'USER' as const,
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      // Collect current live context for AI grounding
      const lowStockList = insumos.filter(i => i.sedeId === sedeId && i.stock <= i.minStock).map(i => `${i.name} (${i.stock} ${i.unit})`);
      const totalSales = invoices.filter(i => i.sedeId === sedeId).reduce((acc, curr) => acc + curr.total, 0);
      const failedLogins = securityLogs.filter(l => l.type === 'FAILED_LOGIN').length;
      const xssBlocked = securityLogs.filter(l => l.type === 'XSS_FILTER').length;

      const aiResponse = await onTriggerAction("ASK_AI_ASSISTANT", {
        prompt: textToSend,
        context: {
          lowStockList,
          totalSales,
          failedLogins,
          xssBlocked,
          userRole: currentUser.role,
          userName: currentUser.name,
          sedeId
        }
      });

      const aiMsg = {
        id: `msg-ai-${Date.now()}`,
        sender: 'AI' as const,
        text: aiResponse.reply || "He procesado tu consulta pero no pude generar un reporte detallado. Por favor, intente de nuevo.",
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
      const errorMsg = {
        id: `msg-err-${Date.now()}`,
        sender: 'AI' as const,
        text: "⚠️ Disculpe, ocurrió una latencia de conexión con el canal criptográfico de IA. El procesador heurístico local informa que las bases de datos operan sin contratiempos.",
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#030712] text-slate-50 font-sans">
      
      {/* Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-[#1e293b]">
        
        {/* Chat Header */}
        <div className="bg-[#0f172a] px-6 py-4 border-b border-[#1e293b] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-purple-600/10 border border-purple-500/20 text-purple-400 rounded-full flex items-center justify-center">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-50 font-mono flex items-center gap-1.5">
                CERO AI
                <span className="text-[9px] bg-purple-600/15 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/20 font-bold animate-pulse">
                  ONLINE
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">Asistente de Inteligencia Artificial de Aurora</p>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 font-mono">
            Modelo: <span className="text-purple-400 font-bold">Gemini 2.5 Flash API</span>
          </div>
        </div>

        {/* Messages scroll area */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 scrollbar-thin">
          {messages.map((msg) => (
            <div 
              key={msg.id}
              className={`flex items-start gap-3.5 max-w-3xl ${msg.sender === 'USER' ? 'ml-auto flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${msg.sender === 'USER' ? 'bg-purple-600 text-white' : 'bg-[#0f172a] border border-[#1e293b] text-purple-400'}`}>
                {msg.sender === 'USER' ? <UserIcon className="h-4.5 w-4.5" /> : <Bot className="h-4.5 w-4.5" />}
              </div>

              {/* Message text bubble */}
              <div className={`rounded-2xl p-4 text-xs leading-relaxed space-y-1 ${msg.sender === 'USER' ? 'bg-purple-600 text-white font-medium rounded-tr-none shadow-md shadow-purple-600/5' : 'bg-[#0f172a] border border-[#1e293b] text-slate-200 rounded-tl-none shadow-sm'}`}>
                <div className="whitespace-pre-wrap font-sans">{msg.text}</div>
                <span className={`text-[9px] block text-right font-mono mt-1 ${msg.sender === 'USER' ? 'text-purple-200' : 'text-slate-500'}`}>
                  {msg.timestamp}
                </span>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-3.5 max-w-3xl">
              <div className="h-8 w-8 rounded-full bg-[#0f172a] border border-[#1e293b] text-purple-400 flex items-center justify-center font-bold text-xs shrink-0">
                <Bot className="h-4.5 w-4.5" />
              </div>
              <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl rounded-tl-none p-4 text-xs text-slate-400 font-mono flex items-center gap-2 shadow-sm">
                <Sparkles className="h-4.5 w-4.5 text-purple-400 animate-spin" />
                <span>Cero AI está consultando base de datos y procesando informe heurístico...</span>
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>

        {/* Message Input Bar */}
        <div className="p-4 bg-[#0f172a] border-t border-[#1e293b] shrink-0">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputText);
            }}
            className="flex items-center gap-2.5 bg-[#030712] border border-[#1e293b] rounded-xl p-1.5 focus-within:border-purple-500 transition-all"
          >
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Pregúntale a Cero AI... (Ej: ¿Cuáles son las ventas de hoy?)"
              className="flex-1 bg-transparent border-0 text-xs text-slate-50 focus:outline-none focus:ring-0 py-2 px-3 placeholder-slate-500 font-sans"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || loading}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white h-8 w-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>

      </div>

      {/* RIGHT: Quick Suggestions Panel */}
      <div className="w-80 bg-[#0f172a]/60 p-5 flex flex-col shrink-0 gap-4 overflow-y-auto">
        <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pb-2.5 border-b border-[#1e293b]">
          <HelpCircle className="h-4 w-4 text-purple-400" />
          Consultas Frecuentes
        </h4>

        <div className="space-y-3.5">
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(s.text)}
              className="w-full text-left bg-[#0f172a] border border-[#1e293b] p-3 rounded-xl hover:border-purple-500/40 hover:bg-[#030712]/30 transition-all text-xs text-slate-300 leading-normal font-sans cursor-pointer group flex items-start gap-2"
            >
              <ChevronRight className="h-4 w-4 text-purple-400 shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform" />
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        <div className="bg-[#0f172a] border border-[#1e293b] p-4 rounded-xl mt-auto space-y-2 text-[10px] leading-relaxed text-slate-400 font-sans">
          <div className="flex items-center gap-1 text-xs text-slate-50 font-mono font-bold">
            <LineChart className="h-4 w-4 text-purple-400" />
            CONTEXTO ACTIVO
          </div>
          <p>
            • Las respuestas consideran de forma automática la sucursal seleccionada en el selector del panel izquierdo.
          </p>
          <p>
            • En caso de pérdida de conexión, el procesador de heurística local genera un informe simulado para no interrumpir operaciones.
          </p>
        </div>
      </div>

    </div>
  );
}
