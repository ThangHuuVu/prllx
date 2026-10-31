import { notFound } from "next/navigation";
import { getScene, isSceneExpired, toViewerScene } from "@/lib/kv";
import { ShareViewer } from "@/components/ShareViewer";

export const dynamic = "force-dynamic";

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const scene = await getScene(id);

  if (!scene) {
    notFound();
  }

  if (isSceneExpired(scene)) {
    notFound();
  }

  return <ShareViewer scene={toViewerScene(scene)} variant="embed" />;
}
