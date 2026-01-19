"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface ElasticHueSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
}

const ElasticHueSlider: React.FC<ElasticHueSliderProps> = ({
  value,
  onChange,
  min = 0,
  max = 360,
  step = 1,
  label = "Adjust Hue"
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const progress = (value - min) / (max - min);
  const thumbPosition = progress * 100;

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  return (
    <div
      className="relative flex w-full max-w-xl flex-col items-center md:max-w-2xl"
      ref={sliderRef}
    >
      {label && (
        <label
          htmlFor="hue-slider-native"
          className="mb-1 text-sm text-gray-300"
        >
          {label}
        </label>
      )}
      <div className="relative flex h-5 w-full items-center">
        <input
          id="hue-slider-native"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          className="absolute inset-0 z-20 h-full w-full cursor-pointer appearance-none bg-transparent"
          style={{ WebkitAppearance: "none" }}
        />

        <div className="absolute left-0 z-0 h-1 w-full rounded-full bg-gray-700" />

        <div
          className="absolute left-0 z-10 h-1 rounded-full bg-blue-500"
          style={{ width: `${thumbPosition}%` }}
        />

        <motion.div
          className="absolute z-30 top-1/2 -translate-y-1/2"
          style={{ left: `${thumbPosition}%` }}
          animate={{ scale: isDragging ? 1.2 : 1 }}
          transition={{ type: "spring", stiffness: 500, damping: isDragging ? 20 : 30 }}
        >
          <div className="h-3 w-3 rounded-full bg-white shadow-lg" />
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={value}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          transition={{ duration: 0.2 }}
          className="mt-2 text-xs text-gray-500"
        >
          {value}°
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

interface FeatureItemProps {
  name: string;
  value: string;
  position: string;
}

interface LightningProps {
  hue?: number;
  xOffset?: number;
  speed?: number;
  intensity?: number;
  size?: number;
}

const Lightning: React.FC<LightningProps> = ({
  hue = 230,
  xOffset = 0,
  speed = 1,
  intensity = 1,
  size = 1
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const gl = canvas.getContext("webgl");
    if (!gl) {
      console.error("WebGL not supported");
      return;
    }

    const vertexShaderSource = `
      attribute vec2 aPosition;
      void main() {
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      uniform vec2 iResolution;
      uniform float iTime;
      uniform float uHue;
      uniform float uXOffset;
      uniform float uSpeed;
      uniform float uIntensity;
      uniform float uSize;
      
      #define OCTAVE_COUNT 10

      vec3 hsv2rgb(vec3 c) {
          vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0,4.0,2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
          return c.z * mix(vec3(1.0), rgb, c.y);
      }

      float hash11(float p) {
          p = fract(p * .1031);
          p *= p + 33.33;
          p *= p + p;
          return fract(p);
      }

      float hash12(vec2 p) {
          vec3 p3 = fract(vec3(p.xyx) * .1031);
          p3 += dot(p3, p3.yzx + 33.33);
          return fract((p3.x + p3.y) * p3.z);
      }

      mat2 rotate2d(float theta) {
          float c = cos(theta);
          float s = sin(theta);
          return mat2(c, -s, s, c);
      }

      float noise(vec2 p) {
          vec2 ip = floor(p);
          vec2 fp = fract(p);
          float a = hash12(ip);
          float b = hash12(ip + vec2(1.0, 0.0));
          float c = hash12(ip + vec2(0.0, 1.0));
          float d = hash12(ip + vec2(1.0, 1.0));
          
          vec2 t = smoothstep(0.0, 1.0, fp);
          return mix(mix(a, b, t.x), mix(c, d, t.x), t.y);
      }

      float fbm(vec2 p) {
          float value = 0.0;
          float amplitude = 0.5;
          for (int i = 0; i < OCTAVE_COUNT; ++i) {
              value += amplitude * noise(p);
              p *= rotate2d(0.45);
              p *= 2.0;
              amplitude *= 0.5;
          }
          return value;
      }

      void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
          vec2 uv = fragCoord / iResolution.xy;
          uv = 2.0 * uv - 1.0;
          uv.x *= iResolution.x / iResolution.y;
          uv.x += uXOffset;
          
          uv += 2.0 * fbm(uv * uSize + 0.8 * iTime * uSpeed) - 1.0;
          
          float dist = abs(uv.x);
          vec3 baseColor = hsv2rgb(vec3(uHue / 360.0, 0.7, 0.8));
          vec3 col = baseColor * pow(mix(0.0, 0.07, hash11(iTime * uSpeed)) / dist, 1.0) * uIntensity;
          col = pow(col, vec3(1.0));
          fragColor = vec4(col, 1.0);
      }

      void main() {
          mainImage(gl_FragColor, gl_FragCoord.xy);
      }
    `;

    const compileShader = (source: string, type: number): WebGLShader | null => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program linking error:", gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const aPosition = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    const iResolutionLocation = gl.getUniformLocation(program, "iResolution");
    const iTimeLocation = gl.getUniformLocation(program, "iTime");
    const uHueLocation = gl.getUniformLocation(program, "uHue");
    const uXOffsetLocation = gl.getUniformLocation(program, "uXOffset");
    const uSpeedLocation = gl.getUniformLocation(program, "uSpeed");
    const uIntensityLocation = gl.getUniformLocation(program, "uIntensity");
    const uSizeLocation = gl.getUniformLocation(program, "uSize");

    const startTime = performance.now();
    const render = () => {
      resizeCanvas();
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(iResolutionLocation, canvas.width, canvas.height);
      const currentTime = performance.now();
      gl.uniform1f(iTimeLocation, (currentTime - startTime) / 1000.0);
      gl.uniform1f(uHueLocation, hue);
      gl.uniform1f(uXOffsetLocation, xOffset);
      gl.uniform1f(uSpeedLocation, speed);
      gl.uniform1f(uIntensityLocation, intensity);
      gl.uniform1f(uSizeLocation, size);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [hue, xOffset, speed, intensity, size]);

  return <canvas ref={canvasRef} className="relative h-full w-full" />;
};

const FeatureItem: React.FC<FeatureItemProps> = ({ name, value, position }) => {
  return (
    <div
      className={`group absolute ${position} z-10 transition-all duration-300 hover:scale-110`}
    >
      <div className="relative flex items-center gap-2">
        <div className="relative">
          <div className="h-2 w-2 rounded-full bg-white group-hover:animate-pulse" />
          <div className="absolute -inset-1 rounded-full bg-white/20 blur-sm opacity-70 transition-opacity duration-300 group-hover:opacity-100" />
        </div>
        <div className="relative text-white">
          <div className="font-medium transition-colors duration-300 group-hover:text-white">
            {name}
          </div>
          <div className="text-sm text-white/70 transition-colors duration-300 group-hover:text-white/70">
            {value}
          </div>
          <div className="absolute -inset-2 -z-10 rounded-lg bg-white/10 blur-md opacity-70 transition-opacity duration-300 group-hover:opacity-100" />
        </div>
      </div>
    </div>
  );
};

export const HeroSection: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lightningHue, setLightningHue] = useState(220);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  return (
    <>
      <div className="relative w-full overflow-hidden bg-black text-white">
      <div className="relative z-20 mx-auto flex h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-12 flex items-center justify-between rounded-[50px] bg-black/50 px-4 py-4 backdrop-blur-3xl"
        >
          <div className="flex items-center">
            <div className="text-2xl font-bold">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <path
                  d="M20 5L5 20L20 35L35 20L20 5Z"
                  stroke="white"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <nav className="ml-8 hidden items-center md:flex">
              <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-1 py-1 text-xs uppercase tracking-wide text-gray-300">
                <Link
                  href="/"
                  className="rounded-full px-3 py-1.5 transition-colors hover:bg-white/10"
                >
                  Home
                </Link>
                <Link
                  href="#contacts"
                  className="rounded-full px-3 py-1.5 transition-colors hover:bg-white/10"
                >
                  Contacts
                </Link>
                <Link
                  href="#help"
                  className="rounded-full px-3 py-1.5 transition-colors hover:bg-white/10"
                >
                  Help
                </Link>
                <Link
                  href="/docs"
                  className="rounded-full px-3 py-1.5 transition-colors hover:bg-white/10"
                >
                  Whitepaper
                </Link>
              </div>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <a
              href="https://x.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center justify-center rounded-full bg-gray-800/80 p-2 text-sm backdrop-blur-sm transition-colors hover:bg-gray-700/80 md:flex"
              aria-label="Follow us on X"
            >
              <svg
                className="h-5 w-5"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <button className="hidden rounded-full bg-gradient-to-r from-blue-600/80 to-purple-600/80 px-4 py-2 text-sm font-medium backdrop-blur-sm transition-colors hover:from-blue-600 hover:to-purple-600 md:block">
              $NEXX on Surge
            </button>
            <button className="rounded-full bg-gray-800/80 px-4 py-2 text-sm backdrop-blur-sm transition-colors hover:bg-gray-700/80">
              Application
            </button>
            <button
              className="rounded-md p-2 md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </motion.div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-lg md:hidden"
            >
              <div className="flex h-full flex-col items-center justify-center space-y-6 text-lg">
                <button
                  className="absolute right-6 top-6 p-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                <Link
                  href="/"
                  className="px-6 py-3 text-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Home
                </Link>
                <Link
                  href="#contacts"
                  className="px-6 py-3 text-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Contacts
                </Link>
                <Link
                  href="#help"
                  className="px-6 py-3 text-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Help
                </Link>
                <Link
                  href="/docs"
                  className="px-6 py-3 text-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Whitepaper
                </Link>
                <a
                  href="https://x.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-6 py-3 text-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  Follow on X
                </a>
                <button className="rounded-full bg-gradient-to-r from-blue-600/80 to-purple-600/80 px-6 py-3 font-medium backdrop-blur-sm transition-colors hover:from-blue-600 hover:to-purple-600">
                  $NEXX on Surge
                </button>
                <button className="rounded-full bg-gray-800/80 px-6 py-3 backdrop-blur-sm">
                  Application
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative top-[30%] z-[200] w-full"
        >
          <motion.div variants={itemVariants}>
            <FeatureItem
              name="AI Engine"
              value="generates lightning"
              position="left-0 top-40 sm:left-10"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <FeatureItem
              name="Neural Network"
              value="learns patterns"
              position="left-1/4 top-24"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <FeatureItem
              name="Real-time AI"
              value="adapts instantly"
              position="right-1/4 top-24"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <FeatureItem
              name="Lightning AI"
              value="creates beauty"
              position="right-0 top-40 sm:right-10"
            />
          </motion.div>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-30 mx-auto flex max-w-4xl flex-col items-center text-center"
        >
          <ElasticHueSlider
            value={lightningHue}
            onChange={setLightningHue}
            label="Adjust Lightning Hue"
          />

          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="group mb-6 flex items-center space-x-2 rounded-full bg-white/5 px-4 py-2 text-sm backdrop-blur-sm transition-all duration-300 hover:bg-white/10"
          >
            <span>Experience AI-Generated Lightning</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="transform transition-transform duration-300 group-hover:translate-x-1"
            >
              <path
                d="M8 3L13 8L8 13M13 8H3"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.button>

          <motion.h1
            variants={itemVariants}
            className="mb-2 text-5xl font-light md:text-7xl"
          >
           Nexx AI
          </motion.h1>

          <motion.h2
            variants={itemVariants}
            className="pb-3 text-3xl font-light bg-gradient-to-r from-gray-100 via-gray-200 to-gray-300 bg-clip-text text-transparent md:text-5xl"
          >
            AI-Based Lightning Animation
          </motion.h2>

          <motion.p
            variants={itemVariants}
            className="mb-9 max-w-2xl text-gray-400"
          >
            Our proprietary AI generates stunning lightning animations in real-time.
            Every bolt, every flash, every movement is created by our intelligent system.
          </motion.p>

          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="mt-[100px] rounded-full bg-white/10 px-8 py-3 backdrop-blur-sm transition-colors hover:bg-white/20 sm:mt-[100px]"
          >
            Launch soon
          </motion.button>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="absolute inset-0 z-0"
      >
        <div className="absolute inset-0 bg-black/80" />

        <div className="absolute top-[55%] left-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-b from-blue-500/20 to-purple-600/10 blur-3xl" />

        <div className="absolute left-1/2 top-0 h-full w-full -translate-x-1/2">
          <Lightning
            hue={lightningHue}
            xOffset={0}
            speed={1.6}
            intensity={0.6}
            size={2}
          />
        </div>

        <div className="absolute top-[55%] left-1/2 z-10 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_25%_90%,_#1e386b_15%,_#000000de_70%,_#000000ed_100%)] backdrop-blur-3xl" />
      </motion.div>
      </div>
      {/* Our Partners section */}
      <section className="bg-black px-4 py-20 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#9b87f5]">
              Our Partners
            </p>
            <h2 className="mb-3 text-3xl font-light md:text-4xl">
              Trusted by leading companies
            </h2>
            <p className="text-sm text-gray-400 md:text-base">
              We work with innovative organizations that share our vision for AI-powered experiences.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {[
              "TechCorp Solutions",
              "InnovateAI Labs",
              "Digital Dynamics",
              "Future Systems",
              "Quantum Ventures",
              "Neural Networks Inc",
              "Cloud Innovations",
              "Smart Tech Group"
            ].map((company, index) => (
              <div
                key={index}
                className="flex items-center justify-center rounded-xl bg-white/5 p-6 backdrop-blur-sm transition-all duration-300 hover:bg-white/10"
              >
                <p className="text-lg font-medium text-white blur-md select-none">
                  {company}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Help / FAQ section */}
      <section
        id="help"
        className="bg-black px-4 py-20 text-white sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#9b87f5]">
              Help &amp; FAQ
            </p>
            <h2 className="mb-3 text-3xl font-light md:text-4xl">
              Answers to common questions
            </h2>
            <p className="text-sm text-gray-400 md:text-base">
              Lightning AI is our proprietary artificial intelligence system that creates stunning lightning animations.
              Below are quick answers so visitors immediately understand how our AI works.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex h-full flex-col rounded-2xl bg-white/5 p-5 text-left backdrop-blur-sm">
              <h3 className="mb-2 text-base font-semibold text-white">
                How does our AI create lightning?
              </h3>
              <p className="text-sm text-gray-400">
                Our AI uses advanced neural networks trained on thousands of lightning patterns.
                It generates each bolt in real-time, adapting colors, intensity, and movement
                based on learned patterns and user preferences.
              </p>
            </div>

            <div className="flex h-full flex-col rounded-2xl bg-white/5 p-5 text-left backdrop-blur-sm">
              <h3 className="mb-2 text-base font-semibold text-white">
                Can I control the AI-generated lightning?
              </h3>
              <p className="text-sm text-gray-400">
                Yes. Our AI responds to your adjustments in real-time. Change the hue, and the AI
                adapts the entire lightning pattern instantly, maintaining natural-looking behavior
                while following your preferences.
              </p>
            </div>

            <div className="flex h-full flex-col rounded-2xl bg-white/5 p-5 text-left backdrop-blur-sm">
              <h3 className="mb-2 text-base font-semibold text-white">
                What makes our Lightning AI unique?
              </h3>
              <p className="text-sm text-gray-400">
                Unlike pre-rendered animations, our AI generates lightning procedurally. Every frame
                is unique, every pattern is learned, and every movement feels natural because it&apos;s
                created by intelligence, not code alone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contacts section */}
      <section
        id="contacts"
        className="bg-black px-4 pb-24 text-white sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#9b87f5]">
              Contacts
            </p>
            <h2 className="mb-3 text-3xl font-light md:text-4xl">
              Get in touch with the team
            </h2>
              <p className="text-sm text-gray-400 md:text-base">
                Connect with us to learn more about our Lightning AI technology — whether for
                feedback, collaborations, or questions about how our AI creates these stunning animations.
              </p>
          </div>

          <div className="grid gap-6">
            <form className="space-y-4 rounded-2xl bg-white/5 p-5 text-left backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white">Quick message</h3>
              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Your email
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none transition-colors focus:border-white/40"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Your message
                </label>
                <textarea
                  placeholder="Share your idea, question, or feedback…"
                  rows={4}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none transition-colors focus:border-white/40"
                />
              </div>
              <button
                type="button"
                className="w-full rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/25"
              >
                Send (mock)
              </button>
            </form>
          </div>
        </div>
      </section>
      <footer className="border-t border-white/10 bg-black px-4 py-6 text-xs text-gray-500 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <p className="text-sm text-gray-300">
            Stay in touch:{" "}
            <a
              href="mailto:hello@lightning-ai.com"
              className="underline decoration-white/30 underline-offset-4 hover:decoration-white"
            >
              hello@lightning-ai.com
            </a>
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://x.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center rounded-full bg-gray-800/80 p-2 text-sm backdrop-blur-sm transition-colors hover:bg-gray-700/80"
              aria-label="Follow us on X"
            >
              <svg
                className="h-5 w-5"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <p className="text-xs text-gray-500">Lightning AI © 2026</p>
          </div>
        </div>
      </footer>
    </>
  );
};


