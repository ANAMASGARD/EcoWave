'use client';

import { useEffect, useState, useCallback } from 'react';
import { Mic, MicOff, Volume2, X, Loader2, Sparkles } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { toast } from 'react-hot-toast';

// Dynamic import for Vapi to avoid SSR issues
let Vapi: any = null;
if (typeof window !== 'undefined') {
  import('@vapi-ai/web').then((module) => {
    Vapi = module.default;
  });
}

interface VoiceAssistantProps {
  userId?: number;
}

export default function VoiceAssistant({ userId }: VoiceAssistantProps) {
  const { user: clerkUser, isLoaded } = useUser();
  const [vapi, setVapi] = useState<any>(null);
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastResponse, setLastResponse] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize VAPI
  useEffect(() => {
    const initVapi = async () => {
      if (typeof window === 'undefined') return;
      
      const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
      
      if (!publicKey) {
        console.warn('VAPI public key not configured');
        return;
      }

      try {
        const VapiModule = (await import('@vapi-ai/web')).default;
        const vapiInstance = new VapiModule(publicKey);
        
        // Event listeners
        vapiInstance.on('call-start', () => {
          setIsActive(true);
          setIsConnecting(false);
          setShowPanel(true);
          setError(null);
          toast.success('Voice assistant activated! 🎤');
        });

        vapiInstance.on('call-end', () => {
          setIsActive(false);
          setIsConnecting(false);
          setIsSpeaking(false);
          setIsListening(false);
          setTranscript('');
        });

        vapiInstance.on('speech-start', () => {
          setIsSpeaking(true);
          setIsListening(false);
        });

        vapiInstance.on('speech-end', () => {
          setIsSpeaking(false);
        });

        vapiInstance.on('volume-level', (level: number) => {
          // Could use this for visual feedback
        });

        vapiInstance.on('message', (message: any) => {
          console.log('VAPI message:', message);
          
          if (message.type === 'transcript') {
            if (message.role === 'user') {
              setTranscript(message.transcript);
              setIsListening(true);
            } else if (message.role === 'assistant') {
              setLastResponse(message.transcript);
            }
          }
          
          if (message.type === 'function-call') {
            console.log('Function called:', message.functionCall);
          }
          
          if (message.type === 'function-call-result') {
            console.log('Function result:', message.result);
          }
        });

        vapiInstance.on('error', (error: any) => {
          console.error('VAPI Error:', error);
          setError(error.message || 'Voice connection error');
          setIsConnecting(false);
          toast.error('Voice assistant error. Please try again.');
        });

        setVapi(vapiInstance);
      } catch (err) {
        console.error('Failed to initialize VAPI:', err);
      }
    };

    initVapi();

    return () => {
      if (vapi) {
        vapi.stop();
      }
    };
  }, []);

  const toggleVoiceAssistant = useCallback(async () => {
    if (!vapi) {
      toast.error('Voice assistant not ready. Please wait...');
      return;
    }

    if (isActive) {
      vapi.stop();
      setShowPanel(false);
    } else {
      setIsConnecting(true);
      setError(null);
      
      try {
        const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
        
        if (assistantId) {
          // Use pre-configured assistant from VAPI dashboard
          await vapi.start(assistantId);
        } else {
          // Use inline configuration with simpler setup
          const assistantConfig = {
            name: "Eco",
            firstMessage: "Hey! I'm Eco, your sustainability buddy. Tell me about your day - any car rides, meals, or purchases you want to track?",
            transcriber: {
              provider: "deepgram",
              model: "nova-2",
              language: "en",
            },
            model: {
              provider: "openai",
              model: "gpt-4o-mini",
              temperature: 0.7,
              messages: [
                {
                  role: "system",
                  content: `You are EcoTrack's friendly AI sustainability coach named Eco. Help students log their carbon footprint activities naturally.

When a user mentions an activity (driving, eating, buying), acknowledge it, calculate the CO2, and confirm logging.

Emission factors:
- Car: 192g CO2 per km
- Bus: 89g CO2 per km
- Train: 41g CO2 per km  
- Bike/Walk: 0g
- Beef meal: 3500g CO2
- Chicken meal: 1500g CO2
- Vegetarian meal: 500g CO2
- New clothing: 5000g CO2 per item

Be friendly, encouraging, and concise (under 30 seconds). Use analogies. Never be preachy.

Example: User: "I drove 10km today"
You: "Got it! 10km by car is about 1.9kg of CO2 - like charging your phone 200 times! Taking the bus saves about 1kg. Keep tracking!"`
                }
              ],
            },
            voice: {
              provider: "playht",
              voiceId: "jennifer",
            },
          };

          console.log('Starting VAPI with inline config');
          await vapi.start(assistantConfig);
        }
      } catch (error: any) {
        console.error('Failed to start voice assistant:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        setIsConnecting(false);
        setError(error.message || 'Failed to connect');
        
        if (error.message?.includes('microphone')) {
          toast.error('Microphone access denied. Please allow permissions.');
        } else {
          toast.error('Could not start voice assistant. Please try again.');
        }
      }
    }
  }, [vapi, isActive, userId, clerkUser]);

  // Don't render if not loaded or no VAPI key
  if (!isLoaded || typeof window === 'undefined') {
    return null;
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
  if (!publicKey) {
    return null; // Don't show button if VAPI not configured
  }

  return (
    <>
      {/* Voice Assistant Panel */}
      {showPanel && (
        <div className="fixed bottom-24 right-6 z-50 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Sparkles className="w-6 h-6" />
                  {isActive && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-300 rounded-full animate-pulse" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold">Eco - Voice Assistant</h3>
                  <p className="text-xs text-green-100">
                    {isConnecting ? 'Connecting...' : isActive ? (isSpeaking ? 'Speaking...' : 'Listening...') : 'Tap mic to start'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (isActive) vapi?.stop();
                  setShowPanel(false);
                }}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 max-h-64 overflow-y-auto">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg mb-3 text-sm">
                {error}
              </div>
            )}

            {/* User transcript */}
            {transcript && (
              <div className="mb-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">You said:</p>
                <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 p-3 rounded-lg text-sm">
                  {transcript}
                </div>
              </div>
            )}

            {/* Assistant response */}
            {lastResponse && (
              <div className="mb-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Eco:</p>
                <div className="bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 p-3 rounded-lg text-sm">
                  {lastResponse}
                </div>
              </div>
            )}

            {/* Listening indicator */}
            {isActive && !transcript && !lastResponse && (
              <div className="flex items-center justify-center py-6">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`w-1 bg-green-500 rounded-full animate-pulse`}
                      style={{
                        height: `${Math.random() * 20 + 10}px`,
                        animationDelay: `${i * 0.1}s`,
                      }}
                    />
                  ))}
                </div>
                <p className="ml-3 text-sm text-gray-600 dark:text-gray-400">
                  {isSpeaking ? "I'm speaking..." : "I'm listening..."}
                </p>
              </div>
            )}

            {/* Quick prompts */}
            {!isActive && !isConnecting && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Try saying:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "I drove 10km today",
                    "Had chicken for lunch",
                    "How's my day looking?",
                    "Where am I on leaderboard?"
                  ].map((prompt, i) => (
                    <span
                      key={i}
                      className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full"
                    >
                      "{prompt}"
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer status */}
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              {isActive ? '🎤 Voice-to-carbon logging active' : 'Tap the mic button to start'}
            </p>
          </div>
        </div>
      )}

      {/* Floating Voice Button */}
      <button
        onClick={toggleVoiceAssistant}
        disabled={isConnecting}
        className={`
          fixed bottom-6 right-6 z-50
          w-16 h-16 rounded-full shadow-lg
          transition-all duration-300 ease-out
          flex items-center justify-center
          ${isConnecting ? 'bg-yellow-500 cursor-wait' : ''}
          ${isActive 
            ? 'bg-gradient-to-br from-green-500 to-emerald-600 scale-110 shadow-green-500/30 shadow-xl' 
            : 'bg-gradient-to-br from-green-600 to-emerald-700 hover:scale-105 hover:shadow-xl'
          }
        `}
        aria-label={isActive ? 'Stop voice assistant' : 'Start voice assistant'}
      >
        {isConnecting ? (
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        ) : isActive ? (
          <MicOff className="w-8 h-8 text-white" />
        ) : (
          <Mic className="w-8 h-8 text-white" />
        )}

        {/* Pulsing ring when active */}
        {isActive && (
          <>
            <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-30" />
            <span className="absolute inset-0 rounded-full bg-green-400 animate-pulse opacity-20" />
          </>
        )}

        {/* Speaking indicator */}
        {isSpeaking && (
          <div className="absolute -top-1 -right-1">
            <Volume2 className="w-5 h-5 text-white bg-green-500 rounded-full p-0.5 animate-bounce" />
          </div>
        )}
      </button>

      {/* Tooltip when not active */}
      {!isActive && !showPanel && (
        <div className="fixed bottom-24 right-6 z-40 pointer-events-none">
          <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg opacity-0 hover-target:opacity-100 transition-opacity">
            🎤 Talk to Eco
          </div>
        </div>
      )}
    </>
  );
}
