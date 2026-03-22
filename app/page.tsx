export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50 p-8 flex flex-col items-center font-sans">
      
      {/* En-tête de l'application */}
      <header className="w-full max-w-5xl mb-12 text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          DocuChat
        </h1>
        <p className="mt-3 text-neutral-400">
          Discutez intelligemment avec vos documents.
        </p>
      </header>

      {/* Conteneur principal divisé en deux colonnes */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Colonne de Gauche : Zone de Dépôt (Upload) */}
        <div className="border-2 border-dashed border-neutral-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-neutral-900/30 hover:bg-neutral-900/80 transition-all cursor-pointer h-[500px]">
          <div className="text-5xl mb-4">📄</div>
          <h2 className="text-xl font-semibold mb-2">Glissez votre PDF ici</h2>
          <p className="text-sm text-neutral-500">ou cliquez pour parcourir vos dossiers</p>
        </div>

        {/* Colonne de Droite : Zone de Chat */}
        <div className="border border-neutral-800 rounded-2xl bg-neutral-900/50 flex flex-col h-[500px] overflow-hidden">
          
          {/* Historique des messages (statique pour le moment) */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="bg-neutral-800 rounded-xl rounded-tl-none p-4 inline-block max-w-[85%] mb-4 text-sm text-neutral-200">
              Bonjour ! 👋 Chargez un document PDF à gauche pour commencer à me poser des questions.
            </div>
          </div>
          
          {/* Barre de saisie du message */}
          <div className="p-4 border-t border-neutral-800 bg-neutral-950/50 flex gap-3">
            <input 
              type="text" 
              placeholder="Posez une question sur le document..." 
              className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
            <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-colors">
              Envoyer
            </button>
          </div>

        </div>

      </div>
    </main>
  );
}