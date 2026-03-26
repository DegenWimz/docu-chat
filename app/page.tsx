"use client";

import { useState, useRef, useEffect } from "react";
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  Plus, 
  Send, 
  Trash2, 
  FileText, 
  Globe, 
  LogOut, 
  Loader2,
  User,
  MessageSquare,
  Sparkles,
  Pencil,
  Check,
  Download,
  Folder,
  Layers,
  X,
  ChevronRight
} from 'lucide-react';

interface FileHistory {
  file_id: string;
  file_name: string;
}

interface Space {
  id: string;
  name: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

export default function Home() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // --- ÉTATS UTILISATEUR & NAVIGATION ---
  const [user, setUser] = useState<any>(null);
  const [isNewChatMode, setIsNewChatMode] = useState(true);

  // --- ÉTATS ESPACES & FICHIERS (TES FONCTIONS D'ORIGINE) ---
  const [files, setFiles] = useState<FileHistory[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null); 
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [isCreatingSpace, setIsCreatingSpace] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

  // --- ÉTATS CONVERSATIONS & CHAT (NOUVEAUTÉS) ---
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [selectedSpaceIdsForNewChat, setSelectedSpaceIdsForNewChat] = useState<string[]>([]);
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // --- INITIALISATION ---
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push('/login');
      else {
        setUser(session.user);
        fetchSpaces();
        fetchConversations();
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.push('/login');
      else setUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, [router, supabase]);

  // --- GESTION DES ESPACES (WORKSPACES) ---
  const fetchSpaces = async () => {
    const { data } = await supabase.from('spaces').select('*').order('created_at', { ascending: false });
    if (data) {
      setSpaces(data);
      if (data.length > 0 && !selectedSpaceId) {
        setSelectedSpaceId(data[0].id);
      }
    }
  };

  useEffect(() => {
    if (user) {
      setSelectedFileId(null);
      fetchHistory();
    }
  }, [selectedSpaceId, user]);

  const handleCreateSpace = async () => {
    if (!newSpaceName.trim()) return;
    const { data, error } = await supabase.from('spaces').insert({ name: newSpaceName, user_id: user.id }).select();
    if (!error && data) {
      setSpaces([data[0], ...spaces]);
      setSelectedSpaceId(data[0].id);
      setNewSpaceName("");
      setIsCreatingSpace(false);
    }
  };

  // --- GESTION DES FICHIERS ---
  const fetchHistory = async () => {
    let query = supabase.from('documents').select('file_id, file_name, space_id').order('id', { ascending: false });
    if (selectedSpaceId) query = query.eq('space_id', selectedSpaceId);
    else query = query.is('space_id', null);

    const { data } = await query;
    if (data) {
      const uniqueFiles = data.filter((v, i, a) => a.findIndex(t => t.file_id === v.file_id) === i);
      setFiles(uniqueFiles);
    }
  };

  const deleteFile = async (fileId: string) => {
    if (!confirm("Effacer ce document ?")) return;
    const { error } = await supabase.from('documents').delete().eq('file_id', fileId);
    if (!error) {
      if (selectedFileId === fileId) setSelectedFileId(null);
      fetchHistory();
    }
  };

  const handleRename = async (fileId: string) => {
    if (!editName.trim()) {
      setEditingFileId(null);
      return;
    }
    const { error } = await supabase.from('documents').update({ file_name: editName }).eq('file_id', fileId);
    if (!error) {
      setFiles(files.map(f => f.file_id === fileId ? { ...f, file_name: editName } : f));
    }
    setEditingFileId(null);
  };

  const startEditing = (f: FileHistory, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(f.file_name);
    setEditingFileId(f.file_id);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadMessage(`Envoi de ${selectedFiles.length} fichier(s)...`);

    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("file", file); 
        if (selectedSpaceId) formData.append("spaceId", selectedSpaceId);
        
        const response = await fetch("/api/upload", { method: "POST", body: formData });
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Erreur serveur");
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      setUploadMessage("✅ Documents envoyés !");
      fetchHistory(); 
    } catch (e: any) {
      setUploadMessage(`❌ ${e.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // --- GESTION DES CONVERSATIONS ---
  const fetchConversations = async () => {
    const { data } = await supabase.from('conversations').select('*').order('created_at', { ascending: false });
    if (data) setConversations(data);
  };

  const loadConversation = async (convId: string) => {
    setActiveConvId(convId);
    setIsNewChatMode(false);
    const { data } = await supabase.from('chat_messages').select('role, content').eq('conversation_id', convId).order('created_at', { ascending: true });
    if (data) {
      setMessages(data.map(m => ({ role: m.role as "user" | "ai", text: m.content })));
    }
  };

  const startNewChat = async () => {
    if (selectedSpaceIdsForNewChat.length === 0) return alert("Sélectionnez au moins un workspace.");
    setIsLoadingChat(true);
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: `Discussion ${new Date().toLocaleDateString()}`, 
          spaceIds: selectedSpaceIdsForNewChat 
        })
      });
      const newConv = await res.json();
      setConversations([newConv, ...conversations]);
      setActiveConvId(newConv.id);
      setIsNewChatMode(false);
      setMessages([]);
    } catch (e) {
      alert("Erreur lors de l'initialisation.");
    } finally {
      setIsLoadingChat(false);
    }
  };

  // --- CHAT & PDF EXPORT ---
  const handleSendMessage = async () => {
    if (!input.trim() || isLoadingChat || !activeConvId) return;

    const userMsg = input;
    setInput("");
    const currentHistory = [...messages];
    
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setIsLoadingChat(true);
    setMessages((prev) => [...prev, { role: "ai", text: "" }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userMsg, 
          conversationId: activeConvId,
          history: currentHistory 
        }),
      });

      if (!response.body) return;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        accumulatedText += decoder.decode(value);
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1].text = accumulatedText;
          return updated;
        });
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: "ai", text: "Erreur de connexion." }]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  const handleExportPDF = async () => {
    if (messages.length === 0 || isExporting) return;
    setIsExporting(true);
    try {
      const res = await fetch("/api/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      const { summary } = await res.json();
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Compte-rendu DocuChat", 14, 22);
      doc.setFontSize(10);
      doc.text(`Discussion : ${activeConvId}`, 14, 30);
      doc.text(`Date : ${new Date().toLocaleDateString()}`, 14, 35);
      doc.setFontSize(14);
      doc.setTextColor(0, 102, 204);
      doc.text("SYNTHÈSE IA", 14, 50);
      doc.setFontSize(10);
      doc.setTextColor(50);
      const splitSummary = doc.splitTextToSize(summary || "N/A", 180);
      doc.text(splitSummary, 14, 60);
      const tableData = messages.map(m => [m.role === 'user' ? 'MOI' : 'DOCUCHAT AI', m.text]);
      autoTable(doc, {
        startY: 100, head: [['Rôle', 'Message']], body: tableData, theme: 'striped',
        headStyles: { fillColor: [0, 102, 204] }, styles: { fontSize: 9 }
      });
      doc.save(`DocuChat_Export_${new Date().getTime()}.pdf`);
    } catch (error) {
      alert("Erreur PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (!user) return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-500 font-bold uppercase animate-pulse">Authentification...</div>;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50 flex font-sans overflow-hidden">
      
      {/* SIDEBAR : CONVERSATIONS + WORKSPACES */}
      <aside className="w-80 border-r border-neutral-800 bg-neutral-900/40 flex flex-col p-6 overflow-y-auto custom-scrollbar">
        <div className="mb-8">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent flex items-center gap-2">
            <MessageSquare className="text-blue-500 w-6 h-6" /> DocuChat
          </h1>
          <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1 font-bold">Vibe Coder Master Edition</p>
        </div>

        {/* SECTION NOUVEAU CHAT */}
        <button onClick={() => { setIsNewChatMode(true); setActiveConvId(null); setMessages([]); }} className="w-full mb-6 py-3 px-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20">
          <Plus className="w-4 h-4" /> Nouvelle Discussion
        </button>

        {/* HISTORIQUE CHATS */}
        <div className="mb-8 space-y-2">
          <p className="text-[11px] text-neutral-600 font-bold uppercase px-2 mb-3 tracking-widest">Discussions</p>
          {conversations.map((conv) => (
            <button key={conv.id} onClick={() => loadConversation(conv.id)} className={`w-full text-left px-4 py-3 rounded-xl text-xs truncate transition-all flex items-center gap-3 ${activeConvId === conv.id ? 'bg-blue-600/10 text-blue-400 border border-blue-900/30' : 'hover:bg-neutral-800/50 text-neutral-500'}`}>
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{conv.title}</span>
            </button>
          ))}
        </div>

        {/* GESTION WORKSPACES (TES LOGIQUES ORIGINALES) */}
        <div className="pt-6 border-t border-neutral-800 space-y-6">
          <div className="bg-neutral-900/60 p-3 rounded-2xl border border-neutral-800/50">
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="text-[11px] text-neutral-400 font-bold uppercase flex items-center gap-2"><Folder className="w-3.5 h-3.5" /> Workspaces</p>
              <button onClick={() => setIsCreatingSpace(!isCreatingSpace)} className="text-blue-400"><Plus className="w-4 h-4" /></button>
            </div>
            {isCreatingSpace && (
              <div className="flex items-center gap-2 mb-3">
                <input type="text" value={newSpaceName} onChange={e => setNewSpaceName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateSpace()} placeholder="Nom..." className="flex-1 bg-neutral-950 text-xs px-3 py-2 rounded-xl border border-neutral-700 outline-none" />
                <button onClick={handleCreateSpace} className="text-emerald-400"><Check className="w-4 h-4" /></button>
              </div>
            )}
            <select value={selectedSpaceId || ""} onChange={(e) => setSelectedSpaceId(e.target.value || null)} className="w-full bg-neutral-950 text-neutral-300 text-xs font-medium rounded-xl px-3 py-2.5 border border-neutral-800 outline-none">
              <option value="">Général</option>
              {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between px-2">
              <p className="text-[11px] text-neutral-600 font-bold uppercase">Documents</p>
              <button onClick={() => fileInputRef.current?.click()} className="text-blue-500">
                {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              </button>
            </div>
            <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            {files.map((f) => (
              <div key={f.file_id} className="group relative flex items-center w-full">
                {editingFileId === f.file_id ? (
                  <div className="flex w-full items-center gap-2 px-2 py-2 bg-neutral-800 rounded-xl">
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleRename(f.file_id)} className="flex-1 bg-transparent text-xs text-white outline-none" autoFocus />
                    <button onClick={() => handleRename(f.file_id)} className="text-emerald-400"><Check className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-between px-4 py-3 rounded-xl text-xs hover:bg-neutral-800/50 text-neutral-400 transition-all group">
                    <div className="flex items-center gap-3 truncate">
                      <FileText className="w-4 h-4 shrink-0 text-neutral-600" />
                      <span className="truncate pr-8">{f.file_name}</span>
                    </div>
                    <div className="hidden group-hover:flex items-center gap-1">
                      <button onClick={(e) => startEditing(f, e)} className="p-1 text-blue-400"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={(e) => { e.stopPropagation(); deleteFile(f.file_id); }} className="p-1 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* LOGOUT */}
        <div className="pt-6 mt-auto border-t border-neutral-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700 font-bold text-blue-400">{user.email?.[0].toUpperCase()}</div>
            <p className="text-[10px] text-neutral-400 truncate flex-1">{user.email}</p>
          </div>
          <button onClick={handleLogout} className="w-full text-left px-2 text-xs text-red-500/80 hover:text-red-400 transition-colors flex items-center gap-2 font-bold uppercase tracking-widest"><LogOut className="w-4 h-4" /> Déconnexion</button>
        </div>
      </aside>

      {/* ZONE CENTRALE : CHAT OU CONFIG */}
      <section className="flex-1 flex flex-col h-screen bg-neutral-950">
        
        {isNewChatMode ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-md w-full space-y-8 text-center">
              <div className="inline-flex p-5 bg-blue-500/10 rounded-3xl mb-4 border border-blue-500/20 shadow-2xl shadow-blue-500/10">
                <Layers className="w-10 h-10 text-blue-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-white tracking-tight">Nouvelle Session</h2>
                <p className="text-sm text-neutral-500">Sélectionnez les dossiers sources pour l'IA.</p>
              </div>
              <div className="grid grid-cols-1 gap-3 text-left">
                {spaces.map(space => (
                  <label key={space.id} className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${selectedSpaceIdsForNewChat.includes(space.id) ? 'bg-blue-600/10 border-blue-500/50 text-blue-400' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'}`}>
                    <input type="checkbox" className="hidden" checked={selectedSpaceIdsForNewChat.includes(space.id)} onChange={() => setSelectedSpaceIdsForNewChat(prev => prev.includes(space.id) ? prev.filter(id => id !== space.id) : [...prev, space.id])} />
                    <Folder className={`w-5 h-5 ${selectedSpaceIdsForNewChat.includes(space.id) ? 'text-blue-500' : 'text-neutral-700'}`} />
                    <span className="flex-1 font-bold text-sm">{space.name}</span>
                    {selectedSpaceIdsForNewChat.includes(space.id) && <Check className="w-4 h-4" />}
                  </label>
                ))}
              </div>
              <button onClick={startNewChat} disabled={selectedSpaceIdsForNewChat.length === 0 || isLoadingChat} className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-800 rounded-2xl font-bold text-sm transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-3">
                {isLoadingChat ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />} Initialiser l'IA
              </button>
            </div>
          </div>
        ) : (
          <>
            <header className="px-8 py-6 border-b border-neutral-900 flex justify-between items-center bg-neutral-950/80 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg"><Sparkles className="w-4 h-4 text-blue-400" /></div>
                <div>
                  <h2 className="text-sm font-bold text-neutral-200">{conversations.find(c => c.id === activeConvId)?.title}</h2>
                  <p className="text-[10px] text-neutral-500 font-medium">Analyse multi-source active</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {messages.length > 0 && (
                  <button onClick={handleExportPDF} disabled={isExporting} className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl border border-neutral-700 transition-all shadow-lg shadow-black/50">
                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  </button>
                )}
                {uploadMessage && <span className="text-[11px] font-bold text-blue-400 px-3 py-1 bg-blue-400/10 rounded-full animate-pulse border border-blue-400/20">{uploadMessage}</span>}
              </div>
            </header>

            <div ref={chatContainerRef} className="flex-1 p-8 overflow-y-auto space-y-6 custom-scrollbar">
              {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`p-5 rounded-3xl text-sm max-w-[75%] leading-relaxed shadow-xl ${msg.role === "user" ? "bg-blue-600 text-white rounded-tr-none" : "bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-tl-none"}`}>
                    <ReactMarkdown components={{
                        p: ({...props}) => <p className="mb-3 last:mb-0" {...props} />,
                        ul: ({...props}) => <ul className="list-disc ml-5 space-y-2 text-neutral-300" {...props} />,
                        strong: ({...props}) => <strong className="font-bold text-emerald-400" {...props} />,
                    }}>{msg.text}</ReactMarkdown>
                  </div>
                </div>
              ))}
              {isLoadingChat && !messages[messages.length - 1]?.text && (
                <div className="flex justify-start"><div className="bg-neutral-900 border border-neutral-800 text-neutral-500 p-4 rounded-2xl flex items-center gap-3"><Loader2 className="w-3 h-3 animate-spin" /><span className="text-xs font-bold uppercase tracking-widest">Réflexion...</span></div></div>
              )}
            </div>

            <div className="p-8 bg-gradient-to-t from-neutral-950 via-neutral-950 to-transparent">
              <div className="max-w-4xl mx-auto flex gap-4 bg-neutral-900 border border-neutral-800 rounded-2xl p-2 pr-4 shadow-2xl focus-within:border-blue-500 transition-all">
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSendMessage()} placeholder="Posez votre question sur les dossiers sélectionnés..." className="flex-1 bg-transparent border-none px-6 py-4 text-sm focus:outline-none placeholder:text-neutral-600" />
                <button onClick={handleSendMessage} disabled={isLoadingChat || !input.trim()} className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center"><Send className="w-5 h-5" /></button>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}