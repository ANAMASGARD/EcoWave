'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Mic, MicOff, Volume2, Sparkles, Leaf, TrendingUp, Trophy, MessageCircle, AlertCircle } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { toast } from 'react-hot-toast';
import { getUserByEmail, createUser, getOrCreateUserProfile, getDailyCarbonFootprint } from '@/utils/db/actions';
import { formatCarbonEmission } from '@/lib/carbonCalculations';

export default function VoiceAssistantPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const [user, setUser] = useState<any>(null);
  const [vapi, setVapi] = useState<any>(null);
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const [dailyCarbon, setDailyCarbon] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize user
  useEffect(() => {
    const initUser = async () => {
      if (!isLoaded || !clerkUser?.emailAddresses?.[0]?.emailAddress) return;

      const email = clerkUser.emailAddresses[0].emailAddress;
      const name = clerkUser.fullName || 'User';

      let fetchedUser = await getUserByEmail(email);
      if (!fetchedUser) {
        fetchedUser = await createUser(email, name);
      }
      setUser(fetchedUser);

      if (fetchedUser) {
        await getOrCreateUserProfile(fetchedUser.id);
        const data = await getDailyCarbonFootprint(fetchedUser.id);
        setDailyCarbon(data.totalEmissions);
      }
    };
    initUser();
  }, [clerkUser, isLoaded]);

  // Initialize VAPI
  useEffect(() => {
    let vapiInstance: any = null;
    
    const initVapi = async () => {
      if (typeof window === 'undefined') return;

      const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
      if (!publicKey) return;

      try {
        const Vapi = (await import('@vapi-ai/web')).default;
        vapiInstance = new Vapi(publicKey);

        vapiInstance.on('call-start', () => {
          console.log('✅ Call started');
          setIsActive(true);
          setIsConnecting(false);
          setError(null);
          toast.success('Connected! Start speaking 🎤');
        });

        vapiInstance.on('call-end', () => {
          console.log('📞 Call ended');
          setIsActive(false);
          setIsConnecting(false);
          setIsSpeaking(false);
          setTranscript('');
          setVolumeLevel(0);
        });

        vapiInstance.on('speech-start', () => {
          setIsSpeaking(true);
        });

        vapiInstance.on('speech-end', () => {
          setIsSpeaking(false);
        });

        vapiInstance.on('volume-level', (level: number) => {
          setVolumeLevel(level);
        });

        vapiInstance.on('message', (msg: any) => {
          console.log('📨', msg.type);
          
          if (msg.type === 'transcript') {
            if (msg.transcriptType === 'final' && msg.transcript) {
              if (msg.role === 'user') {
                setMessages(prev => [...prev, { role: 'user', text: msg.transcript }]);
                setTranscript('');
              } else if (msg.role === 'assistant') {
                setMessages(prev => [...prev, { role: 'assistant', text: msg.transcript }]);
              }
            } else if (msg.transcriptType === 'partial' && msg.role === 'user') {
              setTranscript(msg.transcript);
            }
          }
          
          if (msg.type === 'conversation-update') {
            const msgs = msg.conversation || [];
            const lastMsg = msgs[msgs.length - 1];
            if (lastMsg?.role === 'assistant' && lastMsg.content) {
              // Check if we already have this message
              setMessages(prev => {
                const lastPrev = prev[prev.length - 1];
                if (lastPrev?.role === 'assistant' && lastPrev.text === lastMsg.content) {
                  return prev;
                }
                if (lastPrev?.role !== 'assistant') {
                  return [...prev, { role: 'assistant', text: lastMsg.content }];
                }
                return prev;
              });
            }
          }
        });

        vapiInstance.on('error', (err: any) => {
          console.error('❌ Error:', err);
          
          let errorMsg = 'Connection error';
          if (typeof err === 'string') errorMsg = err;
          else if (err?.errorMessage) errorMsg = err.errorMessage;
          else if (err?.message) errorMsg = err.message;
          
          if (errorMsg.includes('ejection') || errorMsg.includes('ended')) {
            errorMsg = 'Call ended unexpectedly. Please try again.';
          }
          
          setError(errorMsg);
          setIsConnecting(false);
          setIsActive(false);
          toast.error(errorMsg);
        });

        setVapi(vapiInstance);
        console.log('✅ VAPI ready');
      } catch (err) {
        console.error('Init error:', err);
      }
    };

    initVapi();
    return () => { if (vapiInstance) try { vapiInstance.stop(); } catch(e) {} };
  }, []);

  const startCall = useCallback(async () => {
    if (!vapi) {
      toast.error('Loading...');
      return;
    }

    setIsConnecting(true);
    setError(null);
    setMessages([]);
    setTranscript('');

    try {
      // Get mic permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
      if (!assistantId) throw new Error('Assistant not configured');
      
      console.log('🚀 Starting:', assistantId);
      await vapi.start(assistantId);
      
    } catch (err: any) {
      console.error('Start error:', err);
      setIsConnecting(false);
      
      let msg = 'Could not start';
      if (err.name === 'NotAllowedError') msg = 'Microphone blocked';
      else if (err.message) msg = err.message;
      
      setError(msg);
      toast.error(msg);
    }
  }, [vapi]);

  const endCall = useCallback(() => {
    if (vapi) try { vapi.stop(); } catch(e) {}
    setIsActive(false);
  }, [vapi]);

  const toggleCall = () => isActive ? endCall() : startCall();

  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
  const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 text-gray-800 dark:text-gray-200">🎤 Talk to Eco</h1>
        <p className="text-gray-600 dark:text-gray-400">Your AI sustainability companion</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-xl text-center">
          <Leaf className="h-6 w-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">{formatCarbonEmission(dailyCarbon)}</p>
          <p className="text-xs text-green-600 dark:text-green-400">Today</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl text-center">
          <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">5s</p>
          <p className="text-xs text-blue-600 dark:text-blue-400">Avg Log</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-xl text-center">
          <Trophy className="h-6 w-6 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">AI</p>
          <p className="text-xs text-purple-600 dark:text-purple-400">Voice</p>
        </div>
      </div>

      {/* Config warning */}
      {(!publicKey || !assistantId) && (
        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-yellow-600" />
            <div>
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">Setup Required</h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Add to <code className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">.env.local</code>:
              </p>
              <pre className="mt-2 text-xs bg-yellow-100 dark:bg-yellow-800/50 p-2 rounded">
{`NEXT_PUBLIC_VAPI_PUBLIC_KEY=...
NEXT_PUBLIC_VAPI_ASSISTANT_ID=...`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Main Interface */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Sparkles className="h-8 w-8" />
            <h2 className="text-2xl font-bold">Eco - Voice AI</h2>
          </div>
          <p className="text-green-100">
            {isConnecting ? '🔄 Connecting...' : isActive ? (isSpeaking ? '🔊 Speaking...' : '👂 Listening...') : '🎤 Tap to start'}
          </p>
          
          {/* Volume bar */}
          {isActive && (
            <div className="mt-3 h-2 bg-green-400/30 rounded-full overflow-hidden max-w-xs mx-auto">
              <div className="h-full bg-white transition-all duration-100" style={{ width: `${volumeLevel * 100}%` }} />
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="h-72 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-700/50">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg mb-3 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}
          
          {messages.length === 0 && !isActive && !error ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <MessageCircle className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-center">Press the button and say:<br/><span className="text-sm">"I drove 10km today"</span></p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl ${
                    msg.role === 'user' 
                      ? 'bg-blue-500 text-white rounded-br-sm' 
                      : 'bg-white dark:bg-gray-800 shadow rounded-bl-sm'
                  }`}>
                    {msg.role === 'assistant' && <span className="text-green-600 text-xs font-semibold block mb-1">🌱 Eco</span>}
                    <p className="text-sm">{msg.text}</p>
                  </div>
                </div>
              ))}
              
              {transcript && (
                <div className="flex justify-end">
                  <div className="max-w-[80%] p-3 rounded-2xl bg-blue-300 text-blue-900 rounded-br-sm opacity-70">
                    <p className="text-sm italic">{transcript}...</p>
                  </div>
                </div>
              )}
              
              {isActive && messages.length > 0 && !transcript && (
                <div className="flex justify-center py-2">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className={`w-1 rounded-full ${isSpeaking ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ height: `${8 + volumeLevel * 16}px`, transition: 'height 0.1s' }} />
                    ))}
                    <span className="ml-2 text-xs text-gray-500">{isSpeaking ? 'Speaking...' : 'Listening...'}</span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Button */}
        <div className="p-8 bg-white dark:bg-gray-800 flex flex-col items-center">
          <button
            onClick={toggleCall}
            disabled={isConnecting || !publicKey || !assistantId}
            className={`
              relative w-28 h-28 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center
              ${isConnecting ? 'bg-yellow-500 animate-pulse' : 
                !publicKey || !assistantId ? 'bg-gray-400 cursor-not-allowed' :
                isActive ? 'bg-red-500 hover:bg-red-600 scale-110' : 
                'bg-gradient-to-br from-green-500 to-emerald-600 hover:scale-105'}
            `}
          >
            {isConnecting ? (
              <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
            ) : isActive ? (
              <MicOff className="w-12 h-12 text-white" />
            ) : (
              <Mic className="w-12 h-12 text-white" />
            )}
            
            {isActive && <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-30" />}
            {isSpeaking && <Volume2 className="absolute -top-2 -right-2 w-7 h-7 text-white bg-green-500 rounded-full p-1 animate-bounce" />}
          </button>
          
          <p className="mt-4 text-gray-500 text-sm">
            {!publicKey || !assistantId ? 'Configure VAPI first' : isActive ? 'Tap to end' : 'Tap to talk'}
          </p>
        </div>

        {/* Prompts */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600">
          <p className="text-xs text-gray-500 mb-3 text-center">Try saying:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {["I drove 10km", "Had a burger", "Bought a shirt", "How am I doing?"].map((p, i) => (
              <span key={i} className="text-xs bg-white dark:bg-gray-800 px-3 py-1.5 rounded-full shadow-sm border border-gray-200 dark:border-gray-600">
                "{p}"
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="mt-8 bg-amber-50 dark:bg-amber-900/20 p-6 rounded-2xl border border-amber-200 dark:border-amber-700">
        <h3 className="font-semibold mb-3 text-amber-900 dark:text-amber-200">💡 Tips</h3>
        <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-300">
          <li>• Allow microphone when prompted</li>
          <li>• Speak clearly in a quiet environment</li>
          <li>• Wait for Eco to finish before responding</li>
          <li>• The first response may take ~2 seconds</li>
        </ul>
      </div>
    </div>
  );
}
