```markdown
# 🚀 DocuChat - Assistant PDF Intelligent & Privé

**DocuChat** est une plateforme SaaS de gestion de documents utilisant l'architecture **RAG** (Retrieval-Augmented Generation) pour discuter avec vos PDF en toute confidentialité.

## ✨ Fonctionnalités clés
- 🔐 **Espace Personnel** : Authentification sécurisée par Magic Link (Supabase Auth). Chaque utilisateur dispose de son propre espace de stockage privé.
- 📂 **Gestion Multi-fichiers** : Historique complet des documents uploadés avec possibilité de suppression individuelle.
- 🧠 **IA de Pointe** : Réponses générées par **Gemini 3.1 Flash Lite** et indexation vectorielle via **Gemini-embedding-2**.
- 🔍 **Filtre de Recherche** : Possibilité de limiter la recherche à un document précis ou à l'ensemble de la bibliothèque.
- 🛡️ **Sécurité Native** : Isolation totale des données via **Row Level Security (RLS)** de Supabase.

## 🛠️ Stack Technique
- **Frontend** : Next.js 16 (Turbopack), Tailwind CSS.
- **Backend** : Next.js API Routes.
- **Base de données** : Supabase + extension `pgvector`.
- **Modèles IA** : Google Gemini API.

## 🚀 Installation & Lancement

1. **Cloner le projet** :
   ```bash
   git clone [https://github.com/DegenWimz/docu-chat.git](https://github.com/DegenWimz/docu-chat.git)
   cd docu-chat
   ```

2. **Installer les dépendances** :
   ```bash
   npm install
   ```

3. **Configurer les variables d'environnement** :
   Créez un fichier `.env.local` à la racine :
   ```env
   NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon
   GOOGLE_GENERATIVE_AI_API_KEY=votre_cle_gemini
   ```

4. **Lancer en mode développement** :
   ```bash
   npm run dev
   ```

## 📜 Configuration Base de données
Pour que la recherche vectorielle fonctionne, vous devez :
1. Activer l'extension `vector` sur Supabase.
2. Créer la table `documents` avec une colonne `embedding` de type `vector(768)`.
3. Ajouter la fonction SQL `match_documents` pour la recherche de similarité cosinus.
```

---