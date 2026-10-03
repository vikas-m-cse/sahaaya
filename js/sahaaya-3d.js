/**
 * SAHAAYA — Premium Three.js 3D Hero Background
 * 
 * Features:
 * - Floating glass-like spheres & geometric structures (icosahedrons, tori)
 * - Deep navy, purple, and electric-cyan lighting
 * - Subtle floating stardust particle field
 * - Smooth lerped mouse parallax
 * - Responsive rendering with accurate container bounds
 * - Full reduced-motion (prefers-reduced-motion) support
 * - GPU optimized (pixel-ratio clamping, powerPreference)
 * - Behind all UI layers, zero interference with scrolling or buttons
 */

(async function initSahaaya3D() {
  const host = document.getElementById("sahaaya-3d");
  if (!host) return;

  try {
    // 1. Resolve Three.js (prefer already-loaded CDN UMD, fallback to module import)
    let THREE = window.THREE;
    if (!THREE) {
      THREE = await import("https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js");
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 2. Scene & Camera Setup
    const scene = new THREE.Scene();
    
    const initialWidth = host.clientWidth || window.innerWidth;
    const initialHeight = host.clientHeight || window.innerHeight;
    
    const camera = new THREE.PerspectiveCamera(
      42,
      initialWidth / (initialHeight || 1),
      0.1,
      100
    );
    camera.position.set(0, 0, 8.5);

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(initialWidth, initialHeight, false);
    renderer.domElement.style.pointerEvents = "none";
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = "0";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";

    host.appendChild(renderer.domElement);

    // 4. Lighting — Deep lavender ambient, vibrant purple & electric cyan point lights
    const ambientLight = new THREE.AmbientLight(0x281a52, 2.2);
    scene.add(ambientLight);

    const purplePointLight = new THREE.PointLight(0x9b4dff, 28, 22);
    purplePointLight.position.set(3.5, 2.5, 4.5);
    scene.add(purplePointLight);

    const cyanPointLight = new THREE.PointLight(0x21c8ff, 24, 20);
    cyanPointLight.position.set(-3.8, -2.2, 4);
    scene.add(cyanPointLight);

    const rimLight = new THREE.PointLight(0xd946ef, 12, 16);
    rimLight.position.set(0.5, -3.5, 2);
    scene.add(rimLight);

    // 5. Hierarchy Group
    const group = new THREE.Group();
    scene.add(group);

    // 6. Materials — Translucent glass-like physical shaders
    const purpleGlass = new THREE.MeshPhysicalMaterial({
      color: 0x8b5cf6,
      roughness: 0.12,
      metalness: 0.08,
      transmission: 0.82,
      thickness: 1.2,
      ior: 1.45,
      transparent: true,
      opacity: 0.76
    });

    const cyanGlass = new THREE.MeshPhysicalMaterial({
      color: 0x21c8ff,
      roughness: 0.14,
      metalness: 0.08,
      transmission: 0.85,
      thickness: 1.4,
      ior: 1.4,
      transparent: true,
      opacity: 0.7
    });

    const violetGlass = new THREE.MeshPhysicalMaterial({
      color: 0xc084fc,
      roughness: 0.18,
      metalness: 0.05,
      transmission: 0.78,
      thickness: 1.0,
      ior: 1.35,
      transparent: true,
      opacity: 0.62
    });

    const wireframeViolet = new THREE.MeshBasicMaterial({
      color: 0x8b5cf6,
      wireframe: true,
      transparent: true,
      opacity: 0.16
    });

    // 7. Floating 3D Geometric Entities
    const floatingObjects = [];

    function addFloatingMesh(geometry, material, x, y, z, rotSpeedX = 0.002, rotSpeedY = 0.0015) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.userData = {
        baseX: x,
        baseY: y,
        baseZ: z,
        phase: Math.random() * Math.PI * 2,
        rotSpeedX,
        rotSpeedY
      };
      group.add(mesh);
      floatingObjects.push(mesh);
      return mesh;
    }

    // Glass spheres & icosahedrons placed strategically in hero right/depth
    addFloatingMesh(new THREE.IcosahedronGeometry(1.25, 3), purpleGlass, 2.8, 0.9, -1.0, 0.0018, 0.0014);
    addFloatingMesh(new THREE.SphereGeometry(0.78, 32, 32), cyanGlass, -2.9, 1.4, -0.6, 0.0012, 0.0016);
    addFloatingMesh(new THREE.SphereGeometry(0.55, 32, 32), violetGlass, 1.8, -1.6, 0.2, 0.002, 0.001);
    addFloatingMesh(new THREE.IcosahedronGeometry(0.42, 2), cyanGlass, -2.2, -1.5, 0.4, 0.0022, 0.0018);
    addFloatingMesh(new THREE.SphereGeometry(0.28, 24, 24), purpleGlass, 0.8, 1.8, -0.4, 0.0015, 0.002);

    // Inner wireframe geometric structure
    const outerIcosa = new THREE.Mesh(new THREE.IcosahedronGeometry(2.1, 1), wireframeViolet);
    outerIcosa.position.set(2.8, 0.9, -1.0);
    group.add(outerIcosa);

    // Elegant orbital rings
    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(2.5, 0.015, 12, 160),
      new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.22 })
    );
    ring1.rotation.set(1.1, 0.3, 0.2);
    group.add(ring1);

    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(1.85, 0.012, 12, 140),
      new THREE.MeshBasicMaterial({ color: 0x21c8ff, transparent: true, opacity: 0.18 })
    );
    ring2.rotation.set(-0.6, 0.8, 0.4);
    group.add(ring2);

    // 8. Subtle Star / Dust Particle Field
    const particleCount = 260;
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3]     = (Math.random() - 0.5) * 14;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 9;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.032,
      transparent: true,
      opacity: 0.55
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // 9. Parallax & Mouse Movement
    let mouseX = 0, mouseY = 0;
    let targetMouseX = 0, targetMouseY = 0;

    window.addEventListener("mousemove", (e) => {
      targetMouseX = (e.clientX / window.innerWidth - 0.5) * 0.6;
      targetMouseY = (e.clientY / window.innerHeight - 0.5) * 0.4;
    }, { passive: true });

    // 10. Responsive Resizing
    function handleResize() {
      const width = host.clientWidth || window.innerWidth;
      const height = host.clientHeight || window.innerHeight;
      if (!width || !height) return;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    }

    window.addEventListener("resize", handleResize, { passive: true });
    if (window.ResizeObserver) {
      new ResizeObserver(handleResize).observe(host);
    }

    // 11. Composition Transitions
    let lastTransition = performance.now();
    let compMode = 0;

    // 12. Animation Loop (or Single Frame for Reduced Motion)
    if (prefersReducedMotion) {
      renderer.render(scene, camera);
      return;
    }

    function animate(time) {
      requestAnimationFrame(animate);

      // Smooth mouse lerp
      mouseX += (targetMouseX - mouseX) * 0.025;
      mouseY += (targetMouseY - mouseY) * 0.025;

      // Floating objects motion
      floatingObjects.forEach((obj) => {
        const t = time * 0.0006 + obj.userData.phase;
        obj.position.x = obj.userData.baseX + Math.cos(t * 0.7) * 0.12;
        obj.position.y = obj.userData.baseY + Math.sin(t) * 0.18;
        obj.rotation.x += obj.userData.rotSpeedX;
        obj.rotation.y += obj.userData.rotSpeedY;
      });

      // Geometric rotation
      outerIcosa.rotation.x += 0.0008;
      outerIcosa.rotation.y += 0.0012;
      group.rotation.y += 0.0005;
      ring1.rotation.z += 0.0003;
      ring2.rotation.x += 0.0004;
      particles.rotation.y += 0.00012;

      // Smooth mouse parallax
      group.rotation.x = mouseY * 0.14;
      group.rotation.z = mouseX * 0.04;
      camera.position.x += (mouseX * 0.4 - camera.position.x) * 0.02;
      camera.position.y += (-mouseY * 0.28 - camera.position.y) * 0.02;
      camera.lookAt(0, 0, 0);

      // Visual composition cycle every 9 seconds
      if (time - lastTransition > 9000) {
        compMode = (compMode + 1) % 3;
        lastTransition = time;
      }

      const targetScale = compMode === 0 ? 1.0 : (compMode === 1 ? 1.06 : 0.94);
      group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.015);

      renderer.render(scene, camera);
    }

    animate(performance.now());
  } catch (err) {
    console.warn("Sahaaya 3D initialization:", err);
  }
})();