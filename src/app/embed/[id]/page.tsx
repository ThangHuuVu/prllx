import { notFound } from "next/navigation";
import { getScene, isSceneExpired, incrementViews } from "@/lib/kv";
import { ShareViewer } from "@/components/ShareViewer";

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

  // Increment view count
  await incrementViews(id);

  return <ShareViewer scene={scene} variant="embed" />;
}
