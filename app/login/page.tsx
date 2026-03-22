"use client";

import { createBrowserClient } from '@supabase/ssr';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    });
    
    if (error) setMessage("❌ Erreur : " + error.message);
    else setMessage("📩 Vérifiez votre boîte mail pour le lien de connexion !");
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 border border-neutral-800 rounded-2xl bg-neutral-900/50">
        <h1 className="text-2xl font-bold mb-6 text-center">Connexion à DocuChat</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="email" 
            placeholder="votre@email.com" 
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold transition-all">
            Recevoir mon lien magique
          </button>
        </form>
        {message && <p className="mt-4 text-center text-sm text-neutral-400">{message}</p>}
      </div>
    </main>
  );
}