import { createClient } from '@/lib/supabase/server';

export interface OrdinanceSection {
  section_identifier: string;
  title_en: string;
  title_zh: string;
  text_en: string;
  text_zh: string;
}

/**
 * Get section text for getOrdinanceSection tool (HOT PATH)
 * Uses RPC function for optimal performance
 */
export async function getOrdinanceSectionFromDB(
  capNumber: string,
  sectionNumber: string
): Promise<OrdinanceSection | null> {
  const supabase = await createClient();

  // Normalize section number (remove "s." prefix if present)
  const normalized = sectionNumber.replace(/^s\.?\s*/i, '');

  const { data, error } = await supabase.rpc('get_ordinance_section_text', {
    p_cap_number: capNumber,
    p_section_number: normalized,
  });

  if (error) {
    console.error('[getOrdinanceSectionFromDB] Error:', error);
    return null;
  }

  return data?.[0] || null;
}

/**
 * Get available sections for an ordinance (for error messages)
 */
export async function getOrdinanceSections(capNumber: string): Promise<string[]> {
  const supabase = await createClient();

  const { data: ordinance } = await supabase
    .from('ordinances')
    .select('id')
    .eq('cap_number', capNumber)
    .single();

  if (!ordinance) return [];

  const { data: sections } = await supabase
    .from('ordinance_sections')
    .select('section_number')
    .eq('ordinance_id', ordinance.id)
    .order('sort_order');

  return sections?.map(s => s.section_number) || [];
}

/**
 * Get ordinance structure for listing page (/cap/[id])
 */
export async function getOrdinanceStructure(capNumber: string) {
  const supabase = await createClient();

  const { data: ordinance } = await supabase
    .from('ordinances')
    .select('*')
    .eq('cap_number', capNumber)
    .single();

  if (!ordinance) return null;

  const { data: parts } = await supabase
    .from('ordinance_parts')
    .select(`
      id,
      part_identifier,
      title_en,
      title_zh,
      sort_order,
      ordinance_sections (
        section_number,
        section_identifier,
        title_en,
        title_zh,
        subpath,
        text_en,
        text_zh,
        sort_order
      )
    `)
    .eq('ordinance_id', ordinance.id)
    .order('sort_order');

  return {
    cap: ordinance.cap_number,
    title: ordinance.title_en,
    titleZh: ordinance.title_zh,
    parts: parts?.map(p => ({
      id: p.part_identifier,
      title: p.title_en,
      titleZh: p.title_zh,
      sections: (p.ordinance_sections as any[])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(s => ({
          id: s.section_identifier,
          number: s.section_number,
          title: s.title_en,
          titleZh: s.title_zh,
          subpath: s.subpath,
          textEn: s.text_en,
          textZh: s.text_zh,
        })),
    })) || [],
  };
}

/**
 * Get section with annotations for section page (/cap/[id]/s/[section])
 */
export async function getSectionWithAnnotations(capNumber: string, sectionNumber: string) {
  const supabase = await createClient();

  const { data: ordinance } = await supabase
    .from('ordinances')
    .select('id')
    .eq('cap_number', capNumber)
    .single();

  if (!ordinance) return null;

  const { data: section } = await supabase
    .from('ordinance_sections')
    .select(`
      id,
      section_number,
      section_identifier,
      title_en,
      title_zh,
      text_en,
      text_zh,
      ordinance_parts (
        part_identifier,
        title_en,
        title_zh
      )
    `)
    .eq('ordinance_id', ordinance.id)
    .eq('section_number', sectionNumber)
    .single();

  if (!section) return null;

  const { data: annotations } = await supabase
    .from('ordinance_annotations')
    .select('*')
    .eq('section_id', section.id)
    .order('sort_order');

  return {
    section: section.section_number,
    titleEn: section.title_en,
    titleZh: section.title_zh,
    sectionTextEn: section.text_en,
    sectionTextZh: section.text_zh,
    part: (section.ordinance_parts as any[])?.[0],
    cases: annotations?.map(a => ({
      citation: a.citation,
      caseName: a.case_name,
      court: a.court,
      year: a.year,
      annotation: a.annotation,
      language: a.language,
    })) || [],
  };
}

/**
 * Get annotated sections for generateStaticParams (/cap/[id]/s/[section])
 */
export async function getAnnotatedSections(capNumber: string) {
  const supabase = await createClient();

  const { data: ordinance } = await supabase
    .from('ordinances')
    .select('id')
    .eq('cap_number', capNumber)
    .single();

  if (!ordinance) return [];

  // Get sections with at least one annotation
  const { data: annotatedSectionIds } = await supabase
    .from('ordinance_annotations')
    .select('section_id')
    .eq('ordinance_id', ordinance.id);

  if (!annotatedSectionIds?.length) return [];

  const sectionIds = [...new Set(annotatedSectionIds.map(a => a.section_id))];

  const { data: sections } = await supabase
    .from('ordinance_sections')
    .select('section_number, title_en')
    .in('id', sectionIds)
    .order('sort_order');

  return sections?.map(s => ({ section: s.section_number, titleEn: s.title_en })) || [];
}
