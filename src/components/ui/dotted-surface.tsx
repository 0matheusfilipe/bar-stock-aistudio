'use client';
import { cn } from '@/lib/utils';
import { useTheme } from '@/src/contexts/ThemeContext';
import React, { useEffect, useRef, memo } from 'react';
import * as THREE from 'three';

type DottedSurfaceProps = Omit<React.ComponentProps<'div'>, 'ref'>;

export const DottedSurface = memo(({ className, ...props }: DottedSurfaceProps) => {
	const { theme } = useTheme();
	const containerRef = useRef<HTMLDivElement>(null);
	const requestRef = useRef<number | null>(null);
	const countRef = useRef(0);
	const contextRef = useRef<{
		scene: THREE.Scene;
		camera: THREE.PerspectiveCamera;
		renderer: THREE.WebGLRenderer;
		points: THREE.Points;
		geometry: THREE.BufferGeometry;
		material: THREE.PointsMaterial;
	} | null>(null);

	useEffect(() => {
		if (!containerRef.current) return;

		const SEPARATION = 150;
		const AMOUNTX = 40;
		const AMOUNTY = 60;

		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 10000);
		camera.position.set(0, 355, 1220);

		const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(window.innerWidth, window.innerHeight);
		containerRef.current.appendChild(renderer.domElement);

		const numPoints = AMOUNTX * AMOUNTY;
		const positions = new Float32Array(numPoints * 3);
		const colors = new Float32Array(numPoints * 3);

		for (let i = 0; i < numPoints; i++) {
			const ix = Math.floor(i / AMOUNTY);
			const iy = i % AMOUNTY;
			positions[i * 3] = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2;
			positions[i * 3 + 1] = 0;
			positions[i * 3 + 2] = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2;

			if (theme === 'dark') {
				colors[i * 3] = 0.7; colors[i * 3 + 1] = 0.7; colors[i * 3 + 2] = 1;
			} else {
				colors[i * 3] = 0.2; colors[i * 3 + 1] = 0.2; colors[i * 3 + 2] = 0.2;
			}
		}

		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

		const material = new THREE.PointsMaterial({
			size: 10,
			vertexColors: true,
			transparent: true,
			opacity: 0.8,
			sizeAttenuation: true,
		});

		const points = new THREE.Points(geometry, material);
		scene.add(points);

		contextRef.current = { scene, camera, renderer, points, geometry, material };

		const animate = () => {
			if (!contextRef.current) return;
			const { geometry, points, renderer, scene, camera } = contextRef.current;
			
			const posArr = geometry.attributes.position.array as Float32Array;
			for (let ix = 0; ix < AMOUNTX; ix++) {
				for (let iy = 0; iy < AMOUNTY; iy++) {
					const index = (ix * AMOUNTY + iy) * 3;
					posArr[index + 1] = Math.sin((ix + countRef.current) * 0.3) * 150 + Math.sin((iy + countRef.current) * 0.5) * 150;
				}
			}
			geometry.attributes.position.needsUpdate = true;
			points.rotation.y += 0.0005;

			renderer.render(scene, camera);
			countRef.current += 0.04; 
			requestRef.current = requestAnimationFrame(animate);
		};

		const handleResize = () => {
			if (!contextRef.current) return;
			const { camera, renderer } = contextRef.current;
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(window.innerWidth, window.innerHeight);
		};

		window.addEventListener('resize', handleResize);
		requestRef.current = requestAnimationFrame(animate);

		return () => {
			window.removeEventListener('resize', handleResize);
			if (requestRef.current) cancelAnimationFrame(requestRef.current);
			if (contextRef.current) {
				const { renderer, geometry, material } = contextRef.current;
				renderer.dispose();
				geometry.dispose();
				material.dispose();
				if (containerRef.current) containerRef.current.innerHTML = '';
			}
			contextRef.current = null;
		};
	}, [theme]);

	return (
		<div
			ref={containerRef}
			className={cn('pointer-events-none fixed inset-0 z-0 bg-transparent', className)}
			style={{ visibility: 'visible' }}
			{...props}
		/>
	);
});

DottedSurface.displayName = 'DottedSurface';
