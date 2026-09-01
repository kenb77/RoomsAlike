"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

type Message = {
  id: string;
  body: string;
  createdAt: string;
  sender: { id: string; name: string };
};

export default function ConversationThreadPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  async function fetchMessages() {
    const res = await fetch(`/api/conversations/${params.id}/messages`);
    if (res.ok) {
      setMessages(await res.json());
    } else if (res.status === 404) {
      setError("Conversation not found");
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;

    const res = await fetch(`/api/conversations/${params.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    });

    if (res.ok) {
      const message = await res.json();
      setMessages((prev) => [...prev, message]);
      setText("");
    }
  }

  if (loading) {
    return <div className="max-w-2xl mx-auto px-6 py-8 text-gray-500">Loading...</div>;
  }

  if (error) {
    return <div className="max-w-2xl mx-auto px-6 py-8 text-red-600">{error}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col h-[calc(100vh-80px)]">
      <h1 className="text-xl font-semibold mb-4">Conversation</h1>
      <div className="flex-1 overflow-y-auto border rounded-xl bg-white p-4 space-y-3">
        {messages.map((m) => {
          const isMe = m.sender.id === session?.user?.id;
          return (
            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                  isMe ? "bg-rose-600 text-white" : "bg-gray-100 text-gray-800"
                }`}
              >
                {!isMe && <p className="text-xs font-medium mb-0.5">{m.sender.name}</p>}
                <p>{m.body}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} className="mt-4 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 border rounded-full px-4 py-2"
        />
        <button
          type="submit"
          className="rounded-full bg-rose-600 text-white px-5 py-2 font-medium hover:bg-rose-700"
        >
          Send
        </button>
      </form>
    </div>
  );
}
