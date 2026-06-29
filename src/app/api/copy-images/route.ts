import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET() {
  try {
    const supabase = createAdminClient();
    
    // Fetch all categories
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('*');
      
    if (catError) throw catError;

    // Fetch all subcategories with categories
    const { data: subcategories, error: subError } = await supabase
      .from('subcategories')
      .select('*, categories(*)');
      
    if (subError) throw subError;

    // Fetch all services with subcategories and categories
    const { data: services, error: servError } = await supabase
      .from('services')
      .select('*, subcategories(*, categories(*))');
      
    if (servError) throw servError;

    return NextResponse.json({
      categories,
      subcategories,
      servicesCount: services.length,
      services: services.map(s => ({
        id: s.id,
        title: s.title,
        category: s.category,
        subcategory_name: s.subcategories?.subcategory_name,
        category_name: s.subcategories?.categories?.category_name,
        image_url: s.image_url
      }))
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
