```markdown
# 🚀 DocuChat - Assistant PDF Intelligent & Privé

**DocuChat** est une plateforme SaaS de gestion de documents (RAG - Retrieval-Augmented Generation) qui permet de discuter avec vos PDF en toute confidentialité.

## ✨ Fonctionnalités clés
- 🔐 **Espace Personnel** : Authentification sécurisée par Magic Link (Supabase Auth). Chaque utilisateur dispose de son propre espace de stockage privé.
- 📂 **Gestion Multi-fichiers** : Historique complet des documents uploadés avec possibilité de suppression individuelle.
- 🧠 **IA de Pointe** : Utilisation de **Gemini 3.1 Flash Lite** pour des réponses rapides et **Gemini-embedding-2** pour l'indexation vectorielle.
- 🔍 **Filtre de Recherche** : Choisissez de poser une question sur un document précis ou sur l'intégralité de votre bibliothèque.
- 🛡️ **Sécurité Native** : Utilisation du **Row Level Security (RLS)** de Supabase pour garantir l'isolation totale des données entre utilisateurs.

## 🛠️ Stack Technique
- **Frontend** : Next.js 16 (Turbopack), Tailwind CSS.
- **Backend** : Next.js API Routes (Edge Ready).
- **Base de données** : Supabase avec l'extension `pgvector`.
- **Modèles IA** : Google Gemini API.

## 🚀 Installation & Lancement

1. **Cloner le projet** :
   ```bash
   git clone [https://github.com/VOTRE_PSEUDO/docu-chat.git](https://github.com/DegenWimz/docu-chat.git)
   cd docu-chat
   ```

2. **Installer les dépendances** :
   ```bash
   npm install
   ```

3. **Configurer les variables d'environnement** :
   Créez un fichier `.env.local` et ajoutez vos clés :
   ```env
   NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon
   GOOGLE_GENERATIVE_AI_API_KEY=votre_cle_gemini
   ```

4. **Lancer en mode développement** :
   ```bash
   npm run dev
   ```

## 📜 Schéma de la base de données
L'application repose sur une table `documents` structurée pour la recherche vectorielle :
- `content` (text) : Le morceau de texte extrait.
- `embedding` (vector 768) : La signature mathématique du texte.
- `user_id` (uuid) : Lien vers l'utilisateur propriétaire.
- `file_id` (uuid) : Identifiant unique du document.
```