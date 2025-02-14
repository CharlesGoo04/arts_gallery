class VirtualGallery {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
        });
        this.artworks = [];
        this.currentArtwork = 0;
        this.isTransitioning = false;
        this.clock = new THREE.Clock();
        this.mouse = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
        this.orbitControls = null;
        this.artworksData = [];
        this.currentRotation = 0;
        this.planets = [];
        this.starClusters = [];
        this.nebulae = [];
        
        this.fetchArtworks()
            .then(() => {
                this.init();
                this.setupLighting();
                this.createGallerySpace();
                this.loadArtworks();
                this.setupControls();
                this.addAtmosphericEffects();
                this.createSpaceEnvironment();
            });
    }

    async fetchArtworks() {
        try {
            // Using Harvard Art Museums API (you'll need to get an API key)
            const apiKey = 'YOUR_API_KEY';
            const response = await fetch(
                `https://api.harvardartmuseums.org/object?apikey=${apiKey}&size=20&hasimage=1&classification=Paintings`
            );
            const data = await response.json();
            this.artworksData = data.records.map(record => ({
                title: record.title,
                artist: record.people ? record.people[0]?.name : 'Unknown Artist',
                imageUrl: record.primaryimageurl,
                date: record.dated,
                medium: record.medium,
                description: record.description,
                culture: record.culture
            }));
        } catch (error) {
            console.error('Error fetching artworks:', error);
            // Fallback to default artworks if API fails
            this.artworksData = this.getDefaultArtworks();
        }
    }

    getDefaultArtworks() {
        return [
            {
                title: "Ethereal Dreams",
                artist: "Maria Santos",
                imageUrl: "images/artwork1.jpg",
                date: "2024",
                medium: "Oil on Canvas"
            },
            // ... more default artworks ...
        ];
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        document.getElementById('gallery-container').appendChild(this.renderer.domElement);

        this.camera.position.set(0, 1.7, 5); // Slightly above average human height
        this.scene.background = new THREE.Color(0x1a1a1a); // Darker background

        // Add fog for depth
        this.scene.fog = new THREE.FogExp2(0x1a1a1a, 0.035);

        // Create space background
        const spaceTexture = new THREE.CubeTextureLoader().load([
            'textures/space/px.jpg', 'textures/space/nx.jpg',
            'textures/space/py.jpg', 'textures/space/ny.jpg',
            'textures/space/pz.jpg', 'textures/space/nz.jpg'
        ]);
        this.scene.background = spaceTexture;

        // Add starfield
        this.createStarfield();

        window.addEventListener('resize', () => this.onWindowResize());
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    }

    setupLighting() {
        // Ambient light
        const ambient = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(ambient);

        // Main dramatic spotlight
        const mainSpot = new THREE.SpotLight(0xffffff, 1.5);
        mainSpot.position.set(0, 10, 0);
        mainSpot.angle = Math.PI / 6;
        mainSpot.penumbra = 0.2;
        mainSpot.decay = 1.5;
        mainSpot.distance = 40;
        mainSpot.castShadow = true;
        mainSpot.shadow.bias = -0.0001;
        mainSpot.shadow.mapSize.width = 2048;
        mainSpot.shadow.mapSize.height = 2048;
        this.scene.add(mainSpot);

        // Add accent lights for each artwork
        const colors = [0xffe5b4, 0xffd700, 0xfaf0e6]; // Warm gallery lighting
        [-6, -2, 2, 6].forEach((x, i) => {
            const accent = new THREE.PointLight(colors[i % 3], 0.8);
            accent.position.set(x, 3, -8);
            accent.distance = 8;
            accent.decay = 2;
            this.scene.add(accent);
        });
    }

    createGallerySpace() {
        // Create main gallery room
        this.createMainRoom();
        // Create luxury display desks
        this.createDisplayDesks();
        // Add ambient effects
        this.addAmbientEffects();
    }

    createMainRoom() {
        // Luxury marble floor
        const floorTexture = new THREE.TextureLoader().load('textures/marble-floor.jpg');
        floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set(8, 8);
        
        const floorGeometry = new THREE.CircleGeometry(20, 64);
        const floorMaterial = new THREE.MeshStandardMaterial({
            map: floorTexture,
            roughness: 0.1,
            metalness: 0.2,
            bumpMap: floorTexture,
            bumpScale: 0.02
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Create circular glass walls
        const glassGeometry = new THREE.CylinderGeometry(19.5, 19.5, 8, 64, 1, true);
        const glassMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.2,
            metalness: 0.9,
            roughness: 0.1,
            envMapIntensity: 1.0,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
            side: THREE.DoubleSide
        });
        const glassWalls = new THREE.Mesh(glassGeometry, glassMaterial);
        glassWalls.position.y = 4;
        this.scene.add(glassWalls);

        // Create domed ceiling
        const domeGeometry = new THREE.SphereGeometry(20, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2);
        const domeMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0.5,
            roughness: 0.1,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const dome = new THREE.Mesh(domeGeometry, domeMaterial);
        dome.position.y = 8;
        this.scene.add(dome);
    }

    createDisplayDesks() {
        const radius = 12; // Distance from center
        const desks = 8; // Number of display desks

        for (let i = 0; i < desks; i++) {
            const angle = (i / desks) * Math.PI * 2;
            const position = {
                x: Math.cos(angle) * radius,
                y: 0,
                z: Math.sin(angle) * radius
            };
            this.createLuxuryDesk(position, angle);
        }
    }

    createLuxuryDesk(position, angle) {
        const deskGroup = new THREE.Group();

        // Create glass desk base
        const baseGeometry = new THREE.BoxGeometry(3, 0.1, 2);
        const baseMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0.9,
            roughness: 0.1,
            transparent: true,
            opacity: 0.5,
            clearcoat: 1.0
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 0.9;

        // Create golden legs
        const legGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.9, 8);
        const legMaterial = new THREE.MeshStandardMaterial({
            color: 0xb8995c,
            metalness: 1,
            roughness: 0.1
        });

        const legPositions = [
            { x: -1.4, z: 0.9 },
            { x: 1.4, z: 0.9 },
            { x: -1.4, z: -0.9 },
            { x: 1.4, z: -0.9 }
        ];

        legPositions.forEach(pos => {
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            leg.position.set(pos.x, 0.45, pos.z);
            deskGroup.add(leg);
        });

        // Add glass display case
        const caseGeometry = new THREE.BoxGeometry(2.5, 2, 1.5);
        const caseMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0.1,
            roughness: 0.1,
            transparent: true,
            opacity: 0.3,
            clearcoat: 1.0
        });
        const displayCase = new THREE.Mesh(caseGeometry, caseMaterial);
        displayCase.position.y = 2;

        // Add golden trim
        const trimGeometry = new THREE.BoxGeometry(2.6, 0.05, 1.6);
        const trimMaterial = new THREE.MeshStandardMaterial({
            color: 0xb8995c,
            metalness: 1,
            roughness: 0.1
        });

        const topTrim = new THREE.Mesh(trimGeometry, trimMaterial);
        topTrim.position.y = 3.025;
        
        const bottomTrim = new THREE.Mesh(trimGeometry, trimMaterial);
        bottomTrim.position.y = 0.975;

        // Add spotlight for each desk
        const spotlight = new THREE.SpotLight(0xffffff, 2);
        spotlight.position.set(0, 5, 0);
        spotlight.target.position.set(0, 0, 0);
        spotlight.angle = Math.PI / 6;
        spotlight.penumbra = 0.2;
        spotlight.decay = 1.5;
        spotlight.distance = 10;
        spotlight.castShadow = true;

        deskGroup.add(base, displayCase, topTrim, bottomTrim, spotlight, spotlight.target);
        deskGroup.position.set(position.x, position.y, position.z);
        deskGroup.rotation.y = angle + Math.PI / 2;

        this.scene.add(deskGroup);
    }

    addAmbientEffects() {
        // Add central chandelier
        const chandelier = this.createCentralChandelier();
        chandelier.position.y = 7;
        this.scene.add(chandelier);

        // Add ambient particles
        const particleSystem = this.createAmbientParticles();
        this.scene.add(particleSystem);

        // Add floor lighting
        this.addFloorLighting();
    }

    createCentralChandelier() {
        const group = new THREE.Group();

        // Create main structure
        const ringGeometry = new THREE.TorusGeometry(3, 0.1, 16, 100);
        const ringMaterial = new THREE.MeshStandardMaterial({
            color: 0xb8995c,
            metalness: 1,
            roughness: 0.1
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        group.add(ring);

        // Add hanging crystals
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            const crystal = this.createCrystal();
            crystal.position.set(
                Math.cos(angle) * 3,
                -0.5 - Math.random() * 0.5,
                Math.sin(angle) * 3
            );
            group.add(crystal);
        }

        // Add central light
        const light = new THREE.PointLight(0xffe5b4, 1, 20);
        group.add(light);

        return group;
    }

    createCrystal() {
        const geometry = new THREE.ConeGeometry(0.1, 0.4, 6);
        const material = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0.9,
            roughness: 0.1,
            transparent: true,
            opacity: 0.7,
            clearcoat: 1.0
        });
        return new THREE.Mesh(geometry, material);
    }

    addFloorLighting() {
        const radius = 19;
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            const light = new THREE.PointLight(0xb8995c, 0.5, 5);
            light.position.set(
                Math.cos(angle) * radius,
                0.1,
                Math.sin(angle) * radius
            );
            this.scene.add(light);
        }
    }

    createWalls() {
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0x2c2c2c,
            roughness: 0.3,
            metalness: 0.1
        });

        // Back wall with gold trim
        const backWall = new THREE.Mesh(
            new THREE.PlaneGeometry(30, 8),
            wallMaterial
        );
        backWall.position.set(0, 4, -10);
        this.scene.add(backWall);

        // Side walls
        const sideWallGeometry = new THREE.PlaneGeometry(20, 8);
        const leftWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
        leftWall.position.set(-15, 4, 0);
        leftWall.rotation.y = Math.PI / 2;
        this.scene.add(leftWall);

        const rightWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
        rightWall.position.set(15, 4, 0);
        rightWall.rotation.y = -Math.PI / 2;
        this.scene.add(rightWall);

        // Add gold trim
        this.addGoldTrim();
    }

    addGoldTrim() {
        const trimMaterial = new THREE.MeshStandardMaterial({
            color: 0xb8995c,
            metalness: 1,
            roughness: 0.2
        });

        // Wall trim
        [-15, 0, 15].forEach(x => {
            const trim = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 8, 0.1),
                trimMaterial
            );
            trim.position.set(x, 4, -10);
            this.scene.add(trim);
        });
    }

    addDecorativeElements() {
        // Add luxury pedestals
        [-8, -4, 4, 8].forEach((x, i) => {
            const pedestal = this.createPedestal();
            pedestal.position.set(x, 0, -6);
            this.scene.add(pedestal);
        });

        // Add hanging chandeliers
        [-6, 6].forEach(x => {
            const chandelier = this.createChandelier();
            chandelier.position.set(x, 6, -5);
            this.scene.add(chandelier);
        });
    }

    createPedestal() {
        const geometry = new THREE.BoxGeometry(1, 0.5, 1);
        const material = new THREE.MeshStandardMaterial({
            color: 0xb8995c,
            metalness: 0.7,
            roughness: 0.2
        });
        return new THREE.Mesh(geometry, material);
    }

    createChandelier() {
        const group = new THREE.Group();
        
        // Chandelier body
        const body = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0.2, 0.5, 8),
            new THREE.MeshStandardMaterial({
                color: 0xb8995c,
                metalness: 1,
                roughness: 0.2
            })
        );
        group.add(body);

        // Add light
        const light = new THREE.PointLight(0xffe5b4, 0.8, 10);
        light.position.y = -0.5;
        group.add(light);

        return group;
    }

    loadArtworks() {
        const totalArtworks = Math.min(this.artworksData.length, 8); // Limit to 8 artworks
        const radius = 9; // Distance from center

        for (let i = 0; i < totalArtworks; i++) {
            const angle = (i / totalArtworks) * Math.PI * 2;
            const position = {
                x: Math.sin(angle) * radius,
                y: 2,
                z: Math.cos(angle) * radius
            };

            const artwork = this.artworksData[i];
            this.loadSingleArtwork(artwork, position, angle);
        }
    }

    loadSingleArtwork(artwork, position, angle) {
        const textureLoader = new THREE.TextureLoader();
        
        textureLoader.load(artwork.imageUrl, (texture) => {
            const frame = this.createLuxuryFrame();
            frame.position.set(position.x, position.y, position.z);
            frame.rotation.y = angle + Math.PI / 2; // Face center

            const artworkMaterial = new THREE.MeshBasicMaterial({ map: texture });
            const artworkGeometry = new THREE.PlaneGeometry(3.5, 2.5);
            const artworkMesh = new THREE.Mesh(artworkGeometry, artworkMaterial);
            
            // Position artwork slightly in front of frame
            artworkMesh.position.set(position.x, position.y, position.z);
            artworkMesh.rotation.y = angle + Math.PI / 2;
            artworkMesh.position.add(new THREE.Vector3(0, 0, 0.05).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle + Math.PI / 2));

            this.scene.add(frame);
            this.scene.add(artworkMesh);
            this.artworks.push({ 
                frame, 
                artwork: artworkMesh, 
                position,
                info: artwork 
            });
        });
    }

    createLuxuryFrame() {
        const frameGroup = new THREE.Group();

        // Main frame
        const outerFrame = new THREE.Mesh(
            new THREE.BoxGeometry(4, 3, 0.2),
            new THREE.MeshStandardMaterial({
                color: 0xb8995c,
                metalness: 0.8,
                roughness: 0.2
            })
        );
        frameGroup.add(outerFrame);

        // Decorative corners
        const cornerGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.1);
        const cornerMaterial = new THREE.MeshStandardMaterial({
            color: 0xb8995c,
            metalness: 1,
            roughness: 0.1
        });

        [-1.85, 1.85].forEach(x => {
            [-1.35, 1.35].forEach(y => {
                const corner = new THREE.Mesh(cornerGeometry, cornerMaterial);
                corner.position.set(x, y, 0.1);
                frameGroup.add(corner);
            });
        });

        return frameGroup;
    }

    setupControls() {
        // Add OrbitControls for 360-degree rotation
        this.orbitControls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.enableDamping = true;
        this.orbitControls.dampingFactor = 0.05;
        this.orbitControls.rotateSpeed = 0.5;
        this.orbitControls.maxPolarAngle = Math.PI / 1.5; // Limit vertical rotation
        this.orbitControls.minPolarAngle = Math.PI / 3;
        this.orbitControls.enableZoom = true;
        this.orbitControls.minDistance = 3;
        this.orbitControls.maxDistance = 10;
        
        // Custom rotation controls
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                this.rotateGallery(-1);
            } else if (e.key === 'ArrowRight') {
                this.rotateGallery(1);
            }
        });

        // Navigation buttons
        document.querySelector('.nav-btn.next').addEventListener('click', () => this.rotateGallery(1));
        document.querySelector('.nav-btn.prev').addEventListener('click', () => this.rotateGallery(-1));
    }

    rotateGallery(direction) {
        if (this.isTransitioning) return;
        
        this.isTransitioning = true;
        this.currentRotation += direction * (Math.PI / 2); // 90-degree rotation

        gsap.to(this.camera.position, {
            x: Math.sin(this.currentRotation) * 5,
            z: Math.cos(this.currentRotation) * 5,
            duration: 2,
            ease: "power2.inOut",
            onComplete: () => {
                this.isTransitioning = false;
                this.updateArtworkInfo(Math.floor(this.currentRotation / (Math.PI / 2)) % this.artworks.length);
            }
        });
    }

    addAtmosphericEffects() {
        // Add particle system for dust/atmosphere
        const particleGeometry = new THREE.BufferGeometry();
        const particleCount = 1000;
        const positions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 30;
            positions[i + 1] = Math.random() * 8;
            positions[i + 2] = (Math.random() - 0.5) * 20;
        }

        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const particleMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.05,
            transparent: true,
            opacity: 0.3
        });

        this.particles = new THREE.Points(particleGeometry, particleMaterial);
        this.scene.add(this.particles);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.orbitControls) {
            this.orbitControls.update();
        }

        // Animate particles
        if (this.particles) {
            const time = this.clock.getElapsedTime() * 0.1;
            this.particles.rotation.y = time * 0.05;
            this.particles.position.y = Math.sin(time) * 0.1;
        }

        // Animate planets
        this.planets.forEach(planet => {
            const orbit = planet.userData.orbit;
            orbit.angle += orbit.speed;
            planet.position.x = Math.cos(orbit.angle) * orbit.distance;
            planet.position.z = Math.sin(orbit.angle) * orbit.distance;
            planet.rotation.y += 0.001;
        });

        // Animate star clusters
        this.starClusters.forEach((cluster, i) => {
            cluster.rotation.y += 0.0001 * (i + 1);
            cluster.rotation.x += 0.00005 * (i + 1);
        });

        // Animate nebulae
        this.nebulae.forEach((nebula, i) => {
            nebula.material.uniforms.time.value += 0.001;
            nebula.rotation.y += 0.0001 * (i + 1);
        });

        // Update holographic effects
        this.scene.traverse((object) => {
            if (object.material && object.material.opacity < 1) {
                object.rotation.y += 0.001;
            }
        });

        // Subtle camera movement
        if (!this.isTransitioning) {
            this.camera.position.y += Math.sin(this.clock.getElapsedTime() * 0.5) * 0.0005;
        }

        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onMouseMove(e) {
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0) {
            const intersect = intersects[0].object;
            if (intersect.isMesh) {
                const artwork = this.artworks.find(a => a.frame === intersect || a.artwork === intersect);
                if (artwork) {
                    this.updateArtworkInfo(this.artworks.indexOf(artwork));
                }
            }
        }
    }

    updateArtworkInfo(index) {
        const artwork = this.artworks[index]?.info;
        if (!artwork) return;

        const overlay = document.querySelector('.artwork-info-overlay');
        const details = overlay.querySelector('.artwork-details');
        
        details.querySelector('h2').textContent = artwork.title;
        details.querySelector('.artist').textContent = `By ${artwork.artist}`;
        details.querySelector('.description').textContent = artwork.description || '';
        details.querySelector('.year').textContent = artwork.date;
        details.querySelector('.medium').textContent = artwork.medium;
        
        overlay.classList.add('visible');
    }

    // Add new method for starfield
    createStarfield() {
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 10000;
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 1000;
            positions[i + 1] = (Math.random() - 0.5) * 1000;
            positions[i + 2] = (Math.random() - 0.5) * 1000;

            // Randomize star colors (white to blue-ish)
            colors[i] = Math.random() * 0.3 + 0.7;
            colors[i + 1] = Math.random() * 0.3 + 0.7;
            colors[i + 2] = 1;
        }

        starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const starMaterial = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });

        this.starfield = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(this.starfield);
    }

    // New method for display spaces
    createDisplaySpace(position) {
        const displayGroup = new THREE.Group();

        // Create floating platform for each display
        const podium = new THREE.Mesh(
            new THREE.BoxGeometry(3, 0.1, 3),
            new THREE.MeshStandardMaterial({
                color: 0xb8995c,
                metalness: 0.9,
                roughness: 0.1,
                transparent: true,
                opacity: 0.8
            })
        );

        // Add holographic effect
        const holoEffect = new THREE.Mesh(
            new THREE.CylinderGeometry(1.5, 1.5, 4, 32, 1, true),
            new THREE.MeshPhongMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 0.1,
                side: THREE.DoubleSide
            })
        );

        podium.position.set(position.x, position.y, position.z);
        holoEffect.position.set(position.x, position.y + 2, position.z);

        displayGroup.add(podium);
        displayGroup.add(holoEffect);
        this.scene.add(displayGroup);
    }

    // Add cosmic effects
    addCosmicEffects() {
        // Add nebula-like particles
        const nebulaParticles = new THREE.BufferGeometry();
        const nebulaCount = 500;
        const nebulaPositions = new Float32Array(nebulaCount * 3);
        const nebulaSizes = new Float32Array(nebulaCount);

        for (let i = 0; i < nebulaCount * 3; i += 3) {
            nebulaPositions[i] = (Math.random() - 0.5) * 50;
            nebulaPositions[i + 1] = (Math.random() - 0.5) * 30;
            nebulaPositions[i + 2] = (Math.random() - 0.5) * 50;
            nebulaSizes[i / 3] = Math.random() * 2;
        }

        nebulaParticles.setAttribute('position', new THREE.BufferAttribute(nebulaPositions, 3));
        nebulaParticles.setAttribute('size', new THREE.BufferAttribute(nebulaSizes, 1));

        const nebulaMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                color: { value: new THREE.Color(0x5500ff) }
            },
            vertexShader: `
                attribute float size;
                varying vec3 vColor;
                void main() {
                    vColor = vec3(0.5 + position.y / 30.0, 0.2, 1.0);
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                void main() {
                    float r = distance(gl_PointCoord, vec2(0.5));
                    if (r > 0.5) discard;
                    gl_FragColor = vec4(vColor, 1.0 - (r * 2.0));
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending
        });

        this.nebula = new THREE.Points(nebulaParticles, nebulaMaterial);
        this.scene.add(this.nebula);
    }

    createSpaceEnvironment() {
        // Create planets
        this.createPlanets();
        
        // Create asteroid belt
        this.createAsteroidBelt();
        
        // Enhanced starfield with constellations
        this.createEnhancedStarfield();
        
        // Add space nebulae
        this.createSpaceNebulae();
        
        // Add shooting stars
        this.createShootingStars();
    }

    createPlanets() {
        const planets = [
            { radius: 5, texture: 'textures/planets/planet1.jpg', distance: 100, speed: 0.0001 },
            { radius: 3, texture: 'textures/planets/planet2.jpg', distance: 150, speed: 0.00015 },
            { radius: 8, texture: 'textures/planets/planet3.jpg', distance: 200, speed: 0.00005 }
        ];

        planets.forEach(planetData => {
            const geometry = new THREE.SphereGeometry(planetData.radius, 32, 32);
            const texture = new THREE.TextureLoader().load(planetData.texture);
            const material = new THREE.MeshStandardMaterial({
                map: texture,
                metalness: 0.2,
                roughness: 0.8
            });
            
            const planet = new THREE.Mesh(geometry, material);
            planet.position.set(
                Math.cos(Math.random() * Math.PI * 2) * planetData.distance,
                (Math.random() - 0.5) * 100,
                Math.sin(Math.random() * Math.PI * 2) * planetData.distance
            );
            
            planet.userData.orbit = {
                distance: planetData.distance,
                speed: planetData.speed,
                angle: Math.random() * Math.PI * 2
            };
            
            this.scene.add(planet);
            this.planets.push(planet);
        });
    }

    createEnhancedStarfield() {
        // Create star clusters
        for (let i = 0; i < 5; i++) {
            const clusterGeometry = new THREE.BufferGeometry();
            const clusterParticles = 2000;
            const clusterPositions = new Float32Array(clusterParticles * 3);
            const clusterColors = new Float32Array(clusterParticles * 3);
            
            const center = new THREE.Vector3(
                (Math.random() - 0.5) * 500,
                (Math.random() - 0.5) * 500,
                (Math.random() - 0.5) * 500
            );
            
            for (let j = 0; j < clusterParticles * 3; j += 3) {
                const radius = Math.random() * 50;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.random() * Math.PI;
                
                clusterPositions[j] = center.x + radius * Math.sin(phi) * Math.cos(theta);
                clusterPositions[j + 1] = center.y + radius * Math.sin(phi) * Math.sin(theta);
                clusterPositions[j + 2] = center.z + radius * Math.cos(phi);
                
                // Create color gradients for clusters
                const color = new THREE.Color();
                color.setHSL(Math.random() * 0.2 + 0.5, 0.7, 0.5);
                color.toArray(clusterColors, j);
            }
            
            clusterGeometry.setAttribute('position', new THREE.BufferAttribute(clusterPositions, 3));
            clusterGeometry.setAttribute('color', new THREE.BufferAttribute(clusterColors, 3));
            
            const clusterMaterial = new THREE.PointsMaterial({
                size: 0.5,
                vertexColors: true,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending
            });
            
            const starCluster = new THREE.Points(clusterGeometry, clusterMaterial);
            this.scene.add(starCluster);
            this.starClusters.push(starCluster);
        }
    }

    createSpaceNebulae() {
        const nebulaColors = [
            new THREE.Color(0x5500ff), // Purple
            new THREE.Color(0x00ff88), // Cyan
            new THREE.Color(0xff5500)  // Orange
        ];
        
        nebulaColors.forEach((color, index) => {
            const nebulaGeometry = new THREE.BufferGeometry();
            const particleCount = 1000;
            const positions = new Float32Array(particleCount * 3);
            
            const center = new THREE.Vector3(
                (Math.random() - 0.5) * 400,
                (Math.random() - 0.5) * 400,
                (Math.random() - 0.5) * 400
            );
            
            for (let i = 0; i < particleCount * 3; i += 3) {
                positions[i] = center.x + (Math.random() - 0.5) * 100;
                positions[i + 1] = center.y + (Math.random() - 0.5) * 100;
                positions[i + 2] = center.z + (Math.random() - 0.5) * 100;
            }
            
            nebulaGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            
            const nebulaMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    color: { value: color }
                },
                vertexShader: `
                    varying vec3 vPosition;
                    void main() {
                        vPosition = position;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        gl_PointSize = 3.0;
                    }
                `,
                fragmentShader: `
                    uniform vec3 color;
                    varying vec3 vPosition;
                    void main() {
                        float intensity = 1.0 - length(gl_PointCoord - vec2(0.5)) * 2.0;
                        gl_FragColor = vec4(color, intensity * 0.5);
                    }
                `,
                transparent: true,
                blending: THREE.AdditiveBlending
            });
            
            const nebula = new THREE.Points(nebulaGeometry, nebulaMaterial);
            this.scene.add(nebula);
            this.nebulae.push(nebula);
        });
    }

    createShootingStars() {
        setInterval(() => {
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(20 * 3); // Trail of 20 points
            
            const start = new THREE.Vector3(
                (Math.random() - 0.5) * 1000,
                (Math.random() - 0.5) * 1000,
                (Math.random() - 0.5) * 1000
            );
            
            const direction = new THREE.Vector3(
                (Math.random() - 0.5),
                (Math.random() - 0.5),
                (Math.random() - 0.5)
            ).normalize();
            
            for (let i = 0; i < 20 * 3; i += 3) {
                const point = start.clone().add(direction.clone().multiplyScalar(i / 3));
                positions[i] = point.x;
                positions[i + 1] = point.y;
                positions[i + 2] = point.z;
            }
            
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            
            const material = new THREE.LineBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 1
            });
            
            const shootingStar = new THREE.Line(geometry, material);
            this.scene.add(shootingStar);
            
            gsap.to(shootingStar.position, {
                x: direction.x * 1000,
                y: direction.y * 1000,
                z: direction.z * 1000,
                duration: 2,
                ease: "none",
                onComplete: () => {
                    this.scene.remove(shootingStar);
                    geometry.dispose();
                    material.dispose();
                }
            });
            
            gsap.to(shootingStar.material, {
                opacity: 0,
                duration: 2,
                ease: "none"
            });
        }, 3000); // Create new shooting star every 3 seconds
    }
}

// Initialize gallery when page loads
window.addEventListener('load', () => {
    const gallery = new VirtualGallery();
    gallery.animate();

    // Remove loading screen with fade effect
    setTimeout(() => {
        gsap.to('.loading-screen', {
            opacity: 0,
            duration: 1,
            ease: "power2.inOut",
            onComplete: () => {
                document.querySelector('.loading-screen').style.display = 'none';
            }
        });
    }, 2000);
}); 