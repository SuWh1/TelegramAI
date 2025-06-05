// src/pages/Home.tsx
import { ChatList } from "../components/chat-list/ChatList";
import { ChatWindow } from "../components/chat-window/ChatWindow";
import { useParams } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

function getMetaFromLS() {
  try {
    const raw = localStorage.getItem('chatMeta');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export default function Home() {
  const { chatId } = useParams();
  const chatMeta = getMetaFromLS();
  const chatExists = chatId && chatMeta[chatId];
  const { theme } = useTheme();

  return (
    <div className={`h-screen flex ${theme === 'dark' ? 'bg-[#181A20]' : 'bg-gray-100'}`}>
      <aside className={`w-1/4 border-r ${theme === 'dark' ? 'border-[#23262F] bg-[#22232B]' : 'border-gray-300 bg-white'}`}>
        <ChatList />
      </aside>
      <main className="flex-1">
        {chatExists ? (
          <ChatWindow chatId={chatId} />
        ) : (
          <div className={`flex flex-col items-center justify-center h-full select-none ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}>
            <div className="text-6xl mb-4">💬</div>
            <div className="text-xl font-semibold mb-2">
              {chatId ? 'Чат не найден' : 'Выберите чат'}
            </div>
            <div className="text-sm">
              {chatId ? 'Такого чата не существует' : 'чтобы начать общение'}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}