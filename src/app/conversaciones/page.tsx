"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  MessageSquare,
  Search,
  ExternalLink,
  RefreshCw,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { Header } from "@/components/layout/Header";
import { cn, formatRelative, getWhatsAppLink } from "@/lib/utils";
import type { Mensaje, MensajeRaw, Cliente } from "@/lib/types";

interface ConversationSummary {
  sender_id: string;
  nombre: string | null;
  canal: string | null;
  telefono: string | null;
  last_message: string;
  last_timestamp: string;
  message_count: number;
}

/** Normalize a mensajes_raw row into the Mensaje shape */
function rawToMensaje(raw: MensajeRaw): Mensaje {
  return {
    id: raw.id as unknown as number, // uuid, only used as React key
    sender_id: raw.sender_id,
    canal: raw.canal,
    direccion: "inbound",
    contenido: raw.mensaje,
    message_id: raw.message_id,
    created_at: raw.created_at,
  };
}

export default function ConversacionesPage() {
  const supabase = createClient();

  // Data
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [messages, setMessages] = useState<Mensaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Selection
  const [selectedSenderId, setSelectedSenderId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationSummary | null>(null);

  // Search
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchConversations = useCallback(async () => {
    setLoading(true);

    // Fetch outbound from mensajes + inbound from mensajes_raw in parallel
    const [outboundRes, inboundRes] = await Promise.all([
      supabase
        .from("mensajes")
        .select("sender_id, contenido, created_at, canal")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("mensajes_raw")
        .select("sender_id, mensaje, created_at, canal")
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    if (outboundRes.error && inboundRes.error) {
      setLoading(false);
      return;
    }

    // Normalize into a common shape: { sender_id, contenido, created_at, canal }
    const outbound = (outboundRes.data || []).map((m) => ({
      sender_id: m.sender_id,
      contenido: m.contenido as string | null,
      created_at: m.created_at as string,
      canal: m.canal as string | null,
    }));

    const inbound = (inboundRes.data || []).map((m) => ({
      sender_id: m.sender_id,
      contenido: m.mensaje as string | null,
      created_at: m.created_at as string,
      canal: m.canal as string | null,
    }));

    const allMessages = [...outbound, ...inbound].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Get unique sender_ids
    const senderIds = [...new Set(allMessages.map((m) => m.sender_id))];

    // Fetch client info for all sender_ids
    const { data: clientesData } = senderIds.length > 0
      ? await supabase
          .from("clientes")
          .select("sender_id, nombre, telefono, canal")
          .in("sender_id", senderIds)
      : { data: null };

    const clienteMap = new Map<string, Cliente>();
    if (clientesData) {
      for (const c of clientesData) {
        clienteMap.set(c.sender_id, c as Cliente);
      }
    }

    // Group by sender_id
    const grouped = new Map<string, ConversationSummary>();
    for (const msg of allMessages) {
      if (!grouped.has(msg.sender_id)) {
        const cliente = clienteMap.get(msg.sender_id);
        grouped.set(msg.sender_id, {
          sender_id: msg.sender_id,
          nombre: cliente?.nombre || null,
          canal: msg.canal || cliente?.canal || null,
          telefono: cliente?.telefono || null,
          last_message: msg.contenido || "",
          last_timestamp: msg.created_at,
          message_count: 0,
        });
      }
      const conv = grouped.get(msg.sender_id)!;
      conv.message_count++;
    }

    let convList = Array.from(grouped.values()).sort(
      (a, b) =>
        new Date(b.last_timestamp).getTime() -
        new Date(a.last_timestamp).getTime()
    );

    // Apply search filter
    if (search) {
      const q = search.toLowerCase();
      convList = convList.filter(
        (c) =>
          (c.nombre?.toLowerCase().includes(q) ?? false) ||
          c.sender_id.toLowerCase().includes(q) ||
          (c.telefono?.toLowerCase().includes(q) ?? false)
      );
    }

    setConversations(convList);
    setLoading(false);
  }, [supabase, search]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const fetchMessages = useCallback(
    async (senderId: string) => {
      setLoadingMessages(true);

      // Fetch outbound from mensajes + inbound from mensajes_raw in parallel
      const [outboundRes, inboundRes] = await Promise.all([
        supabase
          .from("mensajes")
          .select("*")
          .eq("sender_id", senderId)
          .order("created_at", { ascending: true })
          .limit(100),
        supabase
          .from("mensajes_raw")
          .select("*")
          .eq("sender_id", senderId)
          .order("created_at", { ascending: true })
          .limit(100),
      ]);

      const outbound = (outboundRes.data as Mensaje[]) || [];
      const inbound = ((inboundRes.data as MensajeRaw[]) || []).map(rawToMensaje);

      const merged = [...outbound, ...inbound].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      setMessages(merged);
      setLoadingMessages(false);

      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    },
    [supabase]
  );

  const handleSelectConversation = (conv: ConversationSummary) => {
    setSelectedSenderId(conv.sender_id);
    setSelectedConversation(conv);
    fetchMessages(conv.sender_id);
  };

  return (
    <AppShell>
      <Header
        title="Conversaciones"
        description="Historial de mensajes"
      >
        <button
          onClick={fetchConversations}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", loading && "animate-spin")}
          />
        </button>
      </Header>

      <div className="flex border border-border rounded-lg overflow-hidden h-[calc(100vh-200px)] min-h-[500px]">
        {/* Left Panel: Conversation List */}
        <div className="w-[30%] min-w-[280px] border-r border-border flex flex-col bg-card">
          {/* Search */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar conversacion..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-16 bg-muted animate-pulse rounded"
                  />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">Sin conversaciones</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.sender_id}
                  onClick={() => handleSelectConversation(conv)}
                  className={cn(
                    "w-full text-left px-3 py-3 border-b border-border/50 hover:bg-accent/30 transition-colors",
                    selectedSenderId === conv.sender_id && "bg-accent/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground truncate">
                          {conv.nombre || conv.sender_id}
                        </p>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatRelative(conv.last_timestamp)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {conv.canal && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                            {conv.canal}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {conv.message_count} msgs
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {conv.last_message || "[sin contenido]"}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Panel: Chat View */}
        <div className="flex-1 flex flex-col bg-background">
          {!selectedConversation ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-3 opacity-40" />
              <p className="text-lg font-medium">
                Selecciona una conversacion
              </p>
              <p className="text-sm">
                Elige una conversacion del panel izquierdo para ver los mensajes
              </p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-border bg-card flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {selectedConversation.nombre ||
                      selectedConversation.sender_id}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {selectedConversation.canal && (
                      <span className="text-xs text-muted-foreground capitalize">
                        {selectedConversation.canal}
                      </span>
                    )}
                    {selectedConversation.telefono && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {selectedConversation.telefono}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {selectedConversation.telefono && (
                    <a
                      href={getWhatsAppLink(selectedConversation.telefono)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-md text-green-400 hover:bg-green-500/20 transition-colors"
                      title="WhatsApp"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  <button
                    onClick={() =>
                      selectedSenderId && fetchMessages(selectedSenderId)
                    }
                    disabled={loadingMessages}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    title="Actualizar"
                  >
                    <RefreshCw
                      className={cn(
                        "h-4 w-4",
                        loadingMessages && "animate-spin"
                      )}
                    />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-12 bg-muted animate-pulse rounded-lg max-w-[60%]",
                          i % 2 === 0 ? "mr-auto" : "ml-auto"
                        )}
                      />
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-sm">Sin mensajes</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.message_id || msg.id}
                      className={cn(
                        "flex",
                        msg.direccion === "outbound"
                          ? "justify-end"
                          : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[70%] rounded-lg px-3 py-2",
                          msg.direccion === "outbound"
                            ? "bg-emerald-600/80 text-white"
                            : "bg-muted text-foreground"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {msg.contenido || "[sin contenido]"}
                        </p>
                        <p
                          className={cn(
                            "text-[10px] mt-1",
                            msg.direccion === "outbound"
                              ? "text-white/60"
                              : "text-muted-foreground"
                          )}
                        >
                          {formatRelative(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
