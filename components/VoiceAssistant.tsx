'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Mic, MicOff, Volume2, X, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { toast } from 'react-hot-toast';

export default function VoiceAssistant() {
  const { isLoaded } = useUser();
  const [vapi, setVapi] = useState<any>(null);
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [assistantMessage, setAssistantMessage] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);

  // Initialize VAPI
  useEffect(() => {
    let vapiInstance: any = null;
    
    const initVapi = async () => {
      if (typeof window === 'undefined') return;
      
      const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
      if (!publicKey) {
        console.warn('VAPI public key not set');
        return;
      }

      try {
        const Vapi = (await import('@vapi-ai/web')).default;
        vapiInstance = new Vapi(publicKey);
        
        // Call started successfully
        vapiInstance.on('call-start', () => {
          console.log('✅ Call started!');
          setIsActive(true);
          setIsConnecting(false);
          setError(null);
          toast.success('Connected! Start speaking 🎤');
        });

        // Call ended
        vapiInstance.on('call-end', () => {
          console.log('📞 Call ended');
          setIsActive(false);
          setIsConnecting(false);
          setIsSpeaking(false);
          setTranscript('');
          setAssistantMessage('');
          setVolumeLevel(0);
        });

        // Assistant started speaking
        vapiInstance.on('speech-start', () => {
          console.log('🔊 Assistant speaking');
          setIsSpeaking(true);
        });

        // Assistant stopped speaking
        vapiInstance.on('speech-end', () => {
          console.log('🔇 Assistant stopped');
          setIsSpeaking(false);
        });

        // Volume level (for visual feedback)
        vapiInstance.on('volume-level', (level: number) => {
          setVolumeLevel(level);
        });

        // Messages (transcripts)
        vapiInstance.on('message', (msg: any) => {
          console.log('📨 Message:', msg.type, msg);
          
          if (msg.type === 'transcript') {
            if (msg.role === 'user') {
              setTranscript(msg.transcript || '');
            } else if (msg.role === 'assistant') {
              setAssistantMessage(msg.transcript || '');
            }
          }
          
          // Handle conversation updates
          if (msg.type === 'conversation-update') {
            const lastMessage = msg.conversation?.[msg.conversation.length - 1];
            if (lastMessage?.role === 'assistant') {
              setAssistantMessage(lastMessage.content || '');
            }
          }
        });

        // Error handling
        vapiInstance.on('error', (err: any) => {
          console.error('❌ VAPI Error:', err);
          
          let errorMsg = 'Connection error';
          if (typeof err === 'string') {
            errorMsg = err;
          } else if (err?.errorMessage) {
            errorMsg = err.errorMessage;
          } else if (err?.message) {
            errorMsg = err.message;
          } else if (err?.error?.message) {
            errorMsg = err.error.message;
          }
          
          // Make error messages user-friendly
          if (errorMsg.includes('ejection') || errorMsg.includes('ended')) {
            errorMsg = 'Call ended. Try again or check VAPI dashboard.';
          }
          
          setError(errorMsg);
          setIsConnecting(false);
          setIsActive(false);
          toast.error(errorMsg);
        });

        setVapi(vapiInstance);
        console.log('✅ VAPI SDK initialized');
        
      } catch (err) {
        console.error('Failed to init VAPI:', err);
      }
    };

    initVapi();

    return () => {
      if (vapiInstance) {
        try {
          vapiInstance.stop();
        } catch (e) {}
      }
    };
  }, []);

  const startCall = useCallback(async () => {
    if (!vapi) {
      toast.error('Voice assistant loading...');
      return;
    }

    setIsConnecting(true);
    setError(null);
    setShowPanel(true);
    setTranscript('');
    setAssistantMessage('');

    try {
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
      
      if (!assistantId) {
        throw new Error('Assistant ID not configured');
      }
      
      console.log('🚀 Starting call with assistant:', assistantId);
      
      // Start the call with just the assistant ID
      // All configuration is in VAPI dashboard
      await vapi.start(assistantId);
      
    } catch (err: any) {
      console.error('Start error:', err);
      setIsConnecting(false);
      
      let errorMsg = 'Could not start';
      if (err.name === 'NotAllowedError') {
        errorMsg = 'Microphone blocked. Enable in browser settings.';
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
      toast.error(errorMsg);
    }
  }, [vapi]);

  const endCall = useCallback(() => {
    if (vapi) {
      try {
        vapi.stop();
      } catch (e) {
        console.error('Stop error:', e);
      }
    }
    setIsActive(false);
    setShowPanel(false);
  }, [vapi]);

  const toggleCall = useCallback(() => {
    if (isActive) {
      endCall();
    } else {
      startCall();
    }
  }, [isActive, startCall, endCall]);

  // Don't render until loaded
  if (!isLoaded || typeof window === 'undefined') return null;

  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
  const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
  
  if (!publicKey || !assistantId) return null;

  return (
    <>
      {/* Panel */}
      {showPanel && (
        <div className="fixed bottom-24 right-6 z-50 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6" />
                <div>
                  <h3 className="font-semibold">Eco - Voice AI</h3>
                  <p className="text-xs text-green-100">
                    {isConnecting ? '🔄 Connecting...' : 
                     isActive ? (isSpeaking ? '🔊 Speaking...' : '👂 Listening...') : 
                     '🎤 Ready'}
                  </p>
                </div>
              </div>
              <button onClick={endCall} className="p-1 hover:bg-white/20 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Volume indicator */}
            {isActive && (
              <div className="mt-2 h-1 bg-green-400/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white transition-all duration-100"
                  style={{ width: `${Math.min(volumeLevel * 100, 100)}%` }}
                />
              </div>
            )}
          </div>

          <div className="p-4 max-h-64 overflow-y-auto">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg mb-3 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {transcript && (
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-1">You:</p>
                <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 p-3 rounded-lg text-sm">
                  {transcript}
                </div>
              </div>
            )}

            {assistantMessage && (
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-1">Eco:</p>
                <div className="bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 p-3 rounded-lg text-sm">
                  {assistantMessage}
                </div>
              </div>
            )}

            {isActive && !transcript && !assistantMessage && !error && (
              <div className="text-center py-6 text-gray-500">
                <div className="flex justify-center gap-1 mb-2">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} 
                      className={`w-1 rounded-full ${isSpeaking ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ 
                        height: `${8 + volumeLevel * 20}px`,
                        transition: 'height 0.1s'
                      }} 
                    />
                  ))}
                </div>
                <p className="text-sm">{isSpeaking ? 'Eco is speaking...' : 'Listening...'}</p>
              </div>
            )}

            {!isActive && !isConnecting && !error && (
              <div className="text-center py-4 text-gray-500">
                <p className="text-sm mb-2">Try saying:</p>
                <p className="text-xs bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-full inline-block">
                  "I drove 10km today"
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={toggleCall}
        disabled={isConnecting}
        className={`
          fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full shadow-lg
          transition-all duration-300 flex items-center justify-center
          ${isConnecting ? 'bg-yellow-500 animate-pulse' : 
            isActive ? 'bg-red-500 hover:bg-red-600 scale-110' : 
            'bg-gradient-to-br from-green-500 to-emerald-600 hover:scale-105'}
        `}
      >
        {isConnecting ? (
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        ) : isActive ? (
          <MicOff className="w-8 h-8 text-white" />
        ) : (
          <Mic className="w-8 h-8 text-white" />
        )}

        {isActive && <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-30" />}
        
        {isSpeaking && (
          <Volume2 className="absolute -top-1 -right-1 w-5 h-5 text-white bg-green-500 rounded-full p-0.5 animate-bounce" />
        )}
      </button>
    </>
  );
}
