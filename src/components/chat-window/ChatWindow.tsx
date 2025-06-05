import React, { useState, useRef, useEffect } from "react";
import { sendMessageToGemini } from "../../api/openai";
import { useTheme } from "../../context/ThemeContext";
import ReactMarkdown from 'react-markdown';

interface Message {
  id: number;
  text: string;
  sender: "user" | "bot";
  timestamp: string;
}

type ChatCategory = "Люди" | "ИИ-ассистенты";
interface ChatMetaItem {
  name: string;
  category: ChatCategory;
}
type ChatMeta = Record<string, ChatMetaItem>;

function getHistoryFromLS(): Record<string, Message[]> {
  try {
    const raw = localStorage.getItem('chatHistory');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveHistoryToLS(history: Record<string, Message[]>) {
  localStorage.setItem('chatHistory', JSON.stringify(history));
}

function getMetaFromLS(): ChatMeta {
  try {
    const raw = localStorage.getItem('chatMeta');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function ChatWindow({ chatId }: { chatId?: string }) {
  const [chatHistory, setChatHistory] = useState<Record<string, Message[]>>(getHistoryFromLS());
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const { theme, toggleTheme } = useTheme();
  const [inputDisabled, setInputDisabled] = useState(false);

  const [isBotTyping, setIsBotTyping] = useState(false);

  // Получаем meta для текущего чата
  const meta = chatId ? getMetaFromLS()[chatId] : undefined;
  const isAI = meta?.category === 'ИИ-ассистенты';
  const isHuman = meta?.category === 'Люди';
  const avatar = isAI ? '🤖' : '🧑';
  const name = meta?.name || (isAI ? 'ИИ-ассистент' : 'Чат');

  // Подгружаем историю при смене chatId
  useEffect(() => {
    setChatHistory(getHistoryFromLS());
  }, [chatId]);

  // Скролл вниз при новых сообщениях
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, chatId]);

  const messages = chatId ? chatHistory[chatId] || [] : [];

  const sendMessage = async () => {
    if (!input.trim() || !chatId || inputDisabled) return;
    setInputDisabled(true);

    const userMsg: Message = {
      id: Date.now(),
      text: input,
      sender: "user",
      timestamp: new Date().toLocaleTimeString(),
    };

    const updated = {
      ...chatHistory,
      [chatId]: [...(chatHistory[chatId] || []), userMsg],
    };

    setChatHistory(updated);
    saveHistoryToLS(updated);
    window.dispatchEvent(new Event('chatHistoryChanged'));
    setInput("");

    if (isAI) {
      setIsBotTyping(true);
      try {
        const reply = await sendMessageToGemini(userMsg.text);
        const botMsg: Message = {
          id: Date.now() + 1,
          text: reply,
          sender: "bot",
          timestamp: new Date().toLocaleTimeString(),
        };
        const updatedBot = {
          ...updated,
          [chatId]: [...(updated[chatId] || []), botMsg],
        };
        setChatHistory(updatedBot);
        saveHistoryToLS(updatedBot);
        window.dispatchEvent(new Event('chatHistoryChanged'));
      } catch (error) {
        console.error('Failed to get response from Gemini:', error);
      } finally {
        setIsBotTyping(false);
        setInputDisabled(false);
      }
    } else if (isHuman) { // fake reply for human chat
      setIsBotTyping(true);
      setTimeout(() => {
        const botMsg: Message = {
          id: Date.now() + 1,
          text: `Привет! Я ${name}`,
          sender: "bot",
          timestamp: new Date().toLocaleTimeString(),
        };
        const updatedBot = {
          ...updated,
          [chatId]: [...(updated[chatId] || []), botMsg],
        };
        setChatHistory(updatedBot);
        saveHistoryToLS(updatedBot);
        window.dispatchEvent(new Event('chatHistoryChanged'));
        setIsBotTyping(false);
        setInputDisabled(false);
      }, 800);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`px-4 py-3 border-b flex justify-between items-center ${theme === 'dark' ? 'bg-[#22232B] border-[#23262F]' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-2">
          <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-400 text-white'}`}>{avatar}</span>
          <div>
            <div className={`font-semibold ${theme === 'dark' ? 'text-white' : ''}`}>{name}</div>
            <div className={`text-xs ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>Online</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-[#181A20]' : 'hover:bg-gray-100'}`}
            title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto px-4 py-2 space-y-2 ${theme === 'dark' ? 'bg-[#181A20]' : 'bg-gray-50'}`}>
        {messages.length === 0 && (
          <div className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} text-center mt-8`}>Нет сообщений</div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.sender === "bot" && (
              <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mr-2 ${theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-400 text-white'}`}>{avatar}</span>
            )}
            <div
              className={`max-w-sm p-2 rounded-xl shadow text-sm ${
                msg.sender === "user"
                  ? theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100'
                  : theme === 'dark' ? 'bg-[#22232B] text-gray-200' : 'bg-white'
              }`}
            >
              {msg.sender === "bot"
                ? <ReactMarkdown>{msg.text}</ReactMarkdown>
                : <div>{msg.text}</div>
              }
              <div className={`text-xs text-right mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}>{msg.timestamp}</div>
            </div>
            {msg.sender === "user" && (
              <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ml-2 ${theme === 'dark' ? 'bg-[#23262F] text-gray-300' : 'bg-gray-300 text-gray-600'}`}>🧑</span>
            )}
          </div>
        ))}
        {isBotTyping && (
          <div className="flex justify-start">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mr-2 ${theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-400 text-white'}`}>{avatar}</span>
            <div className={`max-w-sm p-2 rounded-xl shadow text-sm italic ${theme === 'dark' ? 'bg-[#22232B] text-gray-400' : 'bg-white text-gray-400'}`}>Печатает...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={`p-3 border-t flex gap-2 ${theme === 'dark' ? 'bg-[#22232B] border-[#23262F]' : 'bg-white border-gray-200'}`}>
        <textarea
          className={`flex-1 border rounded-xl px-3 py-2 resize-none ${theme === 'dark' ? 'bg-[#23262F] border-[#23262F] text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200'}`}
          rows={1}
          placeholder="Введите сообщение..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleInputKeyDown}
          disabled={!chatId}
        />
        <button
          className={`px-4 py-2 rounded-xl ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
          onClick={sendMessage}
          disabled={!chatId}
        >
          Отправить
        </button>
      </div>
    </div>
  );
}
  