(async function () {
    const host = document.getElementById("sahaaya-3d");

    if (!host) {
        console.error("Sahaaya 3D: #sahaaya-3d not found.");
        return;
    }

    try {
        const THREE = await import(
            "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js"
        );

        // -----------------------------
        // SCENE
        // -----------------------------
        const scene = new THREE.Scene();

        const camera = new THREE.PerspectiveCamera(
            45,
            host.clientWidth / host.clientHeight,
            0.1,
            100
        );

        camera.position.set(0, 0, 9);

        const renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true
        });

        renderer.setPixelRatio(
            Math.min(window.devicePixelRatio, 1.6)
        );

        renderer.setSize(
            host.clientWidth,
            host.clientHeight
        );

        host.appendChild(renderer.domElement);

        // -----------------------------
        // LIGHTING
        // -----------------------------
        scene.add(
            new THREE.AmbientLight(0x8b7cff, 2)
        );

        const purpleLight = new THREE.PointLight(
            0x8b3dff,
            35,
            20
        );

        purpleLight.position.set(3, 3, 5);
        scene.add(purpleLight);

        const blueLight = new THREE.PointLight(
            0x20cfff,
            30,
            18
        );

        blueLight.position.set(-4, -2, 4);
        scene.add(blueLight);

        // -----------------------------
        // MAIN GROUP
        // -----------------------------
        const group = new THREE.Group();

        scene.add(group);

        // -----------------------------
        // MATERIALS
        // -----------------------------
        const purpleMaterial =
            new THREE.MeshPhysicalMaterial({
                color: 0x873cff,
                roughness: 0.15,
                metalness: 0.1,
                transmission: 0.2,
                transparent: true,
                opacity: 0.72
            });

        const blueMaterial =
            new THREE.MeshPhysicalMaterial({
                color: 0x19c9ff,
                roughness: 0.15,
                metalness: 0.1,
                transmission: 0.25,
                transparent: true,
                opacity: 0.65
            });

        const pinkMaterial =
            new THREE.MeshPhysicalMaterial({
                color: 0xd946ef,
                roughness: 0.2,
                metalness: 0.05,
                transmission: 0.2,
                transparent: true,
                opacity: 0.55
            });

        // -----------------------------
        // 3D FLOATING OBJECTS
        // -----------------------------
        const objects = [];

        function createObject(
            size,
            x,
            y,
            z,
            material
        ) {
            const mesh = new THREE.Mesh(
                new THREE.IcosahedronGeometry(size, 4),
                material
            );

            mesh.position.set(x, y, z);

            mesh.userData.baseX = x;
            mesh.userData.baseY = y;
            mesh.userData.baseZ = z;
            mesh.userData.phase = Math.random() * 6;

            group.add(mesh);
            objects.push(mesh);

            return mesh;
        }

        createObject(1.35, 3.0, 1.2, -1, purpleMaterial);
        createObject(0.85, -3.1, 1.7, -0.5, blueMaterial);
        createObject(0.65, 2.1, -1.8, 0, pinkMaterial);
        createObject(0.45, -2.4, -1.7, 0.3, blueMaterial);
        createObject(0.3, 0.9, 2.1, -0.5, purpleMaterial);

        // -----------------------------
        // RINGS
        // -----------------------------
        const ring1 = new THREE.Mesh(
            new THREE.TorusGeometry(
                2.7,
                0.018,
                12,
                160
            ),
            new THREE.MeshBasicMaterial({
                color: 0x9b6cff,
                transparent: true,
                opacity: 0.22
            })
        );

        ring1.rotation.set(1, 0.3, 0.2);

        group.add(ring1);

        const ring2 = new THREE.Mesh(
            new THREE.TorusGeometry(
                1.8,
                0.015,
                12,
                140
            ),
            new THREE.MeshBasicMaterial({
                color: 0x20cfff,
                transparent: true,
                opacity: 0.18
            })
        );

        ring2.rotation.set(-0.5, 0.8, 0.4);

        group.add(ring2);

        // -----------------------------
        // PARTICLES
        // -----------------------------
        const particleCount = 300;

        const positions =
            new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] =
                (Math.random() - 0.5) * 13;

            positions[i * 3 + 1] =
                (Math.random() - 0.5) * 8;

            positions[i * 3 + 2] =
                (Math.random() - 0.5) * 7;
        }

        const particleGeometry =
            new THREE.BufferGeometry();

        particleGeometry.setAttribute(
            "position",
            new THREE.BufferAttribute(
                positions,
                3
            )
        );

        const particleMaterial =
            new THREE.PointsMaterial({
                color: 0xb9d9ff,
                size: 0.035,
                transparent: true,
                opacity: 0.55
            });

        const particles =
            new THREE.Points(
                particleGeometry,
                particleMaterial
            );

        scene.add(particles);

        // -----------------------------
        // MOUSE MOVEMENT
        // -----------------------------
        let mouseX = 0;
        let mouseY = 0;

        let targetX = 0;
        let targetY = 0;

        window.addEventListener(
            "mousemove",
            function (event) {
                targetX =
                    (event.clientX / window.innerWidth - 0.5) *
                    0.6;

                targetY =
                    (event.clientY / window.innerHeight - 0.5) *
                    0.4;
            }
        );

        // -----------------------------
        // AUTOMATIC SCENE CHANGES
        // -----------------------------
        let sceneMode = 0;
        let lastChange = performance.now();

        // -----------------------------
        // RESIZE
        // -----------------------------
        function resize() {
            const width = host.clientWidth;
            const height = host.clientHeight;

            if (!width || !height) return;

            camera.aspect = width / height;

            camera.updateProjectionMatrix();

            renderer.setSize(
                width,
                height,
                false
            );
        }

        window.addEventListener(
            "resize",
            resize
        );

        resize();

        // -----------------------------
        // ANIMATION
        // -----------------------------
        function animate(time) {

            requestAnimationFrame(animate);

            mouseX +=
                (targetX - mouseX) * 0.025;

            mouseY +=
                (targetY - mouseY) * 0.025;

            // Floating objects
            objects.forEach(
                function (object, index) {

                    const t =
                        time * 0.0005 +
                        object.userData.phase;

                    object.position.x =
                        object.userData.baseX +
                        Math.cos(t * 0.7) * 0.15;

                    object.position.y =
                        object.userData.baseY +
                        Math.sin(t) * 0.25;

                    object.rotation.x += 0.002;

                    object.rotation.y += 0.0015;
                }
            );

            // Rotate environment
            group.rotation.y += 0.0006;

            ring1.rotation.z += 0.0004;
            ring2.rotation.x += 0.0003;

            particles.rotation.y += 0.00015;

            // Mouse parallax
            group.rotation.x =
                mouseY * 0.18;

            group.rotation.z =
                mouseX * 0.05;

            camera.position.x +=
                (mouseX * 0.45 -
                    camera.position.x) *
                0.015;

            camera.position.y +=
                (-mouseY * 0.3 -
                    camera.position.y) *
                0.015;

            camera.lookAt(0, 0, 0);

            // Change composition every 8 seconds
            if (
                time - lastChange > 8000
            ) {
                sceneMode =
                    (sceneMode + 1) % 3;

                lastChange = time;
            }

            if (sceneMode === 0) {
                group.scale.lerp(
                    new THREE.Vector3(
                        1,
                        1,
                        1
                    ),
                    0.02
                );
            }

            if (sceneMode === 1) {
                group.scale.lerp(
                    new THREE.Vector3(
                        1.08,
                        1.08,
                        1.08
                    ),
                    0.02
                );
            }

            if (sceneMode === 2) {
                group.scale.lerp(
                    new THREE.Vector3(
                        0.93,
                        0.93,
                        0.93
                    ),
                    0.02
                );
            }

            renderer.render(
                scene,
                camera
            );
        }

        animate(performance.now());

        console.log(
            "Sahaaya 3D background loaded successfully."
        );

    } catch (error) {

        console.error(
            "Sahaaya 3D failed to load:",
            error
        );

    }
})();