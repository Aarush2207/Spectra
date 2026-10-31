import * as THREE from 'three';
import { RobotState } from '../types/robot';

export class SpectraRobot {
  public group: THREE.Group;
  public headGroup: THREE.Group;
  public bodyGroup: THREE.Group;
  public armLeft: THREE.Group;
  public armRight: THREE.Group;
  public eyes!: {
    left: THREE.Mesh;
    right: THREE.Mesh;
    haloLeft: THREE.Mesh;
    haloRight: THREE.Mesh;
    material: THREE.MeshBasicMaterial;
    haloMaterial: THREE.MeshBasicMaterial;
  };
  public chestLeds: THREE.Mesh[];
  public auraLight: THREE.PointLight;
  public rimLight: THREE.PointLight;

  private state: RobotState = 'idle';
  private eyeBlink: number = 1.0;
  private blinkTimer: number = 0;
  private nextBlinkInterval: number = 3.0;
  private isBlinking: boolean = false;
  private targetLook: THREE.Vector2 = new THREE.Vector2(0, 0);
  private currentLook: THREE.Vector2 = new THREE.Vector2(0, 0);
  private eyeLookOffset: THREE.Vector2 = new THREE.Vector2(0, 0);

  // Materials for reuse and disposal
  private ceramicMaterial: THREE.MeshPhysicalMaterial;
  private darkChromeMaterial: THREE.MeshStandardMaterial;
  private screenMaterial: THREE.MeshPhysicalMaterial;
  private accentOrangeMaterial: THREE.MeshStandardMaterial;
  private ledMaterials: THREE.MeshBasicMaterial[];

  constructor() {
    this.group = new THREE.Group();
    this.bodyGroup = new THREE.Group();
    this.headGroup = new THREE.Group();
    this.armLeft = new THREE.Group();
    this.armRight = new THREE.Group();
    this.chestLeds = [];
    this.ledMaterials = [];

    // 1. Physically Based Materials
    // Ceramic White Shell
    this.ceramicMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xeeebe6,
      roughness: 0.18,
      metalness: 0.04,
      clearcoat: 0.85,
      clearcoatRoughness: 0.12,
      reflectivity: 0.9,
    });

    // Dark Metallic / Chrome Joints
    this.darkChromeMaterial = new THREE.MeshStandardMaterial({
      color: 0x18181c,
      roughness: 0.25,
      metalness: 0.85,
    });

    // Glossy Face Screen
    this.screenMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x08080c,
      roughness: 0.06,
      metalness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      reflectivity: 0.95,
    });

    // Accent Orange
    this.accentOrangeMaterial = new THREE.MeshStandardMaterial({
      color: 0xff9a6a,
      roughness: 0.3,
      metalness: 0.2,
      emissive: 0xff7a40,
      emissiveIntensity: 0.3,
    });

    // 2. Build Robot Geometry
    this.buildTorso();
    this.buildHead();
    this.buildArms();
    this.buildBase();

    // 3. Dynamic Studio Lights attached to character
    this.auraLight = new THREE.PointLight(0x8055e8, 1.8, 4.5);
    this.auraLight.position.set(0.6, 1.2, 0.4);
    this.group.add(this.auraLight);

    this.rimLight = new THREE.PointLight(0xff9a6a, 1.2, 3.8);
    this.rimLight.position.set(-0.8, 0.8, -0.6);
    this.group.add(this.rimLight);

    this.group.add(this.bodyGroup);
  }

  private buildHead() {
    // Head pivot is placed at the neck
    this.headGroup.position.set(0, 0.95, 0);

    // Rounded rectangular ceramic head
    const headGeom = new THREE.BoxGeometry(0.94, 0.76, 0.68, 4, 4, 4);
    // Smooth the box edges visually by displacing vertices slightly
    const pos = headGeom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i);
      const len = v.length();
      v.normalize().multiplyScalar(Math.min(len, 0.58));
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    headGeom.computeVertexNormals();
    const headMesh = new THREE.Mesh(headGeom, this.ceramicMaterial);
    headMesh.castShadow = true;
    headMesh.receiveShadow = true;
    this.headGroup.add(headMesh);

    // Glossy Black Inset Face Screen
    const screenGeom = new THREE.PlaneGeometry(0.72, 0.52, 4, 4);
    const screenMesh = new THREE.Mesh(screenGeom, this.screenMaterial);
    screenMesh.position.set(0, 0.02, 0.345);
    this.headGroup.add(screenMesh);

    // Expressive Glowing Eyes
    const eyeGeom = new THREE.CapsuleGeometry(0.08, 0.11, 8, 16);
    const eyeMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });
    const haloGeom = new THREE.CapsuleGeometry(0.105, 0.14, 8, 16);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xb9abff,
      transparent: true,
      opacity: 0.65,
    });

    const eyeL = new THREE.Mesh(eyeGeom, eyeMat);
    eyeL.position.set(-0.20, 0.03, 0.355);
    const haloL = new THREE.Mesh(haloGeom, haloMat);
    haloL.position.set(-0.20, 0.03, 0.352);

    const eyeR = new THREE.Mesh(eyeGeom, eyeMat);
    eyeR.position.set(0.20, 0.03, 0.355);
    const haloR = new THREE.Mesh(haloGeom, haloMat);
    haloR.position.set(0.20, 0.03, 0.352);

    this.headGroup.add(eyeL);
    this.headGroup.add(haloL);
    this.headGroup.add(eyeR);
    this.headGroup.add(haloR);

    this.eyes = {
      left: eyeL,
      right: eyeR,
      haloLeft: haloL,
      haloRight: haloR,
      material: eyeMat,
      haloMaterial: haloMat,
    };

    // Lateral Audio Sensors / Ceramic Ear Pods with illuminated accent rings
    const earGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 24);
    earGeom.rotateZ(Math.PI / 2);

    const earL = new THREE.Mesh(earGeom, this.ceramicMaterial);
    earL.position.set(-0.49, 0.02, 0);
    const earR = new THREE.Mesh(earGeom, this.ceramicMaterial);
    earR.position.set(0.49, 0.02, 0);

    const ringGeom = new THREE.TorusGeometry(0.1, 0.015, 12, 24);
    ringGeom.rotateY(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x8055e8 });
    const ringL = new THREE.Mesh(ringGeom, ringMat);
    ringL.position.set(-0.53, 0.02, 0);
    const ringR = new THREE.Mesh(ringGeom, ringMat);
    ringR.position.set(0.53, 0.02, 0);

    this.headGroup.add(earL);
    this.headGroup.add(earR);
    this.headGroup.add(ringL);
    this.headGroup.add(ringR);

    // Subtle head antenna / sensor probe
    const antennaStem = new THREE.CylinderGeometry(0.015, 0.015, 0.15, 8);
    const stemMesh = new THREE.Mesh(antennaStem, this.darkChromeMaterial);
    stemMesh.position.set(0, 0.44, -0.05);
    const antennaOrb = new THREE.SphereGeometry(0.035, 16, 16);
    const orbMesh = new THREE.Mesh(antennaOrb, this.accentOrangeMaterial);
    orbMesh.position.set(0, 0.52, -0.05);

    this.headGroup.add(stemMesh);
    this.headGroup.add(orbMesh);

    this.bodyGroup.add(this.headGroup);
  }

  private buildTorso() {
    // Neck gimbal
    const neckGeom = new THREE.CylinderGeometry(0.14, 0.18, 0.2, 16);
    const neckMesh = new THREE.Mesh(neckGeom, this.darkChromeMaterial);
    neckMesh.position.set(0, 0.85, 0);
    this.bodyGroup.add(neckMesh);

    // Torso Main Egg/Oval Ceramic Shell
    const torsoGeom = new THREE.SphereGeometry(0.52, 24, 24);
    torsoGeom.scale(0.85, 1.1, 0.75);
    const torsoMesh = new THREE.Mesh(torsoGeom, this.ceramicMaterial);
    torsoMesh.position.set(0, 0.35, 0);
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    this.bodyGroup.add(torsoMesh);

    // Chest Inset Plate
    const chestPlateGeom = new THREE.BoxGeometry(0.38, 0.28, 0.05);
    const chestPlate = new THREE.Mesh(chestPlateGeom, this.darkChromeMaterial);
    chestPlate.position.set(0, 0.42, 0.36);
    this.bodyGroup.add(chestPlate);

    // Chest Status Micro-LEDs
    for (let i = 0; i < 3; i++) {
      const ledGeom = new THREE.CircleGeometry(0.022, 12);
      const ledMat = new THREE.MeshBasicMaterial({ color: 0x8055e8 });
      const led = new THREE.Mesh(ledGeom, ledMat);
      led.position.set(-0.1 + i * 0.1, 0.42, 0.39);
      this.bodyGroup.add(led);
      this.chestLeds.push(led);
      this.ledMaterials.push(ledMat);
    }
  }

  private buildArms() {
    // Left Arm Group
    this.armLeft.position.set(-0.46, 0.52, 0);
    const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), this.darkChromeMaterial);
    this.armLeft.add(shoulderL);

    const bicepL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.28, 12), this.ceramicMaterial);
    bicepL.position.set(-0.06, -0.16, 0);
    bicepL.rotation.z = 0.25;
    this.armLeft.add(bicepL);

    const handL = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 16), this.darkChromeMaterial);
    handL.position.set(-0.11, -0.32, 0.04);
    this.armLeft.add(handL);
    this.bodyGroup.add(this.armLeft);

    // Right Arm Group
    this.armRight.position.set(0.46, 0.52, 0);
    const shoulderR = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), this.darkChromeMaterial);
    this.armRight.add(shoulderR);

    const bicepR = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.28, 12), this.ceramicMaterial);
    bicepR.position.set(0.06, -0.16, 0);
    bicepR.rotation.z = -0.25;
    this.armRight.add(bicepR);

    const handR = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 16), this.darkChromeMaterial);
    handR.position.set(0.11, -0.32, 0.04);
    this.armRight.add(handR);
    this.bodyGroup.add(this.armRight);
  }

  private buildBase() {
    // Magnetic Levitation Core / Lower Thruster
    const waistGeom = new THREE.CylinderGeometry(0.24, 0.16, 0.18, 16);
    const waist = new THREE.Mesh(waistGeom, this.darkChromeMaterial);
    waist.position.set(0, -0.14, 0);
    this.bodyGroup.add(waist);

    const ringGeom = new THREE.TorusGeometry(0.28, 0.03, 12, 32);
    ringGeom.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xb9abff });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.position.set(0, -0.25, 0);
    this.bodyGroup.add(ring);

    // Soft Studio Ground Shadow
    const shadowGeom = new THREE.CircleGeometry(0.75, 32);
    shadowGeom.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x141414,
      transparent: true,
      opacity: 0.14,
    });
    const shadow = new THREE.Mesh(shadowGeom, shadowMat);
    shadow.position.set(0, -0.52, 0);
    this.group.add(shadow);
  }

  public setLookTarget(targetX: number, targetY: number) {
    // Clamped target values (-1 to +1 range)
    this.targetLook.set(
      Math.max(-1, Math.min(1, targetX)),
      Math.max(-1, Math.min(1, targetY))
    );
  }

  public setState(newState: RobotState) {
    this.state = newState;
    this.updateStateVisuals();
  }

  private updateStateVisuals() {
    switch (this.state) {
      case 'idle':
        this.eyes.material.color.setHex(0xffffff);
        this.eyes.haloMaterial.color.setHex(0xb9abff);
        this.eyes.haloMaterial.opacity = 0.45;
        this.auraLight.color.setHex(0x8055e8);
        this.auraLight.intensity = 1.8;
        this.rimLight.color.setHex(0xff9a6a);
        break;

      case 'listening':
        // Brighter lavender-cyan, attentive
        this.eyes.material.color.setHex(0xffffff);
        this.eyes.haloMaterial.color.setHex(0x8055e8);
        this.eyes.haloMaterial.opacity = 0.85;
        this.auraLight.color.setHex(0x9d72ff);
        this.auraLight.intensity = 2.4;
        break;

      case 'thinking':
        // Pulsing violet
        this.eyes.material.color.setHex(0xf3edff);
        this.eyes.haloMaterial.color.setHex(0x8055e8);
        this.eyes.haloMaterial.opacity = 0.7;
        this.auraLight.color.setHex(0x8055e8);
        this.auraLight.intensity = 2.0;
        break;

      case 'analysing':
        // Electric lavender with high contrast
        this.eyes.material.color.setHex(0xffffff);
        this.eyes.haloMaterial.color.setHex(0x5633b7);
        this.auraLight.color.setHex(0x5633b7);
        this.auraLight.intensity = 2.6;
        break;

      case 'alert':
        // Warning Amber-Orange with high intensity
        this.eyes.material.color.setHex(0xffffff);
        this.eyes.haloMaterial.color.setHex(0xff6a3d);
        this.eyes.haloMaterial.opacity = 0.9;
        this.auraLight.color.setHex(0xff7a40);
        this.auraLight.intensity = 3.0;
        this.rimLight.color.setHex(0x8055e8);
        break;
    }
  }

  public update(delta: number, time: number) {
    // 1. Natural Breathing & Levitation
    const breathOffset = Math.sin(time * 1.8) * 0.06;
    const levitateOffset = Math.sin(time * 0.9) * 0.08;
    this.bodyGroup.position.y = levitateOffset + breathOffset;

    // 2. Smooth Cursor Tracking with Spring Interpolation (slerp)
    this.currentLook.lerp(this.targetLook, Math.min(1, delta * 4.5));

    // Head yaw & pitch (clamped range for natural movement)
    const targetHeadYaw = this.currentLook.x * 0.42;
    const targetHeadPitch = -this.currentLook.y * 0.28;
    const targetHeadRoll = this.currentLook.x * -0.08;

    this.headGroup.rotation.y = THREE.MathUtils.lerp(this.headGroup.rotation.y, targetHeadYaw, delta * 4);
    this.headGroup.rotation.x = THREE.MathUtils.lerp(this.headGroup.rotation.x, targetHeadPitch, delta * 4);
    this.headGroup.rotation.z = THREE.MathUtils.lerp(this.headGroup.rotation.z, targetHeadRoll + Math.sin(time * 1.2) * 0.02, delta * 3);

    // Slight whole body rotation
    this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, this.currentLook.x * 0.18, delta * 2.5);
    this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, -this.currentLook.y * 0.06, delta * 2.5);

    // Eyes pupil tracking on face screen
    this.eyeLookOffset.set(this.currentLook.x * 0.025, -this.currentLook.y * 0.018);
    this.eyes.left.position.x = -0.19 + this.eyeLookOffset.x;
    this.eyes.left.position.y = 0.03 + this.eyeLookOffset.y;
    this.eyes.haloLeft.position.x = -0.19 + this.eyeLookOffset.x;
    this.eyes.haloLeft.position.y = 0.03 + this.eyeLookOffset.y;

    this.eyes.right.position.x = 0.19 + this.eyeLookOffset.x;
    this.eyes.right.position.y = 0.03 + this.eyeLookOffset.y;
    this.eyes.haloRight.position.x = 0.19 + this.eyeLookOffset.x;
    this.eyes.haloRight.position.y = 0.03 + this.eyeLookOffset.y;

    // 3. Eye Blinking Logic
    this.blinkTimer += delta;
    if (!this.isBlinking && this.blinkTimer >= this.nextBlinkInterval) {
      this.isBlinking = true;
      this.blinkTimer = 0;
      this.nextBlinkInterval = 2.5 + Math.random() * 3.5;
    }

    if (this.isBlinking) {
      this.eyeBlink = Math.max(0.08, this.eyeBlink - delta * 14);
      if (this.eyeBlink <= 0.08) {
        this.isBlinking = false;
      }
    } else {
      this.eyeBlink = Math.min(1.0, this.eyeBlink + delta * 12);
    }

    this.eyes.left.scale.y = this.eyeBlink;
    this.eyes.haloLeft.scale.y = this.eyeBlink;
    this.eyes.right.scale.y = this.eyeBlink;
    this.eyes.haloRight.scale.y = this.eyeBlink;

    // 4. Arm Sway
    this.armLeft.rotation.x = Math.sin(time * 1.4) * 0.08 + (this.currentLook.y * 0.1);
    this.armRight.rotation.x = -Math.sin(time * 1.4) * 0.08 + (this.currentLook.y * 0.1);
    this.armLeft.rotation.z = Math.sin(time * 0.8) * 0.04;
    this.armRight.rotation.z = -Math.sin(time * 0.8) * 0.04;

    // 5. Chest LEDs Animation
    if (this.state === 'thinking' || this.state === 'analysing') {
      const pulseSpeed = this.state === 'analysing' ? 12 : 6;
      this.ledMaterials.forEach((mat, idx) => {
        const brightness = (Math.sin(time * pulseSpeed + idx * 1.5) + 1) * 0.5;
        mat.color.setHex(this.state === 'analysing' ? 0x9d72ff : 0x8055e8);
        (mat as any).opacity = 0.3 + brightness * 0.7;
      });
    } else if (this.state === 'alert') {
      const flash = (Math.sin(time * 10) + 1) * 0.5;
      this.ledMaterials.forEach((mat) => {
        mat.color.setHex(flash > 0.5 ? 0xff4d26 : 0x8055e8);
      });
    } else {
      this.ledMaterials.forEach((mat, idx) => {
        const glow = (Math.sin(time * 2 + idx) + 1) * 0.4 + 0.2;
        mat.color.setHex(0x8055e8);
        (mat as any).opacity = glow;
      });
    }
  }

  public dispose() {
    this.ceramicMaterial.dispose();
    this.darkChromeMaterial.dispose();
    this.screenMaterial.dispose();
    this.accentOrangeMaterial.dispose();
    this.eyes.material.dispose();
    this.eyes.haloMaterial.dispose();
    this.ledMaterials.forEach((m) => m.dispose());
  }
}
