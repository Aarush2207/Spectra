import * as THREE from 'three';

export interface ShardData {
  id: number;
  mesh: THREE.Mesh;
  edgeLine: THREE.LineSegments;
  restPosition: THREE.Vector3;
  restRotation: THREE.Euler;
  currentPosition: THREE.Vector3;
  currentRotation: THREE.Euler;
  targetPosition: THREE.Vector3;
  targetRotation: THREE.Euler;
  shatterVector: THREE.Vector3;
  shatterRotationVelocity: THREE.Vector3;
  isHovered: boolean;
  springVelocity: THREE.Vector3;
}

export class GlassShardScene {
  public group: THREE.Group;
  public shards: ShardData[];
  public isShattered: boolean = false;
  private raycaster: THREE.Raycaster;
  private mouseVector: THREE.Vector2;
  private glassMaterial: THREE.MeshPhysicalMaterial;
  private edgeMaterial: THREE.LineBasicMaterial;
  private cursorLight: THREE.PointLight;

  constructor() {
    this.group = new THREE.Group();
    this.shards = [];
    this.raycaster = new THREE.Raycaster();
    this.mouseVector = new THREE.Vector2(-999, -999);

    // 1. Physically Based Obsidian Smoked Glass Material with Subtle Depth Glow
    this.glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x1f1932,
      emissive: 0x110c22,
      roughness: 0.12,
      metalness: 0.25,
      transmission: 0.42,
      ior: 1.54,
      thickness: 1.8,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      iridescence: 0.92,
      iridescenceIOR: 1.38,
      transparent: true,
      opacity: 0.92,
      reflectivity: 0.98,
    });

    // Luminous Violet/Lavender Edge Highlight Material
    this.edgeMaterial = new THREE.LineBasicMaterial({
      color: 0xc4b5fd,
      transparent: true,
      opacity: 0.82,
    });

    // Cursor Follow Light for glass interaction
    this.cursorLight = new THREE.PointLight(0x8055e8, 2.0, 5.0);
    this.cursorLight.position.set(0, 0, 1.5);
    this.group.add(this.cursorLight);

    // Build the architectural perimeter frame
    this.buildShards();
  }

  private buildShards() {
    // 6 Substantial perimeter smoked-glass shards framing Nova
    // Central stage (|x| < 1.4, |y| < 1.6) is kept clean and negative for Nova's body!
    const shardPolygons: { 
      points: [number, number][]; 
      pos: [number, number, number]; 
      rot: [number, number, number]; 
      shatter: [number, number, number];
    }[] = [
      // Shard 0: Left Flank Primary Shard (Substantial floating slab left of Nova)
      {
        points: [[-0.9, 1.4], [0.6, 1.0], [0.4, -0.9], [-0.8, -1.3], [-1.2, 0.0]],
        pos: [-2.6, 0.1, 0.15],
        rot: [0.04, 0.18, -0.06],
        shatter: [-4.0, 1.4, 2.6]
      },
      // Shard 1: Left Upper Angular Crystal
      {
        points: [[-0.8, 0.9], [0.7, 0.7], [0.25, -0.6], [-0.9, -0.3]],
        pos: [-2.1, 1.7, -0.2],
        rot: [-0.08, 0.20, 0.12],
        shatter: [-3.2, 3.4, 2.0]
      },
      // Shard 2: Left Lower Floating Shard
      {
        points: [[-1.0, 0.45], [0.45, 0.25], [0.8, -0.8], [-0.45, -1.0]],
        pos: [-2.2, -1.5, 0.1],
        rot: [0.12, 0.16, -0.08],
        shatter: [-3.2, -3.2, 2.2]
      },
      // Shard 3: Right Flank Primary Shard (Substantial floating slab right of Nova)
      {
        points: [[-0.6, 1.0], [0.9, 1.4], [1.2, 0.0], [0.8, -1.3], [-0.4, -0.9]],
        pos: [2.6, 0.1, 0.15],
        rot: [0.04, -0.18, 0.06],
        shatter: [4.0, 1.4, 2.6]
      },
      // Shard 4: Right Upper Angular Crystal
      {
        points: [[-0.7, 0.7], [0.8, 0.9], [0.9, -0.3], [-0.25, -0.6]],
        pos: [2.1, 1.7, -0.2],
        rot: [-0.08, -0.20, -0.12],
        shatter: [3.2, 3.4, 2.0]
      },
      // Shard 5: Right Lower Floating Shard
      {
        points: [[-0.45, 0.25], [1.0, 0.45], [0.45, -1.0], [-0.8, -0.8]],
        pos: [2.2, -1.5, 0.1],
        rot: [0.12, -0.16, 0.08],
        shatter: [3.2, -3.2, 2.2]
      }
    ];

    shardPolygons.forEach((cfg, index) => {
      const shape = new THREE.Shape();
      cfg.points.forEach((pt, pIdx) => {
        if (pIdx === 0) shape.moveTo(pt[0], pt[1]);
        else shape.lineTo(pt[0], pt[1]);
      });
      shape.closePath();

      const extrudeSettings: THREE.ExtrudeGeometryOptions = {
        depth: 0.22,
        bevelEnabled: true,
        bevelSegments: 4,
        steps: 1,
        bevelSize: 0.045,
        bevelThickness: 0.055,
      };

      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geometry.center();

      // Shard mesh
      const shardMesh = new THREE.Mesh(geometry, this.glassMaterial.clone());
      shardMesh.castShadow = true;
      shardMesh.receiveShadow = true;

      // Beveled Edge wireframe highlight
      const edges = new THREE.EdgesGeometry(geometry, 26);
      const edgeLine = new THREE.LineSegments(edges, this.edgeMaterial.clone());
      shardMesh.add(edgeLine);

      const restPos = new THREE.Vector3(...cfg.pos);
      const restRot = new THREE.Euler(...cfg.rot);

      shardMesh.position.copy(restPos);
      shardMesh.rotation.copy(restRot);
      this.group.add(shardMesh);

      this.shards.push({
        id: index,
        mesh: shardMesh,
        edgeLine,
        restPosition: restPos.clone(),
        restRotation: restRot.clone(),
        currentPosition: restPos.clone(),
        currentRotation: restRot.clone(),
        targetPosition: restPos.clone(),
        targetRotation: restRot.clone(),
        shatterVector: new THREE.Vector3(...cfg.shatter),
        shatterRotationVelocity: new THREE.Vector3(
          (Math.random() - 0.5) * 3.5,
          (Math.random() - 0.5) * 3.5,
          (Math.random() - 0.5) * 3.5
        ),
        isHovered: false,
        springVelocity: new THREE.Vector3(0, 0, 0),
      });
    });
  }

  public setPointer(normalizedX: number, normalizedY: number, camera: THREE.Camera) {
    this.mouseVector.set(normalizedX, normalizedY);
    this.raycaster.setFromCamera(this.mouseVector, camera);

    // Update cursor light
    this.cursorLight.position.x = normalizedX * 3.2;
    this.cursorLight.position.y = normalizedY * 2.2;

    if (this.isShattered) return;

    // Raycast against all shard meshes
    const meshes = this.shards.map((s) => s.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    const hoveredId = intersects.length > 0 ? (intersects[0].object as THREE.Mesh).id : null;

    this.shards.forEach((shard) => {
      const isNowHovered = shard.mesh.id === hoveredId;
      if (isNowHovered !== shard.isHovered) {
        shard.isHovered = isNowHovered;
        const mat = shard.mesh.material as THREE.MeshPhysicalMaterial;
        const lineMat = shard.edgeLine.material as THREE.LineBasicMaterial;

        if (isNowHovered) {
          mat.iridescence = 1.0;
          mat.clearcoat = 1.0;
          lineMat.opacity = 1.0;
          lineMat.color.setHex(0xffffff);
        } else {
          mat.iridescence = 0.82;
          mat.clearcoat = 0.95;
          lineMat.opacity = 0.68;
          lineMat.color.setHex(0xb9abff);
        }
      }
    });
  }

  public shatter() {
    this.isShattered = true;
  }

  public reassemble() {
    this.isShattered = false;
  }

  public toggleShatter() {
    this.isShattered = !this.isShattered;
    return this.isShattered;
  }

  public update(delta: number, _time: number, normalizedPointerX: number, normalizedPointerY: number) {
    // 1. Global perspective tilt of the entire glass composition (±6 deg horiz, ±4 deg vert)
    const targetGroupTiltY = normalizedPointerX * 0.10;
    const targetGroupTiltX = -normalizedPointerY * 0.07;

    this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetGroupTiltY, delta * 3.5);
    this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, targetGroupTiltX, delta * 3.5);

    // 2. Animate Individual Shards with Spring Damping
    this.shards.forEach((shard) => {
      if (this.isShattered) {
        // Shatter state: shards push outward with tumbling rotation
        shard.targetPosition.copy(shard.restPosition).add(shard.shatterVector);
        shard.targetRotation.x = shard.restRotation.x + shard.shatterRotationVelocity.x;
        shard.targetRotation.y = shard.restRotation.y + shard.shatterRotationVelocity.y;
        shard.targetRotation.z = shard.restRotation.z + shard.shatterRotationVelocity.z;

        shard.currentPosition.lerp(shard.targetPosition, delta * 4.2);
        shard.currentRotation.x = THREE.MathUtils.lerp(shard.currentRotation.x, shard.targetRotation.x, delta * 3.5);
        shard.currentRotation.y = THREE.MathUtils.lerp(shard.currentRotation.y, shard.targetRotation.y, delta * 3.5);
        shard.currentRotation.z = THREE.MathUtils.lerp(shard.currentRotation.z, shard.targetRotation.z, delta * 3.5);
      } else {
        // Assembled state: Rest position with hover lift and spring physics
        if (shard.isHovered) {
          shard.targetPosition.set(
            shard.restPosition.x + (shard.restPosition.x > 0 ? 0.15 : -0.15),
            shard.restPosition.y + 0.05,
            shard.restPosition.z + 0.55
          );
          shard.targetRotation.set(
            shard.restRotation.x - normalizedPointerY * 0.06,
            shard.restRotation.y + normalizedPointerX * 0.06,
            shard.restRotation.z + (shard.restPosition.x > 0 ? -0.05 : 0.05)
          );
        } else {
          shard.targetPosition.copy(shard.restPosition);
          shard.targetRotation.copy(shard.restRotation);
        }

        const stiffness = 8.5;
        const damping = 0.84;

        const forceX = (shard.targetPosition.x - shard.currentPosition.x) * stiffness;
        const forceY = (shard.targetPosition.y - shard.currentPosition.y) * stiffness;
        const forceZ = (shard.targetPosition.z - shard.currentPosition.z) * stiffness;

        shard.springVelocity.x = (shard.springVelocity.x + forceX * delta) * damping;
        shard.springVelocity.y = (shard.springVelocity.y + forceY * delta) * damping;
        shard.springVelocity.z = (shard.springVelocity.z + forceZ * delta) * damping;

        shard.currentPosition.addScaledVector(shard.springVelocity, delta * 8);

        shard.currentRotation.x = THREE.MathUtils.lerp(shard.currentRotation.x, shard.targetRotation.x, delta * 6);
        shard.currentRotation.y = THREE.MathUtils.lerp(shard.currentRotation.y, shard.targetRotation.y, delta * 6);
        shard.currentRotation.z = THREE.MathUtils.lerp(shard.currentRotation.z, shard.targetRotation.z, delta * 6);
      }

      shard.mesh.position.copy(shard.currentPosition);
      shard.mesh.rotation.copy(shard.currentRotation);
    });
  }

  public dispose() {
    this.shards.forEach((s) => {
      s.mesh.geometry.dispose();
      (s.mesh.material as THREE.Material).dispose();
      s.edgeLine.geometry.dispose();
      (s.edgeLine.material as THREE.Material).dispose();
    });
    this.glassMaterial.dispose();
    this.edgeMaterial.dispose();
  }
}
