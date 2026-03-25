'use client';
import { cn } from '@/lib/utils';
import { useTheme } from '@/src/contexts/ThemeContext';
import React, { useEffect, useRef, memo } from 'react';
import * as THREE from 'three';

type DottedSurfaceProps = Omit<React.ComponentProps<'div'>, 'ref'>;

export const DottedSurface = memo(({ className, ...props }: DottedSurfaceProps) => {
	const { theme } = useTheme();
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const requestRef = useRef<number | null>(null);
	const countRef = useRef(0);

	useEffect(() => {
		if (!canvasRef.current) return;

		const SEPARATION = 150;
		const AMOUNTX = 40;
		const AMOUNTY = 60;

		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 10000);
		camera.position.set(0, 355, 1220);

		const renderer = new THREE.WebGLRenderer({
			canvas: canvasRef.current,
			alpha: true,
			antialias: true,
		});
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(window.innerWidth, window.innerHeight, false);

		const numPoints = AMOUNTX * AMOUNTY;
		const positions = new Float32Array(numPoints * 3);
		const colors = new Float32Array(numPoints * 3);

		for (let i = 0; i < numPoints; i++) {
			const ix = Math.floor(i / AMOUNTY);
			const iy = i % AMOUNTY;
			positions[i * 3] = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2;
			positions[i * 3 + 1] = 0;
			positions[i * 3 + 2] = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2;
			
			const c = theme === 'dark' ? 0.7 : 0.3;
			colors[i * 3] = c;
			colors[i * 3 + 1] = c;
			colors[i * 3 + 2] = theme === 'dark' ? 1 : c;
		}

		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

		const material = new THREE.PointsMaterial({
			size: 8,
			vertexColors: true,
			transparent: true,
			opacity: 0.8,
			sizeAttenuation: true,
		});

		const points = new THREE.Points(geometry, material);
		scene.add(points);

		const animate = () => {
			const posArr = geometry.attributes.position.array as Float32Array;
			const count = countRef.current;
			for (let i = 0; i < numPoints; i++) {
				const ix = Math.floor(i / AMOUNTY);
				const iy = i % AMOUNTY;
				posArr[i * 3 + 1] = Math.sin((ix + count) * 0.3) * 150 + Math.sin((iy + count) * 0.5) * 150;
			}
			geometry.attributes.position.needsUpdate = true;
			points.rotation.y += 0.0005;

			renderer.render(scene, camera);
			countRef.current += 0.04;
			requestRef.current = requestAnimationFrame(animate);
		};

		const handleResize = () => {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(window.innerWidth, window.innerHeight, false);
		};

		window.addEventListener('resize', handleResize);
		requestRef.current = requestAnimationFrame(animate);

		return () => {
			window.removeEventListener('resize', handleResize);
			if (requestRef.current) cancelAnimationFrame(requestRef.current);
			renderer.dispose();
			geometry.dispose();
			material.dispose();
		};
	}, [theme]);

	return (
		<canvas
			ref={canvasRef}
			className={cn('pointer-events-none fixed inset-0', className)}
			style={{ 
				zIndex: 0, 
				width: '100vw', 
				height: '100vh',
				background: 'transparent'
			}}
			{...props}
		/>
	);
});

DottedSurface.displayName = 'DottedSurface';
