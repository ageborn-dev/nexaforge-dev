"use client";

import React, { useEffect, useRef } from 'react';

const ModernAnimatedBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Enhanced setSize function for better responsiveness
    const setSize = () => {
      const pixelRatio = window.devicePixelRatio || 1;
      const { width, height } = container.getBoundingClientRect();
      
      // Set actual pixel dimensions
      canvas.width = width * pixelRatio;
      canvas.height = height * pixelRatio;
      
      // Set display dimensions
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      
      // Scale context to device pixel ratio
      ctx.scale(pixelRatio, pixelRatio);
      
      // Update particle density based on screen size
      const area = width * height;
      const baseParticles = 100;
      const density = 50000; // square pixels per particle
      const targetParticles = Math.min(Math.max(Math.floor(area / density), baseParticles), 200);
      
      // Adjust particle count
      while (particles.length < targetParticles) {
        particles.push(createParticle());
      }
      while (particles.length > targetParticles) {
        particles.pop();
      }
    };

    // Enhanced particle configuration
    interface Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
      color: 'blue' | 'gray';
      grayTone: number;
      pulseSpeed: number;
      pulseOffset: number;
      energyLevel: number;
    }

    const particles: Particle[] = [];

    const createParticle = (): Particle => {
      const { width, height } = container.getBoundingClientRect();
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: (Math.random() - 0.5) * 0.4,
        opacity: Math.random() * 0.4 + 0.2,
        color: Math.random() > 0.7 ? 'blue' : 'gray',
        grayTone: Math.floor(Math.random() * 20) + 156,
        pulseSpeed: Math.random() * 0.02 + 0.01,
        pulseOffset: Math.random() * Math.PI * 2,
        energyLevel: Math.random()
      };
    };

    // Initialize particles (will be adjusted by setSize)
    for (let i = 0; i < 100; i++) {
      particles.push(createParticle());
    }

    let gradientAngle = 0;
    const mousePosition = { x: 0, y: 0 };
    let isMouseMoving = false;
    let mouseTimeout: NodeJS.Timeout;

    // Mouse interaction with correct positioning
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mousePosition.x = e.clientX - rect.left;
      mousePosition.y = e.clientY - rect.top;
      isMouseMoving = true;
      
      clearTimeout(mouseTimeout);
      mouseTimeout = setTimeout(() => {
        isMouseMoving = false;
      }, 100);
    };

    // Initial setup
    setSize();

    // Event listeners with debouncing for resize
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(setSize, 250);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    const getParticleColor = (particle: Particle, opacity: number) => {
      if (particle.color === 'blue') {
        const energy = particle.energyLevel * 20 + 40;
        return `rgba(${energy}, ${energy + 140}, ${255}, ${opacity})`;
      }
      return `rgba(${particle.grayTone}, ${particle.grayTone}, ${particle.grayTone}, ${opacity})`;
    };

    const animate = () => {
      if (!ctx || !canvas || !container) return;

      const { width, height } = container.getBoundingClientRect();

      // Clear canvas with gradient background
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradientAngle += 0.001;
      const offset = Math.sin(gradientAngle) * 0.1 + 0.1;
      
      gradient.addColorStop(0, 'rgba(75, 85, 99, 0.1)');
      gradient.addColorStop(0.5 + offset, 'rgba(55, 65, 81, 0.1)');
      gradient.addColorStop(1, 'rgba(31, 41, 55, 0.1)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Draw particles with modern effects
      particles.forEach((particle) => {
        // Update position
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        // Wrap around edges with proper boundaries
        if (particle.x > width) particle.x = 0;
        if (particle.x < 0) particle.x = width;
        if (particle.y > height) particle.y = 0;
        if (particle.y < 0) particle.y = height;

        // Energy pulsing for blue particles
        if (particle.color === 'blue') {
          particle.energyLevel = 0.5 + Math.sin(Date.now() * 0.002 + particle.pulseOffset) * 0.5;
        }

        // Pulse animation
        const pulse = Math.sin(Date.now() * particle.pulseSpeed + particle.pulseOffset) * 0.5 + 0.5;
        const size = particle.size * (1 + pulse * 0.3);

        // Mouse interaction effect
        if (isMouseMoving) {
          const dx = mousePosition.x - particle.x;
          const dy = mousePosition.y - particle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const maxDistance = Math.min(150, width * 0.1); // Responsive interaction radius

          if (distance < maxDistance) {
            const force = (1 - distance / maxDistance) * 0.2;
            particle.x -= dx * force;
            particle.y -= dy * force;
            
            if (particle.color === 'blue') {
              particle.energyLevel = Math.min(particle.energyLevel + 0.1, 1);
            }
          }
        }

        // Draw particle with modern gradient
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, size * 2
        );

        gradient.addColorStop(0, getParticleColor(particle, particle.opacity));
        gradient.addColorStop(1, getParticleColor(particle, 0));

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      // Enhanced connecting lines with responsive distance
      const maxLineDistance = Math.min(120, width * 0.08); // Responsive line length
      particles.forEach((particle, i) => {
        particles.slice(i + 1).forEach(other => {
          const dx = particle.x - other.x;
          const dy = particle.y - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < maxLineDistance) {
            const opacity = (1 - distance / maxLineDistance) * 0.15;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(other.x, other.y);
            
            const gradient = ctx.createLinearGradient(
              particle.x, particle.y,
              other.x, other.y
            );
            
            gradient.addColorStop(0, getParticleColor(particle, opacity));
            gradient.addColorStop(1, getParticleColor(other, opacity));
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });
      });

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(resizeTimeout);
      clearTimeout(mouseTimeout);
    };
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 w-full h-full">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 -z-10"
        style={{ 
          filter: 'blur(0.5px) contrast(1.1)',
          backgroundColor: 'rgb(243, 244, 246)'
        }}
      />
    </div>
  );
};

export default ModernAnimatedBackground;