

import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import Matter from 'matter-js';

// --- Constants ---
const PILL_COLORS = [
  '#ff6b6b', '#48dbfb', '#1dd1a1', '#feca57', '#ff9ff3', '#5f27cd', '#fcfcfc',
];
const WALL_THICKNESS = 100;
const PILL_DENSITY_FACTOR = 12000; // Larger number = fewer pills per area
const GRAVITY_SCALE = 0.2; // Sensitivity for motion controls

// --- Type Definitions ---
export interface PillPhysicsHandles {
  add: () => void;
  shake: () => void;
  clear: () => void;
}

// Custom Body type to hold texture info for our high-performance renderer
interface CustomBody extends Matter.Body {
  texture: HTMLCanvasElement;
  textureWidth: number;
  textureHeight: number;
}


// --- Helper Functions (moved outside component for performance) ---
const colorLuminance = (hex: string, lum: number): string => {
  hex = String(hex).replace(/[^0-9a-f]/gi, '');
  if (hex.length < 6) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  lum = lum || 0;
  let rgb = "#";
  for (let i = 0; i < 3; i++) {
    let c = parseInt(hex.substr(i * 2, 2), 16);
    const cHex = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
    rgb += ("00" + cHex).substr(cHex.length);
  }
  return rgb;
};

const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
};

const createPillTexture = (width: number, height: number, color: string, isCapsule: boolean): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    if (isCapsule) {
        const radius = height / 2;
        const halfWidth = width / 2;

        // Base - White part
        const whiteGrad = ctx.createLinearGradient(0, 0, 0, height);
        whiteGrad.addColorStop(0, '#ffffff');
        whiteGrad.addColorStop(1, '#d8d8d8');
        ctx.fillStyle = whiteGrad;
        drawRoundedRect(ctx, 0, 0, width, height, radius);
        ctx.fill();
        
        // Overlay - Colored part (clipped to left half)
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, halfWidth, height);
        ctx.clip();
        
        const colorGrad = ctx.createLinearGradient(0, 0, 0, height);
        colorGrad.addColorStop(0, colorLuminance(color, 0.3));
        colorGrad.addColorStop(1, colorLuminance(color, -0.3));
        ctx.fillStyle = colorGrad;
        drawRoundedRect(ctx, 0, 0, width, height, radius);
        ctx.fill();
        ctx.restore();
        
        // Seam
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(halfWidth, 2);
        ctx.lineTo(halfWidth, height - 2);
        ctx.stroke();

        // Glare
        const glareHeight = height * 0.25;
        const glareWidth = width * 0.7;
        const glareX = (width - glareWidth) / 2;
        const glareY = height * 0.2;
        
        const glareGrad = ctx.createLinearGradient(0, glareY, 0, glareY + glareHeight);
        glareGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        glareGrad.addColorStop(1, 'rgba(255, 255, 255, 0.1)');

        ctx.fillStyle = glareGrad;
        drawRoundedRect(ctx, glareX, glareY, glareWidth, glareHeight, glareHeight / 2);
        ctx.fill();

    } else { // Round Tablet
        const radius = width / 2;

        // Base color with a slight shadow to give depth
        ctx.fillStyle = colorLuminance(color, -0.2);
        ctx.beginPath();
        ctx.arc(radius, radius, radius, 0, 2 * Math.PI);
        ctx.fill();
        
        // Inner shadow to create beveled edge
        const innerShadowGrad = ctx.createRadialGradient(radius, radius, radius * 0.85, radius, radius, radius);
        innerShadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
        innerShadowGrad.addColorStop(1, 'rgba(0,0,0,0.2)');
        ctx.fillStyle = innerShadowGrad;
        ctx.beginPath();
        ctx.arc(radius, radius, radius, 0, 2 * Math.PI);
        ctx.fill();
        
        // Main surface with directional light
        const mainGrad = ctx.createRadialGradient(
            radius * 0.6, radius * 0.6, 0, 
            radius, radius, radius
        );
        mainGrad.addColorStop(0, colorLuminance(color, 0.2));
        mainGrad.addColorStop(1, color);
        ctx.fillStyle = mainGrad;
        ctx.beginPath();
        ctx.arc(radius, radius, radius * 0.9, 0, 2 * Math.PI);
        ctx.fill();
        
        // Score Line (for realism)
        const lineMargin = radius * 0.2; 
        const lineYStart = lineMargin;
        const lineYEnd = height - lineMargin;
        const lineX = radius;

        // Shadow part of the score line
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(lineX - 0.75, lineYStart);
        ctx.lineTo(lineX - 0.75, lineYEnd);
        ctx.stroke();

        // Highlight part of the score line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(lineX + 0.75, lineYStart);
        ctx.lineTo(lineX + 0.75, lineYEnd);
        ctx.stroke();

        // Glare
        const glareRadius = radius * 0.5;
        const glareGrad = ctx.createRadialGradient(
            radius * 0.7, radius * 0.7, 0, 
            radius * 0.7, radius * 0.7, glareRadius
        );
        glareGrad.addColorStop(0, 'rgba(255,255,255,0.7)');
        glareGrad.addColorStop(0.5, 'rgba(255,255,255,0.5)');
        glareGrad.addColorStop(1, 'rgba(255,255,255,0)');
        
        ctx.fillStyle = glareGrad;
        ctx.beginPath();
        ctx.arc(radius * 0.7, radius * 0.7, glareRadius, 0, 2 * Math.PI);
        ctx.fill();
    }
    return canvas;
};

const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>): void => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };
};


const PillPhysics = forwardRef<PillPhysicsHandles, {}>((props, ref) => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef(Matter.Engine.create());
  const runnerRef = useRef(Matter.Runner.create());
  const textureCache = useRef(new Map<string, HTMLCanvasElement>());
  const [motionState, setMotionState] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('unsupported');


  const addPills = (isInitial = false) => {
    const world = engineRef.current.world;
    const numPills = isInitial 
        ? Math.max(80, Math.min(240, Math.floor((window.innerWidth * window.innerHeight) / PILL_DENSITY_FACTOR)))
        : 30;
        
    for (let i = 0; i < numPills; i++) {
        const isCapsule = Math.random() > 0.4;
        const color = PILL_COLORS[Math.floor(Math.random() * PILL_COLORS.length)];
        const x = Math.random() * window.innerWidth;
        // Start pills just below the top wall so they are contained
        const y = Math.random() * 50 + 25;
        
        const commonOptions = {
            friction: 0.3,
            frictionAir: 0.01,
            restitution: 0.5,
        };

        let body: Matter.Body;
        let width: number;
        let height: number;
        const textureKey = `${color}-${isCapsule}`;
        let texture = textureCache.current.get(textureKey);

        if (isCapsule) {
            height = Math.random() * 15 + 25;
            width = height * 2.5;
            if (!texture) {
                texture = createPillTexture(width, height, color, true);
                textureCache.current.set(textureKey, texture);
            }
            body = Matter.Bodies.rectangle(x, y, width, height, { 
                ...commonOptions,
                chamfer: { radius: height / 2 },
            });
        } else {
            const radius = Math.random() * 10 + 15;
            width = height = radius * 2;
            if (!texture) {
                texture = createPillTexture(width, height, color, false);
                textureCache.current.set(textureKey, texture);
            }
            body = Matter.Bodies.circle(x, y, radius, {
                ...commonOptions,
            });
        }
        
        if (texture) {
          const customBody = body as CustomBody;
          customBody.texture = texture;
          customBody.textureWidth = width;
          customBody.textureHeight = height;
        }

        Matter.World.add(world, body);
    }
  };

  const clearPills = () => {
    const world = engineRef.current.world;
    const bodies = Matter.Composite.allBodies(world);
    bodies.forEach(body => {
        if (!body.isStatic) {
            Matter.World.remove(world, body);
        }
    });
  };

  const shakePills = () => {
    const world = engineRef.current.world;
    const bodies = Matter.Composite.allBodies(world);
    bodies.forEach(body => {
        if (!body.isStatic) {
            const forceMagnitude = 0.05 * body.mass;
            Matter.Body.applyForce(body, body.position, {
                x: (Math.random() - 0.5) * forceMagnitude * 2,
                y: (Math.random() - 0.5) * forceMagnitude * 2
            });
        }
    });
  };

  const handleMotion = (event: DeviceMotionEvent) => {
    const engine = engineRef.current;
    if (!engine || !event.accelerationIncludingGravity) return;

    const { x, y } = event.accelerationIncludingGravity;
    if (x === null || y === null) return;

    const gravity = engine.gravity;
    const orientation = screen.orientation ? screen.orientation.angle : 0;
    
    let gx: number, gy: number;

    // This mapping rotates the device's acceleration vector to match the screen's coordinate system.
    // The gravity force is the inverse of the acceleration needed to keep the device stationary.
    switch (orientation) {
      case 0: // Portrait
        gx = -x;
        gy = y;
        break;
      case 90: // Landscape, turned left
        gx = y;
        gy = x;
        break;
      case -90:
      case 270: // Landscape, turned right
        gx = -y;
        gy = -x;
        break;
      case 180: // Portrait, upside down
        gx = x;
        gy = -y;
        break;
      default: // Fallback
        gx = -x;
        gy = y;
    }

    // Apply scaling and set gravity
    gravity.x = gx * GRAVITY_SCALE;
    gravity.y = gy * GRAVITY_SCALE;
  };

  const requestMotionPermission = async () => {
    if (typeof (DeviceMotionEvent as any).requestPermission !== 'function') {
      setMotionState('granted');
      window.addEventListener('devicemotion', handleMotion);
      return;
    }
    try {
      const permission = await (DeviceMotionEvent as any).requestPermission();
      if (permission === 'granted') {
        setMotionState('granted');
        window.addEventListener('devicemotion', handleMotion);
      } else {
        setMotionState('denied');
      }
    } catch (e) {
      console.error("Failed to request motion permission:", e);
      setMotionState('denied');
    }
  };


  useImperativeHandle(ref, () => ({
    add: () => addPills(false),
    shake: shakePills,
    clear: clearPills,
  }));

  useEffect(() => {
    if (!sceneRef.current) return;
    const engine = engineRef.current;
    const world = engine.world;
    engine.gravity.y = 0.6;

    if (typeof window.DeviceMotionEvent !== 'undefined') {
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        // iOS 13+ devices need to ask for permission
        setMotionState('prompt');
      } else {
        // Android and other devices
        window.addEventListener('devicemotion', handleMotion);
        setMotionState('granted');
      }
    } else {
        setMotionState('unsupported');
    }


    const canvas = document.createElement('canvas');
    sceneRef.current.appendChild(canvas);
    const context = canvas.getContext('2d');
    if (!context) return;

    let walls: Matter.Body[] = [];
    const setupWalls = () => {
        if (walls.length > 0) Matter.World.remove(world, walls);
        const width = window.innerWidth;
        const height = window.innerHeight;
        walls = [
            Matter.Bodies.rectangle(width / 2, height + WALL_THICKNESS / 2, width + 2 * WALL_THICKNESS, WALL_THICKNESS, { isStatic: true }),
            Matter.Bodies.rectangle(-WALL_THICKNESS / 2, height / 2, WALL_THICKNESS, height * 2, { isStatic: true }),
            Matter.Bodies.rectangle(width + WALL_THICKNESS / 2, height / 2, WALL_THICKNESS, height * 2, { isStatic: true }),
            Matter.Bodies.rectangle(width / 2, -WALL_THICKNESS / 2, width + 2 * WALL_THICKNESS, WALL_THICKNESS, { isStatic: true }),
        ];
        Matter.World.add(world, walls);
    };
    
    const mouse = Matter.Mouse.create(canvas);
    const mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: { stiffness: 0.2, render: { visible: false } },
    });
    Matter.World.add(world, mouseConstraint);

    let animationFrameId: number;
    const renderLoop = () => {
      const bodies = Matter.Composite.allBodies(world);
      
      context.clearRect(0, 0, canvas.width, canvas.height);

      for (const body of bodies) {
          if (body.isStatic || !('texture' in body)) continue;
          
          const customBody = body as CustomBody;
          const { x, y } = customBody.position;
          const angle = customBody.angle;
          
          context.save();
          context.translate(x, y);
          context.rotate(angle);
          context.drawImage(
              customBody.texture,
              -customBody.textureWidth / 2,
              -customBody.textureHeight / 2,
              customBody.textureWidth,
              customBody.textureHeight
          );
          context.restore();
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };
    
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      Matter.Mouse.setOffset(mouse, { x: 0, y: 0 });
      Matter.Mouse.setScale(mouse, { x: 1, y: 1 });
      setupWalls();
    };
    
    const debouncedResize = debounce(handleResize, 250);
    window.addEventListener('resize', debouncedResize);
    
    handleResize();
    addPills(true);

    Matter.Runner.run(runnerRef.current, engine);
    renderLoop();
    
    return () => {
      window.removeEventListener('resize', debouncedResize);
      window.removeEventListener('devicemotion', handleMotion);
      cancelAnimationFrame(animationFrameId);
      Matter.Runner.stop(runnerRef.current);
      if (canvas) canvas.remove();
      Matter.World.clear(world, false);
      Matter.Engine.clear(engine);
    };
  }, []);

  return (
    <>
      <div ref={sceneRef} className="absolute top-0 left-0 w-full h-full z-0" />
      {motionState === 'prompt' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-gray-900/80 backdrop-blur-sm p-4 text-center">
            <h3 className="text-2xl font-bold text-white mb-2">Включить управление движением</h3>
            <p className="text-gray-300 mb-6 max-w-sm">
              Это приложение использует датчики движения вашего устройства для управления симуляцией. Пожалуйста, предоставьте разрешение.
            </p>
            <button
              onClick={requestMotionPermission}
              className="motion-button"
            >
              Разрешить доступ
            </button>
        </div>
      )}
      {motionState === 'denied' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-red-900/80 text-white text-sm px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm">
            Доступ к датчикам движения запрещен.
          </div>
      )}
      <style>{`
        .motion-button {
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          font-weight: 600;
          text-align: center;
          color: white;
          background-image: linear-gradient(to right, #48dbfb 0%, #1dd1a1 100%);
          border: none;
          border-radius: 0.5rem;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          cursor: pointer;
        }
        .motion-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(72, 219, 251, 0.4);
        }
        .motion-button:active {
          transform: translateY(0px) scale(0.98);
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </>
  );
});

export default PillPhysics;