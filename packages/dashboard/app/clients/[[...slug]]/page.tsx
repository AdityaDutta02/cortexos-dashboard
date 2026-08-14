import { ClientReportScreen } from "@/components/clients/ClientReportScreen";

/**
 * `/clients` and `/clients/<id>` are the same screen — one optional catch-all
 * rather than two routes, so the rail, header and fallback logic exist once.
 */
export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  return <ClientReportScreen {...(slug?.[0] ? { id: slug[0] } : {})} />;
}
