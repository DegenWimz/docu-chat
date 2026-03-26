import { NextResponse } from 'next/server';
import { extractText } from 'unpdf';
import mammoth from 'mammoth';
import * as xlsx from 'xlsx';
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
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const spaceId = formData.get('spaceId') as string | null; 

    if (!file) return NextResponse.json({ error: "Pas de fichier" }, { status: 400 });

    const fileId = crypto.randomUUID();
    const fileName = file.name;
    
    // CORRECTION : On récupère le buffer et on en fait immédiatement une version Buffer Node.js
    // Cela évite que la mémoire soit "détachée" lors de l'utilisation par unpdf ou mammoth.
    const arrayBuffer = await file.arrayBuffer();
    const safeBuffer = Buffer.from(arrayBuffer);
    
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const mimeType = file.type;
    
    let fullText = "";

    // --- 🔀 AIGUILLAGE UNIVERSEL ---
    try {
      if (mimeType === "application/pdf" || extension === "pdf") {
        // On utilise une copie (slice) pour ne pas corrompre le buffer original
        const { text } = await extractText(new Uint8Array(safeBuffer.slice()));
        fullText = Array.isArray(text) ? text.join(' ') : text;

      } else if (extension === "docx") {
        const result = await mammoth.extractRawText({ buffer: safeBuffer });
        fullText = result.value;

      } else if (extension === "xlsx" || extension === "csv" || mimeType.includes("spreadsheet")) {
        const workbook = xlsx.read(safeBuffer, { type: 'buffer' });
        const sheetNames = workbook.SheetNames;
        for (const sheetName of sheetNames) {
          const sheet = workbook.Sheets[sheetName];
          fullText += xlsx.utils.sheet_to_csv(sheet) + "\n";
        }
      } else {
        fullText = safeBuffer.toString("utf-8");
      }
    } catch (e) {
      console.log("[Extraction] Erreur classique, le fallback IA prendra le relais.");
    }

    // --- 🛡️ FILET DE SÉCURITÉ OCR (Gemini 3.1 Flash Lite) ---
    if (!fullText || fullText.trim().length < 20) {
      console.log(`[OCR] Activation pour ${fileName}`);
      const fallbackModel = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });
      
      // On utilise le safeBuffer qui est garanti intact ici
      const base64Data = safeBuffer.toString("base64");
      
      const result = await fallbackModel.generateContent([
        "Analyse ce document (OCR) et retranscris tout son contenu textuel proprement. Sois précis sur les chiffres.",
        { inlineData: { data: base64Data, mimeType: mimeType || "application/pdf" } }
      ]);
      fullText = result.response.text();
    }

    if (!fullText || fullText.trim().length === 0) {
      return NextResponse.json({ error: "Contenu illisible." }, { status: 400 });
    }

    // --- ✂️ DÉCOUPAGE ET MÉMORISATION ---
    const chunks = fullText.match(/[\s\S]{1,1000}/g) || [];
    const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-2-preview" });

    for (const chunk of chunks) {
      if (!chunk.trim()) continue;

      const embResult = await embeddingModel.embedContent({
        content: { parts: [{ text: chunk }], role: 'user' },
        taskType: TaskType.RETRIEVAL_DOCUMENT,
        outputDimensionality: 768,
      } as any);

      const embedding = normalize(embResult.embedding.values);

      const { error } = await supabase.from('documents').insert({
        content: chunk,
        embedding: embedding,
        user_id: user.id,
        file_id: fileId,
        file_name: fileName,
        space_id: spaceId || null,
        metadata: { fileName }
      });

      if (error) throw error;
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Erreur Upload:", error);
    return NextResponse.json({ error: "Erreur technique d'upload" }, { status: 500 });
  }
}