import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

function normalize(vector: number[]) {
  const magnitude = Math.sqrt(vector.reduce((acc, val) => acc + val * val, 0));
  return vector.map(val => val / magnitude);
}

export async function POST(request: Request) {
  try {
    const { message, conversationId, history = [] } = await request.json();

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

    // 1. SAUVEGARDE DU MESSAGE UTILISATEUR
    if (conversationId) {
      await supabase.from('chat_messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: message
      });
    }

    // 2. RÉCUPÉRATION DES WORKSPACES LIÉS À CETTE CONVERSATION
    const { data: linkedSpaces } = await supabase
      .from('conversation_spaces')
      .select('space_id')
      .eq('conversation_id', conversationId);
    
    const allowedSpaceIds = linkedSpaces?.map(s => s.space_id) || [];

    // 3. RAG : RECHERCHE VECTORIELLE MULTI-WORKSPACE
    const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-2-preview" });
    const embRes = await embeddingModel.embedContent({
      content: { parts: [{ text: message }], role: 'user' },
      taskType: TaskType.RETRIEVAL_QUERY,
      outputDimensionality: 768,
    } as any);
    
    const queryEmbedding = normalize(embRes.embedding.values);

    // On appelle la nouvelle fonction RPC avec la LISTE des IDs
    const { data: documents, error: rpcError } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: 0.3,
      match_count: 5,
      filter_user_id: user.id,
      // On passe maintenant le tableau complet des IDs autorisés
      filter_space_ids: allowedSpaceIds.length > 0 ? allowedSpaceIds : null 
    });

    if (rpcError) {
      console.error("Erreur RPC Match Documents:", rpcError);
    }

    const contextText = documents?.length 
      ? documents.map((doc: any) => doc.content).join("\n---\n") 
      : "Aucun contexte trouvé.";

    // 4. CHAT AVEC GEMINI
    const formattedHistory = history.map((msg: any) => ({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.content || msg.text }]
    }));

    const chatModel = genAI.getGenerativeModel({ 
      model: "gemini-3.1-flash-lite-preview",
      systemInstruction: "Tu es DocuChat. Réponds en utilisant UNIQUEMENT le contexte fourni. Si tu ne sais pas, dis-le."
    });
    
    const chatSession = chatModel.startChat({ history: formattedHistory });
    const prompt = `[CONTEXTE] : ${contextText}\n\n[QUESTION] : ${message}`;

    const result = await chatSession.sendMessageStream(prompt);

    let fullAiResponse = "";
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            fullAiResponse += chunkText;
            controller.enqueue(encoder.encode(chunkText));
          }
          
          // 5. SAUVEGARDE DE LA RÉPONSE AI UNE FOIS LE STREAM FINI
          if (conversationId) {
            await supabase.from('chat_messages').insert({
              conversation_id: conversationId,
              role: 'ai',
              content: fullAiResponse
            });
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream);

  } catch (error) {
    console.error("Erreur Chat:", error);
    return new Response("Erreur", { status: 500 });
  }
}