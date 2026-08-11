import { notFound } from "next/navigation";
import { getPublicCmsPage } from "@/lib/api-client/server-queries";

export default async function PublicCmsPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const organization = typeof query.organization === "string" ? query.organization : "";
  const result = await getPublicCmsPage(organization, (await params).slug);
  if (!result) notFound();
  return <main className="mx-auto min-h-screen max-w-4xl space-y-6 px-6 py-12"><p className="text-sm text-muted-foreground">{result.organizationName}</p><h1 className="text-4xl font-semibold">{result.page.title}</h1><article className="whitespace-pre-wrap leading-7">{result.page.body}</article></main>;
}
