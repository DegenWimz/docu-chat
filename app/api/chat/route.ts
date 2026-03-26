import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

// Fonction pour normaliser les vecteurs (essentiel pour la recherche Supabase)
function normalize(vector: number[]) {
  const magnitude = Math.sqrt(vector.reduce((acc, val) => acc + val * val, 0));
  return vector.map(val => val / magnitude);
}

export async function POST(request: Request) {
  try {
    // 1. NOUVEAU : On récupère l'historique envoyé par le frontend (tableau vide par défaut)
    const { message, fileId, history = [] } = await request.json();

    // Authentification Supabase via les cookies
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(payload) { payload.forEach((c) => cookieStore.set(c.name, c.value, c.options)) },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("Non autorisé", { status: 401 });

    // 2. Création de l'embedding pour la question de l'utilisateur
    const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-2-preview" });
    
    const embeddingResult = await embeddingModel.embedContent({
      content: { parts: [{ text: message }], role: 'user' },
      taskType: TaskType.RETRIEVAL_QUERY,
      outputDimensionality: 768,
    } as any);
    
    const queryEmbedding = normalize(embeddingResult.embedding.values);

    // 3. Recherche des documents les plus pertinents
    const { data: documents, error } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: 0.3,
      match_count: 5,
      filter_user_id: user.id,
      filter_file_id: fileId
    });

    if (error) throw error;

    const contextText = documents?.length 
      ? documents.map((doc: any) => doc.content).join("\n---\n") 
      : "Aucun contexte trouvé dans les documents.";

    // 4. NOUVEAU : Formatage de l'historique pour l'API Gemini
    // L'API attend les rôles "user" et "model" (pas "ai")
    const formattedHistory = history.map((msg: any) => ({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));

    // 5. Préparation du modèle Gemini 3.1 Flash Lite avec INSTRUCTIONS SYSTÈME
    const chatModel = genAI.getGenerativeModel({ 
      model: "gemini-3.1-flash-lite-preview",
      systemInstruction: "Tu es DocuChat. Tu dois répondre en tenant compte de la conversation précédente ET du nouveau contexte documentaire fourni à chaque message. Reste professionnel."
    });
    
    // NOUVEAU : Initialisation de la session avec mémoire
    const chatSession = chatModel.startChat({
      history: formattedHistory,
    });
    
    // Le prompt n'a plus besoin de rappeler qu'il est DocuChat, on lui passe juste la Data
    const prompt = `
      [CONTEXTE DOCUMENTAIRE FRAIS (Issu de la recherche RAG)] :
      ${contextText}

      [NOUVELLE QUESTION DE L'UTILISATEUR] :
      ${message}
    `;

    // 6. GÉNÉRATION EN STREAMING (Méthode sendMessageStream)
    const result = await chatSession.sendMessageStream(prompt);

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            controller.enqueue(encoder.encode(chunkText));
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error) {
    console.error("Erreur Chat:", error);
    return new Response("Erreur lors de la génération du chat", { status: 500 });
  }
}