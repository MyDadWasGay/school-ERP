import { ModuleWorkspace } from "@/features/shared/components/module-workspace";

export default async function CurriculumPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string }> }) {
  const query = await searchParams;
  return <ModuleWorkspace route="/academics/curriculum" page={Number(query.page) || 1} search={query.search} />;
}
