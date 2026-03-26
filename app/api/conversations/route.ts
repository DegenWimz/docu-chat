import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

    const { title, spaceIds } = await request.json();

    // 1. Création de la conversation
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .insert({ title: title || 'Nouvelle discussion', user_id: user.id })
      .select()
      .single();

    if (convError) throw convError;

    // 2. Liaison avec les Workspaces (si sélectionnés)
    if (spaceIds && spaceIds.length > 0) {
      const links = spaceIds.map((spaceId: string) => ({
        conversation_id: conv.id,
        space_id: spaceId
      }));

      const { error: linkError } = await supabase
        .from('conversation_spaces')
        .insert(links);

      if (linkError) throw linkError;
    }

    return NextResponse.json(conv);

  } catch (error: any) {
    console.error("Erreur création conversation:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}