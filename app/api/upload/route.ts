import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  console.log("=== 🔍 DÉBUT DIAGNOSTIC UPLOAD ===");
  try {
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

    // 1. Log des Headers pour voir si le navigateur ment sur la taille
    const contentLength = request.headers.get('content-length');
    const contentType = request.headers.get('content-type');
    console.log(`[HTTP] Content-Length annoncé: ${contentLength} bytes`);
    console.log(`[HTTP] Content-Type: ${contentType}`);

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.error("[ERREUR] Aucun fichier trouvé dans le FormData");
      return NextResponse.json({ error: "Pas de fichier" }, { status: 400 });
    }

    // 2. Analyse de l'objet File avant lecture
    console.log(`[FILE OBJECT] Nom: ${file.name}`);
    console.log(`[FILE OBJECT] Taille annoncée: ${file.size} bytes`);
    console.log(`[FILE OBJECT] Type MIME: ${file.type}`);

    // 3. Lecture du buffer réel
    const buffer = await file.arrayBuffer();
    console.log(`[BUFFER] Taille réelle reçue en mémoire: ${buffer.byteLength} bytes`);

    if (buffer.byteLength === 0) {
      console.error("[CRITIQUE] Le buffer est VIDE (0 octets). Le fichier n'a pas été transmis.");
      return NextResponse.json({ 
        error: "Le fichier est arrivé vide sur le serveur.",
        details: { announced: file.size, received: buffer.byteLength }
      }, { status: 400 });
    }

    console.log("=== ✅ FIN DIAGNOSTIC (Fichier reçu avec succès) ===");
    return NextResponse.json({ 
      success: true, 
      log: "Diagnostic terminé, fichier bien reçu.",
      receivedBytes: buffer.byteLength 
    });

  } catch (error: any) {
    console.error(`[ERREUR CRITIQUE] ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}