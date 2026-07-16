"use client";

import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { cn } from "@/lib/utils";

export interface PanoramaHotspot {
  id: string;
  label: string;
  lat: number;
  lng: number;
  type: "navigation" | "info" | "alert";
}

export interface PanoramaViewerProps {
  imageUrl?: string;
  videoElement?: HTMLVideoElement;
  hotspots?: PanoramaHotspot[];
  onHotspotClick?: (id: string) => void;
  className?: string;
  autoRotate?: boolean;
}

const HOTSPOT_COLORS: Record<PanoramaHotspot["type"], string> = {
  navigation: "#00e5ff",
  info: "#ffb300",
  alert: "#ff1744",
};

const HOTSPOT_RING_COLORS: Record<PanoramaHotspot["type"], string> = {
  navigation: "rgba(0, 229, 255, 0.3)",
  info: "rgba(255, 179, 0, 0.3)",
  alert: "rgba(255, 23, 68, 0.3)",
};

function latLngToVector3(
  lat: number,
  lng: number,
  radius: number
): THREE.Vector3 {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lng);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

export function PanoramaViewer({
  imageUrl,
  videoElement,
  hotspots = [],
  onHotspotClick,
  className,
  autoRotate = false,
}: PanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sphereRef = useRef<THREE.Mesh | null>(null);
  const textureRef = useRef<THREE.Texture | null>(null);
  const hotspotGroupRef = useRef<THREE.Group | null>(null);
  const hotspotSpritesRef = useRef<Map<string, THREE.Sprite>>(new Map());
  const animationFrameRef = useRef<number>(0);
  const isWebGLAvailable = useRef(true);

  // Camera rotation state
  const lonRef = useRef(0);
  const latRef = useRef(0);
  const fovRef = useRef(75);
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const autoRotateRef = useRef(autoRotate);
  const lastInteractionRef = useRef(0);

  // Touch state for pinch zoom
  const lastTouchDistRef = useRef(0);

  autoRotateRef.current = autoRotate;

  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseVec = useRef(new THREE.Vector2());

  // Expose zoom/reset methods via ref-based callbacks
  const zoomIn = useCallback(() => {
    fovRef.current = Math.max(30, fovRef.current - 5);
    if (cameraRef.current) {
      cameraRef.current.fov = fovRef.current;
      cameraRef.current.updateProjectionMatrix();
    }
  }, []);

  const zoomOut = useCallback(() => {
    fovRef.current = Math.min(100, fovRef.current + 5);
    if (cameraRef.current) {
      cameraRef.current.fov = fovRef.current;
      cameraRef.current.updateProjectionMatrix();
    }
  }, []);

  const resetView = useCallback(() => {
    lonRef.current = 0;
    latRef.current = 0;
    fovRef.current = 75;
    if (cameraRef.current) {
      cameraRef.current.fov = 75;
      cameraRef.current.updateProjectionMatrix();
    }
  }, []);

  // Store callbacks on the container element so the parent page can call them
  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      (el as unknown as Record<string, unknown>).__panoramaControls = {
        zoomIn,
        zoomOut,
        resetView,
      };
    }
  }, [zoomIn, zoomOut, resetView]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check WebGL availability
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl2") || canvas.getContext("webgl");
      if (!gl) {
        isWebGLAvailable.current = false;
        return;
      }
    } catch {
      isWebGLAvailable.current = false;
      return;
    }

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Sphere geometry (inside-out)
    const geometry = new THREE.SphereGeometry(500, 64, 32);
    geometry.scale(-1, 1, 1); // Invert normals to render inside

    const material = new THREE.MeshBasicMaterial({
      color: 0x111122,
    });

    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
    sphereRef.current = sphere;

    // Hotspot group
    const hotspotGroup = new THREE.Group();
    scene.add(hotspotGroup);
    hotspotGroupRef.current = hotspotGroup;

    // Animation loop
    function animate() {
      animationFrameRef.current = requestAnimationFrame(animate);

      // Auto-rotate when idle
      if (
        autoRotateRef.current &&
        !isDraggingRef.current &&
        Date.now() - lastInteractionRef.current > 3000
      ) {
        lonRef.current += 0.02;
      }

      // Clamp latitude
      latRef.current = Math.max(-85, Math.min(85, latRef.current));

      // Convert lat/lng to camera target
      const phi = THREE.MathUtils.degToRad(90 - latRef.current);
      const theta = THREE.MathUtils.degToRad(lonRef.current);

      const target = new THREE.Vector3(
        -500 * Math.sin(phi) * Math.cos(theta),
        500 * Math.cos(phi),
        500 * Math.sin(phi) * Math.sin(theta)
      );

      camera.lookAt(target);

      // Update video texture if present
      if (
        textureRef.current &&
        videoElement &&
        videoElement.readyState >= videoElement.HAVE_CURRENT_DATA
      ) {
        textureRef.current.needsUpdate = true;
      }

      // Make hotspot sprites face camera
      hotspotSpritesRef.current.forEach((sprite) => {
        sprite.lookAt(camera.position);
      });

      renderer.render(scene, camera);
    }
    animate();

    // Mouse drag for rotation
    function onMouseDown(e: MouseEvent) {
      isDraggingRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      lastInteractionRef.current = Date.now();
    }

    function onMouseMove(e: MouseEvent) {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      lonRef.current -= dx * 0.15;
      latRef.current += dy * 0.15;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    }

    function onMouseUp() {
      isDraggingRef.current = false;
    }

    // Scroll wheel for zoom
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      lastInteractionRef.current = Date.now();
      fovRef.current = Math.max(
        30,
        Math.min(100, fovRef.current + e.deltaY * 0.05)
      );
      camera.fov = fovRef.current;
      camera.updateProjectionMatrix();
    }

    // Touch events
    function onTouchStart(e: TouchEvent) {
      lastInteractionRef.current = Date.now();
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        lastMouseRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      } else if (e.touches.length === 2) {
        isDraggingRef.current = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastTouchDistRef.current = Math.sqrt(dx * dx + dy * dy);
      }
    }

    function onTouchMove(e: TouchEvent) {
      e.preventDefault();
      if (e.touches.length === 1 && isDraggingRef.current) {
        const dx = e.touches[0].clientX - lastMouseRef.current.x;
        const dy = e.touches[0].clientY - lastMouseRef.current.y;
        lonRef.current -= dx * 0.15;
        latRef.current += dy * 0.15;
        lastMouseRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (lastTouchDistRef.current > 0) {
          const delta = lastTouchDistRef.current - dist;
          fovRef.current = Math.max(
            30,
            Math.min(100, fovRef.current + delta * 0.1)
          );
          camera.fov = fovRef.current;
          camera.updateProjectionMatrix();
        }
        lastTouchDistRef.current = dist;
      }
    }

    function onTouchEnd() {
      isDraggingRef.current = false;
      lastTouchDistRef.current = 0;
    }

    // Click for hotspot detection
    function onClick(e: MouseEvent) {
      if (!onHotspotClick || hotspotSpritesRef.current.size === 0) return;

      if (!container) return;
      const rect = container.getBoundingClientRect();
      mouseVec.current.x =
        ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseVec.current.y =
        -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseVec.current, camera);
      const sprites = Array.from(hotspotSpritesRef.current.values());
      const intersects = raycasterRef.current.intersectObjects(sprites);
      if (intersects.length > 0) {
        const sprite = intersects[0].object as THREE.Sprite;
        const id = sprite.userData.hotspotId;
        if (id) onHotspotClick(id);
      }
    }

    const el = renderer.domElement;
    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("click", onClick);

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      resizeObserver.disconnect();

      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("click", onClick);

      // Dispose Three.js resources
      hotspotSpritesRef.current.forEach((sprite) => {
        if (sprite.material instanceof THREE.SpriteMaterial) {
          sprite.material.map?.dispose();
          sprite.material.dispose();
        }
      });
      hotspotSpritesRef.current.clear();

      textureRef.current?.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      sphereRef.current = null;
      hotspotGroupRef.current = null;
    };
    // intentionally run only on mount/unmount — stable refs handle dynamic props
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update texture when imageUrl changes
  useEffect(() => {
    if (!sphereRef.current || !imageUrl) return;

    const loader = new THREE.TextureLoader();
    loader.load(
      imageUrl,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        textureRef.current?.dispose();
        textureRef.current = texture;

        const material = sphereRef.current!.material as THREE.MeshBasicMaterial;
        material.map = texture;
        material.color.set(0xffffff);
        material.needsUpdate = true;
      },
      undefined,
      () => {
        // Texture load error — keep existing material
        console.warn("Failed to load panorama texture:", imageUrl);
      }
    );
  }, [imageUrl]);

  // Update texture when videoElement changes
  useEffect(() => {
    if (!sphereRef.current || !videoElement) return;

    const texture = new THREE.VideoTexture(videoElement);
    texture.colorSpace = THREE.SRGBColorSpace;
    textureRef.current?.dispose();
    textureRef.current = texture;

    const material = sphereRef.current.material as THREE.MeshBasicMaterial;
    material.map = texture;
    material.color.set(0xffffff);
    material.needsUpdate = true;
  }, [videoElement]);

  // Update hotspots
  useEffect(() => {
    const group = hotspotGroupRef.current;
    if (!group) return;

    // Clear existing hotspot sprites
    hotspotSpritesRef.current.forEach((sprite) => {
      group.remove(sprite);
      if (sprite.material instanceof THREE.SpriteMaterial) {
        sprite.material.map?.dispose();
        sprite.material.dispose();
      }
    });
    hotspotSpritesRef.current.clear();

    // Create new hotspot sprites
    hotspots.forEach((hs) => {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d")!;

      const color = HOTSPOT_COLORS[hs.type];
      const ringColor = HOTSPOT_RING_COLORS[hs.type];

      // Outer ring
      ctx.beginPath();
      ctx.arc(32, 32, 28, 0, Math.PI * 2);
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner circle
      ctx.beginPath();
      ctx.arc(32, 32, 16, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.3;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Center dot
      ctx.beginPath();
      ctx.arc(32, 32, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
      });
      const sprite = new THREE.Sprite(material);

      const pos = latLngToVector3(hs.lat, hs.lng, 450);
      sprite.position.copy(pos);
      sprite.scale.set(30, 30, 1);
      sprite.userData.hotspotId = hs.id;

      group.add(sprite);
      hotspotSpritesRef.current.set(hs.id, sprite);
    });
  }, [hotspots]);

  if (!isWebGLAvailable.current) {
    return (
      <div
        data-testid="panorama-viewer"
        className={cn(
          "flex items-center justify-center bg-[var(--nav-bg-primary)] text-[var(--nav-text-muted)]",
          className
        )}
      >
        <div className="text-center p-8">
          <p className="text-sm font-medium mb-2">WebGL Not Available</p>
          <p className="text-xs">
            Your browser or device does not support WebGL, which is required for
            the 360 viewer.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="panorama-viewer"
      className={cn("w-full h-full cursor-grab active:cursor-grabbing", className)}
      style={{ touchAction: "none" }}
    />
  );
}
