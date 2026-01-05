"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

export type LayerItem = {
  id: string;
  name: string;
  url: string;
  order: number;
  visible: boolean;
  gapAfter: number;
  rotation: {
    x: number;
    y: number;
    z: number;
  };
};

type ParallaxSceneProps = {
  layers: LayerItem[];
  orbitSpanDegrees: number;
  zoomLocked: boolean;
  environmentUrl: string | null;
  className?: string;
};

const BASE_LAYER_HEIGHT = 3.4;
const MIN_DISTANCE = 3.2;
const MAX_DISTANCE = 11;
const DEFAULT_LAYER_GAP = 0.02;
const DEFAULT_LAYER_ROTATION = { x: 0, y: 0, z: 0 };

const clampOrbitSpan = (value: number) => {
  const clamped = Math.min(Math.max(value, 10), 360);
  return THREE.MathUtils.degToRad(clamped);
};

const applyOrbitLimits = (controls: OrbitControls, spanDegrees: number) => {
  const orbitSpan = clampOrbitSpan(spanDegrees);
  controls.minAzimuthAngle = -orbitSpan / 2;
  controls.maxAzimuthAngle = orbitSpan / 2;
  const midPolar = Math.PI / 2;
  const minPolar = midPolar - orbitSpan / 2;
  const maxPolar = midPolar + orbitSpan / 2;
  controls.minPolarAngle = Math.max(0.05, minPolar);
  controls.maxPolarAngle = Math.min(Math.PI - 0.05, maxPolar);
};

const disposeMaterial = (material: THREE.Material) => {
  const meshMaterial = material as THREE.MeshStandardMaterial;
  if (meshMaterial.map) {
    meshMaterial.map.dispose();
  }
  material.dispose();
};

const disposeMesh = (mesh: THREE.Mesh) => {
  mesh.geometry.dispose();
  if (Array.isArray(mesh.material)) {
    mesh.material.forEach(disposeMaterial);
  } else {
    disposeMaterial(mesh.material);
  }
};

export function ParallaxScene({
  layers,
  orbitSpanDegrees,
  zoomLocked,
  environmentUrl,
  className,
}: ParallaxSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const loaderRef = useRef(new THREE.TextureLoader());
  const meshesRef = useRef(new Map<string, THREE.Mesh>());
  const loadingRef = useRef(new Map<string, Promise<THREE.Texture>>());
  const layersRef = useRef(layers);
  const isMountedRef = useRef(true);
  const envMapRef = useRef<THREE.Texture | null>(null);
  const envBackgroundRef = useRef<THREE.Texture | null>(null);
  const envLoadIdRef = useRef(0);
  const lockedDistanceRef = useRef<number | null>(null);

  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const container = containerRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0.2, 7.5);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(6, 6, 6);
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.35);
    rimLight.position.set(-6, -3, 5);

    const group = new THREE.Group();
    scene.add(group);
    scene.add(ambientLight, keyLight, rimLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = MIN_DISTANCE;
    controls.maxDistance = zoomLocked ? MIN_DISTANCE : MAX_DISTANCE;
    controls.enableZoom = !zoomLocked;
    applyOrbitLimits(controls, orbitSpanDegrees);
    camera.position.set(0, 0.05, MIN_DISTANCE);
    controls.update();

    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;
    controlsRef.current = controls;
    groupRef.current = group;

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) {
        return;
      }
      const { width, height } = containerRef.current.getBoundingClientRect();
      rendererRef.current.setSize(width, height);
      rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    let frameId = 0;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
    };
    animate();

    return () => {
      isMountedRef.current = false;
      resizeObserver.disconnect();
      window.cancelAnimationFrame(frameId);
      controls.dispose();
      meshesRef.current.forEach((mesh) => {
        group.remove(mesh);
        disposeMesh(mesh);
      });
      meshesRef.current.clear();
      loadingRef.current.clear();
      if (envMapRef.current) {
        envMapRef.current.dispose();
        envMapRef.current = null;
      }
      if (envBackgroundRef.current) {
        envBackgroundRef.current.dispose();
        envBackgroundRef.current = null;
      }
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) {
      return;
    }
    applyOrbitLimits(controls, orbitSpanDegrees);
    controls.update();
  }, [orbitSpanDegrees]);

  useEffect(() => {
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    if (!controls || !camera) {
      return;
    }
    if (zoomLocked) {
      const currentDistance = camera.position.distanceTo(controls.target);
      const lockedDistance = lockedDistanceRef.current ?? currentDistance;
      lockedDistanceRef.current = lockedDistance;
      controls.enableZoom = false;
      controls.minDistance = lockedDistance;
      controls.maxDistance = lockedDistance;
      const direction = new THREE.Vector3().subVectors(
        camera.position,
        controls.target
      );
      if (direction.lengthSq() === 0) {
        direction.set(0, 0, 1);
      }
      direction.normalize().multiplyScalar(lockedDistance);
      camera.position.copy(controls.target).add(direction);
    } else {
      lockedDistanceRef.current = null;
      controls.enableZoom = true;
      controls.minDistance = MIN_DISTANCE;
      controls.maxDistance = MAX_DISTANCE;
    }
    controls.update();
  }, [zoomLocked]);

  useEffect(() => {
    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    if (!scene || !renderer) {
      return;
    }

    envLoadIdRef.current += 1;
    const loadId = envLoadIdRef.current;

    if (!environmentUrl) {
      scene.background = null;
      scene.environment = null;
      if (envMapRef.current) {
        envMapRef.current.dispose();
        envMapRef.current = null;
      }
      if (envBackgroundRef.current) {
        envBackgroundRef.current.dispose();
        envBackgroundRef.current = null;
      }
      return;
    }

    const isHdr = environmentUrl.toLowerCase().endsWith(".hdr");
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();

    if (isHdr) {
      const loader = new RGBELoader();
      loader.load(
        environmentUrl,
        (texture) => {
          if (loadId !== envLoadIdRef.current) {
            texture.dispose();
            pmrem.dispose();
            return;
          }
          const envMap = pmrem.fromEquirectangular(texture).texture;
          texture.dispose();
          pmrem.dispose();

          if (envMapRef.current) {
            envMapRef.current.dispose();
          }
          if (envBackgroundRef.current) {
            envBackgroundRef.current.dispose();
            envBackgroundRef.current = null;
          }
          envMapRef.current = envMap;
          scene.environment = envMap;
          scene.background = envMap;
        },
        undefined,
        (error) => {
          pmrem.dispose();
          console.error("Failed to load HDR environment", error);
        }
      );
      return;
    }

    const loader = new THREE.TextureLoader();
    loader.load(
      environmentUrl,
      (texture) => {
        if (loadId !== envLoadIdRef.current) {
          texture.dispose();
          pmrem.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.mapping = THREE.EquirectangularReflectionMapping;

        const envMap = pmrem.fromEquirectangular(texture).texture;
        pmrem.dispose();

        if (envMapRef.current) {
          envMapRef.current.dispose();
        }
        if (envBackgroundRef.current) {
          envBackgroundRef.current.dispose();
        }
        envMapRef.current = envMap;
        envBackgroundRef.current = texture;
        scene.environment = envMap;
        scene.background = texture;
      },
      undefined,
      (error) => {
        pmrem.dispose();
        console.error("Failed to load environment image", error);
      }
    );
  }, [environmentUrl]);

  const applyLayout = (currentLayers: LayerItem[]) => {
    const group = groupRef.current;
    if (!group) {
      return;
    }

    const sortedLayers = [...currentLayers].sort(
      (a, b) => a.order - b.order || a.name.localeCompare(b.name)
    );
    const visibleLayers = sortedLayers.filter((layer) => layer.visible);

    let totalDepth = 0;
    for (let i = 0; i < visibleLayers.length - 1; i += 1) {
      const gapAfter = visibleLayers[i]?.gapAfter ?? DEFAULT_LAYER_GAP;
      totalDepth += Math.max(0.02, gapAfter);
    }

    let depthOffset = 0;
    const lastIndex = visibleLayers.length - 1;
    visibleLayers.forEach((layer, index) => {
      const mesh = meshesRef.current.get(layer.id);
      if (!mesh) {
        if (index < lastIndex) {
          const gapAfter = layer.gapAfter ?? DEFAULT_LAYER_GAP;
          depthOffset += Math.max(0.02, gapAfter);
        }
        return;
      }
      const rotation = layer.rotation ?? DEFAULT_LAYER_ROTATION;
      mesh.visible = true;
      mesh.rotation.set(
        THREE.MathUtils.degToRad(rotation.x),
        THREE.MathUtils.degToRad(rotation.y),
        THREE.MathUtils.degToRad(rotation.z)
      );
      mesh.position.z = -(totalDepth - depthOffset);
      mesh.renderOrder = index;

      if (index < lastIndex) {
        const gapAfter = layer.gapAfter ?? DEFAULT_LAYER_GAP;
        depthOffset += Math.max(0.02, gapAfter);
      }
    });

    sortedLayers.forEach((layer) => {
      if (layer.visible) {
        return;
      }
      const mesh = meshesRef.current.get(layer.id);
      if (mesh) {
        mesh.visible = false;
      }
    });

    group.position.z = totalDepth / 2;
  };

  useEffect(() => {
    const group = groupRef.current;
    if (!group) {
      return;
    }

    const layerMap = new Map(layers.map((layer) => [layer.id, layer]));

    meshesRef.current.forEach((mesh, id) => {
      const layer = layerMap.get(id);
      if (!layer || mesh.userData.url !== layer.url) {
        group.remove(mesh);
        disposeMesh(mesh);
        meshesRef.current.delete(id);
      }
    });

    layers.forEach((layer) => {
      if (meshesRef.current.has(layer.id)) {
        return;
      }
      if (loadingRef.current.has(layer.id)) {
        return;
      }
      const loadPromise = loaderRef.current.loadAsync(layer.url);
      loadingRef.current.set(layer.id, loadPromise);

      loadPromise
        .then((texture) => {
          loadingRef.current.delete(layer.id);
          if (!isMountedRef.current) {
            texture.dispose();
            return;
          }
          const latestLayer = layersRef.current.find(
            (item) => item.id === layer.id
          );
          if (!latestLayer || latestLayer.url !== layer.url) {
            texture.dispose();
            return;
          }

          texture.colorSpace = THREE.SRGBColorSpace;
          texture.needsUpdate = true;

          const image = texture.image as HTMLImageElement;
          const aspect = image.width / image.height || 1;
          const height = BASE_LAYER_HEIGHT;
          const width = height * aspect;
          const geometry = new THREE.PlaneGeometry(width, height);
          const material = new THREE.MeshStandardMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.userData.url = latestLayer.url;
          mesh.visible = latestLayer.visible;
          meshesRef.current.set(latestLayer.id, mesh);
          group.add(mesh);

          applyLayout(layersRef.current);
        })
        .catch((error) => {
          loadingRef.current.delete(layer.id);
          console.error("Failed to load layer textures", error);
        });
    });

    applyLayout(layers);
  }, [layers]);

  return (
    <div
      ref={containerRef}
      className={className}
      aria-label="3D parallax layer viewer"
    />
  );
}
