import { notFound } from "next/navigation";
import { getScene, isSceneExpired, incrementViews } from "@/lib/kv";
import { ShareViewer } from "@/components/ShareViewer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const scene = await getScene(id);

  if (!scene || isSceneExpired(scene)) {
    return {
      title: "Scene not found - prllx",
    };
  }

  return {
    title: scene.title ? `${scene.title} - prllx` : "prllx",
    description: "Interactive 3D parallax scene",
    openGraph: {
      title: scene.title || "prllx",
      description: "Interactive 3D parallax scene",
    },
  };
}

export default async function SharePage({
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

  return <ShareViewer scene={scene} variant="full" />;
}
