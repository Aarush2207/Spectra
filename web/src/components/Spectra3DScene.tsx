import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SpectraRobot } from '../lib/SpectraRobot';
import { GlassShardScene } from '../lib/GlassShardScene';
import { RobotState } from '../types/robot';

interface Spectra3DSceneProps {
  robotState?: RobotState;
  isShattered?: boolean;
  activeView?: 'scanner' | 'ai' | 'benchmark';
}

export const Spectra3DScene: React.FC<Spectra3DSceneProps> = ({
  robotState = 'idle',
  isShattered = false,
  activeView = 'scanner'
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const robotRef = useRef<SpectraRobot | null>(null);
  const glassRef = useRef<GlassShardScene | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;

    // 1. Scene, Camera, High-Performance WebGL Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      42,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 7.0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    container.appendChild(renderer.domElement);

    // 2. Black-Stage Studio Lighting
    // Subtle ambient illumination
    const ambientLight = new THREE.AmbientLight(0x0e0e18, 1.2);
    scene.add(ambientLight);

    // Centered Soft Violet Radial Glow behind Nova
    const stageBackGlow = new THREE.PointLight(0x8055e8, 3.5, 9.0);
    stageBackGlow.position.set(0, 0.4, -1.8);
    scene.add(stageBackGlow);

    // Warm Crisp Key Light
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(2.5, 4.5, 3.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    // Rim Violet Light
    const rimViolet = new THREE.DirectionalLight(0x9d72ff, 2.5);
    rimViolet.position.set(-3.5, 2.5, -2.5);
    scene.add(rimViolet);

    // Facet Specular Highlight Light
    const facetLight = new THREE.DirectionalLight(0xc4b5fd, 2.8);
    facetLight.position.set(-2.0, 3.5, 3.5);
    scene.add(facetLight);

    // Warm Amber Fill Light
    const fillOrange = new THREE.PointLight(0xff9a6a, 1.1, 7.0);
    fillOrange.position.set(2.0, -1.5, 2.2);
    scene.add(fillOrange);

    // 3. Subtle Restrained Ambient Laboratory Particle Drift
    const particleCount = 38;
    const particleGeom = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 14;
      particlePositions[i + 1] = (Math.random() - 0.5) * 10;
      particlePositions[i + 2] = (Math.random() - 0.5) * 5 - 1.2;
    }
    particleGeom.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0xb9abff,
      size: 0.035,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeom, particleMat);
    scene.add(particles);

    // 4. Centered 3D Character (Nova Robot)
    const robot = new SpectraRobot();
    robotRef.current = robot;
    scene.add(robot.group);

    // 5. Facet Glass Shards Perimeter Architecture
    const glass = new GlassShardScene();
    glassRef.current = glass;
    scene.add(glass.group);

    // Responsive Positioning: Balanced Two-Column on Desktop, Stacked on Mobile/Tablet
    const updateLayout = () => {
      const width = window.innerWidth;
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;

      if (isMobile) {
        // Mobile: Dedicated visual arena below headline & CTAs, zero text collision
        robot.group.position.set(0, -1.15, 0.0);
        robot.group.scale.set(0.72, 0.72, 0.72);

        glass.group.position.set(0, -1.15, 0.15);
        glass.group.scale.set(0.55, 0.55, 0.55);
        stageBackGlow.position.set(0, -1.0, -1.8);
      } else if (isTablet) {
        // Tablet: Centered with ample scale
        robot.group.position.set(0, 0.30, 0.0);
        robot.group.scale.set(1.15, 1.15, 1.15);

        glass.group.position.set(0, 0.30, 0.20);
        glass.group.scale.set(0.88, 0.88, 0.88);
        stageBackGlow.position.set(0, 0.45, -1.8);
      } else {
        // Desktop: High-presence visual stage on the right half, zero collision with left typography
        robot.group.position.set(1.42, -0.06, 0.1);
        robot.group.scale.set(1.36, 1.36, 1.36);

        glass.group.position.set(1.42, -0.06, 0.25);
        glass.group.scale.set(1.05, 1.05, 1.05);
        stageBackGlow.position.set(1.42, 0.35, -1.8);
      }
    };

    updateLayout();

    // 6. Pointer Tracking Coordinates
    let normalizedX = 0;
    let normalizedY = 0;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      normalizedX = (clientX / window.innerWidth) * 2 - 1;
      normalizedY = -(clientY / window.innerHeight) * 2 + 1;

      // Pass coordinates to robot & glass shards
      robot.setLookTarget(normalizedX, normalizedY);
      glass.setPointer(normalizedX, normalizedY, camera);
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });

    // 7. Resize Handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      updateLayout();
    };

    window.addEventListener('resize', handleResize);

    // 8. Render Loop with Visibility Optimization & Particle Drift
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (document.hidden) return;

      const delta = Math.min(clock.getDelta(), 0.1);
      const time = clock.getElapsedTime();

      // Animate Nova Robot
      robot.update(delta, time);

      // Animate Glass Shards
      glass.update(delta, time, normalizedX, normalizedY);

      // Gentle laboratory particles drift
      particles.rotation.y = time * 0.015;
      particles.rotation.x = Math.sin(time * 0.02) * 0.04;

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('resize', handleResize);

      robot.dispose();
      glass.dispose();
      particleGeom.dispose();
      particleMat.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update robot state when prop changes
  useEffect(() => {
    if (robotRef.current) {
      robotRef.current.setState(robotState);
    }
  }, [robotState]);

  // Update glass shard shatter state when prop changes
  useEffect(() => {
    if (glassRef.current) {
      if (isShattered) {
        glassRef.current.shatter();
      } else {
        glassRef.current.reassemble();
      }
    }
  }, [isShattered]);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 pointer-events-none z-10 overflow-hidden select-none"
      aria-hidden="true"
    />
  );
};
