'use client';

import { useEffect, useState, useCallback } from 'react';
import { Mic, MicOff, Volume2, Sparkles, Leaf, TrendingUp, Trophy, MessageCircle } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { getUserByEmail, createUser, getOrCreateUserProfile, getDailyCarbonFootprint } from '@/utils/db/actions';
import { formatCarbonEmission } from '@/lib/carbonCalculations';

export default function VoiceAssistantPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const [user, setUser] = useState<{ id: number; email: string; name: string } | null>(null);
  const [vapi, setVapi] = useState<any>(null);
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const [dailyCarbon, setDailyCarbon] = useState(0);

  // Initialize user
  useEffect(() => {
    const initUser = async () => {
      if (!isLoaded) return;

      if (clerkUser?.emailAddresses?.[0]?.emailAddress) {
        const userEmail = clerkUser.emailAddresses[0].emailAddress;
        const name = clerkUser.fullName || clerkUser.firstName || 'Anonymous User';

        let fetchedUser = await getUserByEmail(userEmail);
        if (!fetchedUser) {
          fetchedUser = await createUser(userEmail, name);
        }
        setUser(fetchedUser);

        if (fetchedUser) {
          await getOrCreateUserProfile(fetchedUser.id);
          const dailyData = await getDailyCarbonFootprint(fetchedUser.id);
          setDailyCarbon(dailyData.totalEmissions);
        }
      }
    };

    initUser();
  }, [clerkUser, isLoaded]);

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

        vapiInstance.on('call-start', () => {
          setIsActive(true);
          setIsConnecting(false);
          toast.success('Connected to Eco! Start talking 🎤');
        });

        vapiInstance.on('call-end', () => {
          setIsActive(false);
          setIsConnecting(false);
          setIsSpeaking(false);
          setTranscript('');
        });

        vapiInstance.on('speech-start', () => {
          setIsSpeaking(true);
        });

        vapiInstance.on('speech-end', () => {
          setIsSpeaking(false);
        });

        vapiInstance.on('message', (message: any) => {
          if (message.type === 'transcript' && message.transcriptType === 'final') {
            if (message.role === 'user') {
              setMessages(prev => [...prev, { role: 'user', text: message.transcript }]);
              setTranscript('');
            } else if (message.role === 'assistant') {
              setMessages(prev => [...prev, { role: 'assistant', text: message.transcript }]);
            }
          } else if (message.type === 'transcript' && message.transcriptType === 'partial') {
            if (message.role === 'user') {
              setTranscript(message.transcript);
            }
          }
        });

        vapiInstance.on('error', (error: any) => {
          console.error('VAPI Error:', error);
          console.error('VAPI Error stringified:', JSON.stringify(error));
          setIsConnecting(false);
          
          // Provide more specific error message
          const errorMsg = error?.message || error?.error?.message || 'Connection error';
          if (errorMsg.includes('assistant')) {
            toast.error('Voice assistant not configured. Please create one in VAPI dashboard.');
          } else if (errorMsg.includes('api_key') || errorMsg.includes('unauthorized')) {
            toast.error('Invalid API key. Please check your VAPI configuration.');
          } else {
            toast.error(`Voice error: ${errorMsg}`);
          }
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
      toast.error('Voice assistant initializing. Please wait...');
      return;
    }

    if (isActive) {
      vapi.stop();
    } else {
      setIsConnecting(true);
      setMessages([]);

      try {
        // Check if we have a pre-configured assistant ID
        const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
        
        if (assistantId) {
          // Use pre-configured assistant from VAPI dashboard (recommended)
          console.log('Starting VAPI with assistant ID:', assistantId);
          await vapi.start(assistantId);
        } else {
          // Try inline configuration
          console.log('Starting VAPI with inline config (no assistant ID configured)');
          
          // Minimal configuration that works with VAPI Web SDK
          await vapi.start({
            transcriber: {
              provider: "deepgram",
              model: "nova-2",
              language: "en",
            },
            model: {
              provider: "openai",
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: "You are Eco, a friendly AI sustainability coach. Help users log carbon footprint activities. When they mention driving, eating meat, or shopping, calculate CO2 (car: 192g/km, beef meal: 3.5kg, chicken: 1.5kg, bus: 89g/km). Be brief and encouraging."
                }
              ],
            },
            voice: {
              provider: "playht",
              voiceId: "jennifer",
            },
            firstMessage: "Hey! I'm Eco. Tell me about your day - any car rides, meals, or purchases?",
          });
        }
      } catch (error: any) {
        console.error('Failed to start voice assistant:', error);
        console.error('Error type:', typeof error);
        console.error('Error keys:', Object.keys(error || {}));
        console.error('Error stringified:', JSON.stringify(error, null, 2));
        setIsConnecting(false);
        
        // More specific error messages
        const errorMessage = error?.message || error?.error?.message || '';
        if (errorMessage.includes('microphone') || errorMessage.includes('permission')) {
          toast.error('Microphone access denied. Please allow permissions in your browser.');
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          toast.error('Network error. Please check your internet connection.');
        } else if (errorMessage.includes('api') || errorMessage.includes('key') || errorMessage.includes('unauthorized')) {
          toast.error('API key issue. Please check your VAPI configuration.');
        } else {
          toast.error('Voice assistant error. Try creating an assistant at dashboard.vapi.ai');
        }
      }
    }
  }, [vapi, isActive, user, clerkUser]);

  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 text-gray-800 dark:text-gray-200">
          🎤 Talk to Eco
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Your AI sustainability companion - just talk naturally to log activities
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-xl text-center">
          <Leaf className="h-6 w-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">
            {formatCarbonEmission(dailyCarbon)}
          </p>
          <p className="text-xs text-green-600 dark:text-green-400">Today</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl text-center">
          <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">5s</p>
          <p className="text-xs text-blue-600 dark:text-blue-400">Avg Log Time</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-xl text-center">
          <Trophy className="h-6 w-6 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">Voice</p>
          <p className="text-xs text-purple-600 dark:text-purple-400">Powered</p>
        </div>
      </div>

      {/* Main Voice Interface */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Sparkles className="h-8 w-8" />
            <h2 className="text-2xl font-bold">Eco - Voice Assistant</h2>
          </div>
          <p className="text-green-100 text-sm">
            {isConnecting ? 'Connecting...' : isActive ? (isSpeaking ? '🔊 Eco is speaking...' : '👂 Listening...') : 'Tap the button to start'}
          </p>
        </div>

        {/* Conversation Area */}
        <div className="h-64 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-700/50">
          {messages.length === 0 && !isActive ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
              <MessageCircle className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-center">
                Start a conversation with Eco!<br />
                <span className="text-sm">Try: "I drove to campus today"</span>
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-blue-500 text-white rounded-br-sm'
                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm shadow'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <span className="text-green-600 dark:text-green-400 text-xs font-semibold block mb-1">Eco</span>
                    )}
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
            </div>
          )}
        </div>

        {/* Voice Button Area */}
        <div className="p-8 bg-white dark:bg-gray-800 flex flex-col items-center">
          {!publicKey ? (
            <div className="text-center text-gray-500 dark:text-gray-400">
              <p className="mb-2">Voice assistant not configured</p>
              <p className="text-sm">Add NEXT_PUBLIC_VAPI_PUBLIC_KEY to .env.local</p>
            </div>
          ) : (
            <>
              <button
                onClick={toggleVoiceAssistant}
                disabled={isConnecting}
                className={`
                  w-24 h-24 rounded-full shadow-lg
                  transition-all duration-300 ease-out
                  flex items-center justify-center
                  ${isConnecting ? 'bg-yellow-500 cursor-wait animate-pulse' : ''}
                  ${isActive
                    ? 'bg-gradient-to-br from-red-500 to-red-600 scale-110 shadow-red-500/30 shadow-xl'
                    : 'bg-gradient-to-br from-green-500 to-emerald-600 hover:scale-105 hover:shadow-xl'
                  }
                `}
              >
                {isConnecting ? (
                  <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
                ) : isActive ? (
                  <MicOff className="w-10 h-10 text-white" />
                ) : (
                  <Mic className="w-10 h-10 text-white" />
                )}

                {isActive && (
                  <>
                    <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-30" />
                  </>
                )}

                {isSpeaking && (
                  <div className="absolute -top-2 -right-2">
                    <Volume2 className="w-6 h-6 text-white bg-green-500 rounded-full p-1 animate-bounce" />
                  </div>
                )}
              </button>

              <p className="mt-4 text-gray-600 dark:text-gray-400 text-sm">
                {isActive ? 'Tap to end conversation' : 'Tap to start talking'}
              </p>
            </>
          )}
        </div>

        {/* Quick Prompts */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 text-center">Quick prompts to try:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              "I drove 10km today",
              "Had a burger for lunch",
              "Bought a new shirt",
              "How am I doing?",
              "Leaderboard position?"
            ].map((prompt, i) => (
              <span
                key={i}
                className="text-xs bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-full shadow-sm border border-gray-200 dark:border-gray-600"
              >
                "{prompt}"
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="mt-8 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 p-6 rounded-2xl border-2 border-amber-200 dark:border-amber-700">
        <h3 className="text-lg font-semibold mb-3 text-amber-900 dark:text-amber-200">
          💡 Voice Tips
        </h3>
        <ul className="space-y-2 text-sm text-amber-800 dark:text-amber-300">
          <li>• Speak naturally - "I took the bus to school today"</li>
          <li>• Include quantities - "Drove about 15 kilometers"</li>
          <li>• Ask questions - "Why is beef worse than chicken?"</li>
          <li>• Check progress - "How's my carbon footprint today?"</li>
          <li>• Works best in a quiet environment 🤫</li>
        </ul>
      </div>

      {/* Setup Instructions */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl border border-blue-200 dark:border-blue-700">
        <h3 className="text-lg font-semibold mb-3 text-blue-900 dark:text-blue-200">
          🔧 Setup Required
        </h3>
        <p className="text-sm text-blue-800 dark:text-blue-300 mb-3">
          To use voice assistant, you need to create an assistant in VAPI Dashboard:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-300">
          <li>Go to <a href="https://dashboard.vapi.ai" target="_blank" rel="noopener noreferrer" className="underline font-semibold">dashboard.vapi.ai</a></li>
          <li>Click "Create Assistant" → Use "Blank" template</li>
          <li>Set Model: OpenAI GPT-4o-mini</li>
          <li>Set Voice: PlayHT or any available voice</li>
          <li>Copy the Assistant ID</li>
          <li>Add to .env.local: <code className="bg-blue-200 dark:bg-blue-800 px-1 rounded">NEXT_PUBLIC_VAPI_ASSISTANT_ID=your_id</code></li>
          <li>Restart the dev server</li>
        </ol>
      </div>
    </div>
  );
}
