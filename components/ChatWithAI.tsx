
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { ChatMessage } from '../types'; // Import ChatMessage from types.ts

interface ChatWithAIProps {
  chatHistory: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  isProcessing: boolean;
  error?: string | null;
}

export const ChatWithAI: React.FC<ChatWithAIProps> = ({ chatHistory, onSendMessage, isProcessing, error }) => {
  const [inputMessage, setInputMessage] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() && !isProcessing) {
      await onSendMessage(inputMessage.trim());
      setInputMessage('');
    }
  };

  return (
    <div className="mt-8 p-4 sm:p-6 bg-slate-800/80 rounded-xl shadow-xl border border-slate-700/60">
      <h3 className="text-xl font-semibold text-teal-300 mb-4 flex items-center">
        <Bot className="w-6 h-6 mr-2 text-teal-400" />
        Edit with AI Assistant
      </h3>
      
      <div 
        ref={chatContainerRef} 
        className="h-64 sm:h-80 overflow-y-auto mb-4 p-3 bg-slate-850 rounded-lg border border-slate-700" // Removed custom-scrollbar, will use global
        aria-live="polite"
      >
        {chatHistory.length === 0 && (
          <p className="text-slate-500 text-center py-4">No messages yet. Type a command below to modify the extracted text. For example: "Make the first heading blue" or "Change 'Hello' to 'Hi' in the second paragraph."</p>
        )}
        {chatHistory.map((msg) => (
          <div key={msg.id} className={`mb-3 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[85%] p-2.5 rounded-lg shadow ${
                msg.sender === 'user' 
                  ? 'bg-sky-700/80 text-sky-50 rounded-br-none' 
                  : msg.sender === 'ai' 
                    ? 'bg-slate-700 text-slate-200 rounded-bl-none'
                    : 'bg-yellow-700/60 text-yellow-100 text-sm italic' // System message
              }`}
            >
              <div className="flex items-center mb-1 text-xs opacity-80">
                {msg.sender === 'user' && <User className="w-3 h-3 mr-1.5" />}
                {msg.sender === 'ai' && <Bot className="w-3 h-3 mr-1.5" />}
                {msg.sender === 'system' && <Bot className="w-3 h-3 mr-1.5 text-yellow-400" />}
                <span className="font-medium capitalize">{msg.sender === 'ai' ? 'AI Assistant' : msg.sender}</span>
                <span className="ml-2 text-slate-400">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
            </div>
          </div>
        ))}
        {isProcessing && chatHistory.length > 0 && chatHistory[chatHistory.length -1].sender === 'user' && (
           <div className="mb-3 flex justify-start">
             <div className="max-w-[80%] p-2.5 rounded-lg shadow bg-slate-700 text-slate-200 rounded-bl-none">
                <div className="flex items-center mb-1 text-xs opacity-80">
                    <Bot className="w-3 h-3 mr-1.5" />
                    <span className="font-medium capitalize">AI Assistant</span>
                </div>
                <div className="flex items-center text-sm">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin text-teal-400" />
                    <span>Processing your request...</span>
                </div>
             </div>
           </div>
        )}
      </div>

      {error && (
        <div className="mb-3 p-2.5 bg-rose-800/50 text-rose-200 rounded-md text-sm border border-rose-700">
          <strong>Assistant Error:</strong> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 sm:gap-3">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={isProcessing ? "AI is thinking..." : "e.g., Make the first heading blue"}
          className="flex-grow p-2.5 bg-slate-700/80 border border-slate-600 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none placeholder-slate-400 text-slate-100 disabled:opacity-60 transition-shadow focus:shadow-lg"
          disabled={isProcessing}
          aria-label="Chat input for AI editing commands"
        />
        <button
          type="submit"
          disabled={isProcessing || !inputMessage.trim()}
          className="px-3 py-2 sm:px-4 sm:py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-150 ease-in-out shadow-md hover:shadow-lg"
          aria-label="Send command to AI"
        >
          {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          <span className="ml-0 sm:ml-2 hidden xxs:inline">{isProcessing ? "Sending..." : "Send"}</span>
        </button>
      </form>
    </div>
  );
};
