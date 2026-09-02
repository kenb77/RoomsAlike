"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

type Message = {
  id: string;
  body: string;
  createdAt: string;
  system: boolean;
  sender: { id: string; name: string };
};

type ConversationInfo = {
  id: string;
  listingId: string;
  listingTitle: string;
  isHost: boolean;
  otherPartyName: string;
  paymentInfo: string | null;
  quickReplies: { id: string; title: string; body: string }[];
};

export default function ConversationThreadPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [info, setInfo] = useState<ConversationInfo | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showQuickReplies, setShowQuickReplies] = useState(false);
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

  async function fetchInfo() {
    const res = await fetch(`/api/conversations/${params.id}`);
    if (res.ok) setInfo(await res.json());
  }

  useEffect(() => {
    fetchMessages();
    fetchInfo();
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

  function insertText(value: string) {
    setText((prev) => (prev ? `${prev}\n${value}` : value));
    setShowQuickReplies(false);
  }

  if (loading) {
    return <div className="max-w-2xl mx-auto px-6 py-8 text-gray-500">Loading...</div>;
  }

  if (error) {
    return <div className="max-w-2xl mx-auto px-6 py-8 text-red-600">{error}</div>;
  }

  const hasQuickOptions = info?.isHost && (info.quickReplies.length > 0 || info.paymentInfo);

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col h-[calc(100vh-80px)]">
      <h1 className="text-xl font-semibold mb-1">{info?.listingTitle ?? "Conversation"}</h1>
      {info && <p className="text-sm text-gray-500 mb-4">with {info.otherPartyName}</p>}
      <div className="flex-1 overflow-y-auto border rounded-xl bg-white p-4 space-y-3">
        {messages.map((m) => {
          const isMe = m.sender.id === session?.user?.id;
          if (m.system) {
            return (
              <div key={m.id} className="flex justify-center">
                <div className="max-w-[85%] rounded-lg bg-gray-50 border border-gray-200 px-3 py-1.5 text-xs text-gray-500 text-center">
                  {m.body}
                </div>
              </div>
            );
          }
          return (
            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm whitespace-pre-line ${
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

      {hasQuickOptions && (
        <div className="mt-3 relative">
          <button
            type="button"
            onClick={() => setShowQuickReplies((s) => !s)}
            className="text-xs rounded-full border px-3 py-1.5 hover:bg-gray-50"
          >
            Quick replies ▾
          </button>
          {showQuickReplies && (
            <div className="absolute bottom-full mb-2 left-0 w-72 bg-white border rounded-lg shadow-lg p-2 space-y-1 z-10">
              {info?.paymentInfo && (
                <button
                  type="button"
                  onClick={() => insertText(info.paymentInfo as string)}
                  className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-gray-50"
                >
                  <span className="font-medium">Payment info</span>
                  <p className="text-gray-400 truncate">{info.paymentInfo}</p>
                </button>
              )}
              {info?.quickReplies.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => insertText(q.body)}
                  className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-gray-50"
                >
                  <span className="font-medium">{q.title}</span>
                  <p className="text-gray-400 truncate">{q.body}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSend} className="mt-2 flex gap-2">
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
