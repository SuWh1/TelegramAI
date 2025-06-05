// src/features/chat-list/ChatList.tsx
import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

interface Message {
  id: number;
  text: string;
  sender: "user" | "bot";
  timestamp: string;
}

type ChatHistory = Record<string, Message[]>;
type ChatCategory = "Люди" | "ИИ-ассистенты";
interface ChatMetaItem {
  name: string;
  category: ChatCategory;
}
type ChatMeta = Record<string, ChatMetaItem>;

function getHistoryFromLS(): ChatHistory {
  try {
    const raw = localStorage.getItem('chatHistory');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function getMetaFromLS(): ChatMeta {
  try {
    const raw = localStorage.getItem('chatMeta');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveMetaToLS(meta: ChatMeta) {
  localStorage.setItem('chatMeta', JSON.stringify(meta));
}

export function ChatList() {
  const [chatHistory, setChatHistory] = useState<ChatHistory>({});
  const [chatMeta, setChatMeta] = useState<ChatMeta>({});
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; category: ChatCategory | null }>({ open: false, category: null });
  const [draftName, setDraftName] = useState('');
  const navigate = useNavigate();
  const { theme } = useTheme();

  useEffect(() => {
    setChatHistory(getHistoryFromLS());
    setChatMeta(getMetaFromLS());
  }, []);

  useEffect(() => {
    const handler = () => setChatHistory(getHistoryFromLS());
    window.addEventListener('chatHistoryChanged', handler);
    return () => window.removeEventListener('chatHistoryChanged', handler);
  }, []);

  // Список чатов: только те, где есть сообщения или мета
  let chatIds = Array.from(new Set([
    ...Object.keys(chatHistory),
    ...Object.keys(chatMeta),
  ]));

  if (search.trim()) {
    chatIds = chatIds.filter(cid => {
      const meta = chatMeta[cid];
      return (  
        cid.toLowerCase().includes(search.trim().toLowerCase()) ||
        (meta && meta.name.toLowerCase().includes(search.trim().toLowerCase()))
      );
    });
  }

  // Группировка по категориям
  const grouped = {
    'Люди': chatIds.filter(cid => (chatMeta[cid]?.category ?? 'Люди') === 'Люди'),
    'ИИ-ассистенты': chatIds.filter(cid => chatMeta[cid]?.category === 'ИИ-ассистенты'),
  };

  function openModal(category: ChatCategory) {
    setDraftName('');
    setModal({ open: true, category });
  }

  function closeModal() {
    setModal({ open: false, category: null });
    setDraftName('');
  }

  function handleCreateChat() {
    const name = draftName.trim();
    if (!name || !modal.category) return;
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const newMeta: ChatMeta = { ...getMetaFromLS(), [id]: { name, category: modal.category } };
    saveMetaToLS(newMeta);
    setChatMeta(newMeta);
    closeModal();
    navigate(`/chat/${id}`);
  }

  const handleDeleteChat = (chatId: string) => {
    // Удаляем историю
    const history = getHistoryFromLS();
    delete history[chatId];
    localStorage.setItem('chatHistory', JSON.stringify(history));
    // Удаляем мету
    const meta = getMetaFromLS();
    delete meta[chatId];
    localStorage.setItem('chatMeta', JSON.stringify(meta));
    setChatHistory({ ...history });
    setChatMeta({ ...meta });
    window.dispatchEvent(new Event('chatHistoryChanged'));
    window.dispatchEvent(new Event('chatMetaChanged'));
    // Если мы находимся в этом чате — редирект на / (главную)
    if (window.location.pathname.endsWith(chatId)) {
      navigate('/');
    }
  };

  return (
    <div className={`flex flex-col h-full relative ${theme === 'dark' ? 'bg-[#22232B]' : ''}`}>
      {/* Модалка создания чата */}
      {modal.open && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center ${theme === 'dark' ? 'bg-black/60' : 'bg-white/40'} backdrop-blur-sm`}>
          <div className={`${theme === 'dark' ? 'bg-[#23262F] text-white' : 'bg-white'} rounded-lg shadow-lg p-6 w-80 flex flex-col gap-4`}>
            <div className="text-lg font-semibold text-center">
              {modal.category === 'Люди' ? 'Создать чат с человеком' : 'Создать чат с ИИ-ассистентом'}
            </div>
            <input
              className={`border rounded px-3 py-2 w-full ${theme === 'dark' ? 'bg-[#181A20] border-[#23262F] text-white placeholder-gray-400' : 'bg-white border-gray-300'}`}
              placeholder={modal.category === 'Люди' ? 'Имя чата (например, "Работа")' : 'Имя ИИ-ассистента'}
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleCreateChat(); }}
            />
            <div className="flex gap-2">
              <button
                className={`flex-1 py-2 ${theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'} rounded disabled:bg-blue-200`}
                onClick={handleCreateChat}
                disabled={!draftName.trim()}
              >Создать</button>
              <button
                className={`flex-1 py-2 ${theme === 'dark' ? 'bg-[#23262F] text-gray-300' : 'bg-gray-200 text-gray-700'} rounded`}
                onClick={closeModal}
              >Отмена</button>
            </div>
          </div>
        </div>
      )}
      {/* Поиск */}
      <div className="p-2">
        <input
          type="text"
          placeholder="Поиск чатов..."
          className={`w-full px-3 py-2 border rounded ${theme === 'dark' ? 'bg-[#181A20] border-[#23262F] text-white placeholder-gray-400' : 'bg-gray-100 border-gray-300'}`}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      {/* Общий скроллируемый контейнер для всех чатов */}
      <div className="flex-1 overflow-y-auto">
        <div>
          {/* Категория: Люди */}
          <div className={`px-4 pt-2 text-xs uppercase ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>Люди</div>
          <ul>
            {grouped['Люди'].length === 0 && (
              <li className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} text-center mt-4 mb-4`}>Нет чатов</li>
            )}
            {grouped['Люди'].map(chatId => {
              const messages = chatHistory[chatId] || [];
              const lastMsg = messages[messages.length - 1];
              const meta = chatMeta[chatId];
              return (
                <li key={chatId}>
                  <NavLink
                    to={`/chat/${chatId}`}
                    className={({ isActive }) =>
                      `flex items-center p-4 cursor-pointer rounded-xl ${theme === 'dark' ? 'hover:bg-[#181A20]' : 'hover:bg-gray-100'} ${isActive ? (theme === 'dark' ? 'bg-blue-900 font-bold' : 'bg-blue-50 font-bold') : ''}`
                    }
                  >
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${theme === 'dark' ? 'bg-[#23262F] text-gray-300' : 'bg-gray-300 text-gray-600'}`}>🧑</span>
                    <div className="flex-1 min-w-0 flex flex-col ml-3">
                      <span className={`font-semibold truncate ${theme === 'dark' ? 'text-white' : ''}`}>{meta?.name || `Чат ${chatId}`}</span>
                      {lastMsg && (
                        <span className={`text-xs mt-1 truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}>{lastMsg.text}</span>
                      )}
                    </div>
                    <button onClick={e => { e.preventDefault(); e.stopPropagation(); handleDeleteChat(chatId); }}
                      className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ml-2 ${theme === 'dark' ? 'hover:bg-[#181A20] text-red-400' : 'hover:bg-gray-100 text-red-500'}`}
                      title="Удалить чат">
                      🗑️
                    </button>
                  </NavLink>
                </li>
              );
            })}
          </ul>
          {/* Категория: ИИ-ассистенты */}
          <div className={`px-4 pt-2 text-xs uppercase ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>ИИ-ассистенты</div>
          <ul>
            {grouped['ИИ-ассистенты'].length === 0 && (
              <li className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} text-center mt-4 mb-4`}>Нет чатов</li>
            )}
            {grouped['ИИ-ассистенты'].map(chatId => {
              const messages = chatHistory[chatId] || [];
              const lastMsg = messages[messages.length - 1];
              const meta = chatMeta[chatId];
              return (
                <li key={chatId}>
                  <NavLink
                    to={`/chat/${chatId}`}
                    className={({ isActive }) =>
                      `flex items-center p-4 cursor-pointer rounded-xl ${theme === 'dark' ? 'hover:bg-[#181A20]' : 'hover:bg-gray-100'} ${isActive ? (theme === 'dark' ? 'bg-blue-900 font-bold' : 'bg-blue-50 font-bold') : ''}`
                    }
                  >
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-400 text-white'}`}>🤖</span>
                    <div className="flex-1 min-w-0 flex flex-col ml-3">
                      <span className={`font-semibold truncate ${theme === 'dark' ? 'text-white' : ''}`}>{meta?.name || `Чат ${chatId}`}</span>
                      {lastMsg && (
                        <span className={`text-xs mt-1 truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}>{lastMsg.text}</span>
                      )}
                    </div>
                    <button onClick={e => { e.preventDefault(); e.stopPropagation(); handleDeleteChat(chatId); }}
                      className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ml-2 ${theme === 'dark' ? 'hover:bg-[#181A20] text-red-400' : 'hover:bg-gray-100 text-red-500'}`}
                      title="Удалить чат">
                      🗑️
                    </button>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      {/* Кнопки создания чата */}
      <div className="p-2 flex gap-2">
        <button
          onClick={() => openModal('Люди')}
          className={`flex-1 py-2 rounded-xl ${theme === 'dark' ? 'bg-[#23262F] text-gray-300 hover:bg-[#181A20]' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >+ Чат с человеком</button>
        <button
          onClick={() => openModal('ИИ-ассистенты')}
          className={`flex-1 py-2 rounded-xl ${theme === 'dark' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
        >+ Чат с ИИ</button>
      </div>
    </div>
  );
}
  