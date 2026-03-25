'use client';
import { cn } from '@/lib/utils';
import { useTheme } from '@/src/contexts/ThemeContext';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

type DottedSurfaceProps = Omit<React.ComponentProps<'div'>, 'ref'>;

export function DottedSurface({ className, ...props }: DottedSurfaceProps) {
	const { theme } = useTheme();
	const containerRef = useRef<HTMLDivElement>(null);
	const requestRef = useRef<number | null>(null);

	useEffect(() => {
		if (!containerRef.current) return;

		const SEPARATION = 150;
		const AMOUNTX = 40;
		const AMOUNTY = 60;

		const scene = new THREE.Scene();
		const fogColor = theme === 'dark' ? 0x000000 : 0xffffff;
		scene.fog = new THREE.Fog(fogColor, 2000, 10000);

		const camera = new THREE.PerspectiveCamera(
			60,
			window.innerWidth / window.innerHeight,
			1,
			10000,
		);
		camera.position.set(0, 355, 1220);

		const renderer = new THREE.WebGLRenderer({
			alpha: true,
			antialias: true,
		});
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setClearColor(fogColor, 0);

		containerRef.current.appendChild(renderer.domElement);

		const positions = new Float32Array(AMOUNTX * AMOUNTY * 3);
		const colors = new Float32Array(AMOUNTX * AMOUNTY * 3);

		for (let ix = 0; ix < AMOUNTX; ix++) {
			for (let iy = 0; iy < AMOUNTY; iy++) {
				const index = (ix * AMOUNTY + iy) * 3;
				positions[index] = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2;
				positions[index + 1] = 0;
				positions[index + 2] = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2;

				if (theme === 'dark') {
					colors[index] = 0.7;
					colors[index + 1] = 0.7;
					colors[index + 2] = 1;
				} else {
					colors[index] = 0.3;
					colors[index + 1] = 0.3;
					colors[index + 2] = 0.3;
				}
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

		let count = 0;
		const animate = () => {
			const positionAttribute = geometry.attributes.position;
			const array = positionAttribute.array as Float32Array;

			let i = 0;
			for (let ix = 0; ix < AMOUNTX; ix++) {
				for (let iy = 0; iy < AMOUNTY; iy++) {
					const index = i * 3;
					array[index + 1] =
						Math.sin((ix + count) * 0.3) * 150 +
						Math.sin((iy + count) * 0.5) * 150;
					i++;
				}
			}

			positionAttribute.needsUpdate = true;
			points.rotation.y += 0.0005;
			
			renderer.render(scene, camera);
			count += 0.02;
			requestRef.current = requestAnimationFrame(animate);
		};

		const handleResize = () => {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(window.innerWidth, window.innerHeight);
		};

		window.addEventListener('resize', handleResize);
		requestRef.current = requestAnimationFrame(animate);

		return () => {
			window.removeEventListener('resize', handleResize);
			if (requestRef.current) cancelAnimationFrame(requestRef.current);
			
			renderer.dispose();
			geometry.dispose();
			material.dispose();
			if (containerRef.current && renderer.domElement) {
				containerRef.current.removeChild(renderer.domElement);
			}
		};
	}, [theme]);

	return (
		<div
			ref={containerRef}
			className={cn('pointer-events-none fixed inset-0 z-[100] overflow-hidden', className)}
			{...props}
		/>
	);
}
