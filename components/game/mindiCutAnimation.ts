import * as THREE from "three";
import { CARD_BACK_MARKS, CARD_BACK_STYLES } from "./PlayingCard";
import { FirstPlayerDraw, SeatIndex, rankLabel } from "@/lib/mindiEngine";
import { DecorateTable } from "./mindiTableRenderer";
import { CUT_TIMELINE as T } from "./mindiCutTimeline";

export interface CutAnimationOptions {
  draw: FirstPlayerDraw;
  seats: SeatIndex[];
  viewer: SeatIndex;
  backs: Partial<Record<SeatIndex, string>>;
  elapsed: () => number;
  label: (seat: SeatIndex, x: number, y: number, visible: boolean) => void;
}

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
const mix = THREE.MathUtils.lerp;
const glyph = { S: "\u2660", H: "\u2665", D: "\u2666", C: "\u2663" };

/** The animation presents the engine's settled draw. It never generates cards. */
export function cutAnimation(options: CutAnimationOptions): DecorateTable {
  return (scene, camera, renderer) => {
    const { draw, seats, viewer, backs, elapsed, label } = options;
    let compact = false, spread = 2.4, compactX = 1.6;
    const textures = new Map<string, THREE.CanvasTexture>();
    const colorProbe = document.createElement("span");
    colorProbe.style.display = "none";
    document.body.appendChild(colorProbe);
    function color(value: string) {
      colorProbe.style.color = value;
      return getComputedStyle(colorProbe).color;
    }
    function texture(key: string, seat?: SeatIndex) {
      const cached = textures.get(key);
      if (cached) return cached;
      const canvas = document.createElement("canvas");
      canvas.width = 256; canvas.height = 360;
      const c = canvas.getContext("2d")!;
      if (seat !== undefined) {
        const card = draw.cards[seat];
        c.fillStyle = "#fffdf6"; c.fillRect(0, 0, 256, 360);
        c.fillStyle = card.suit === "H" || card.suit === "D" ? "#ca2339" : "#101820";
        for (let i = 0; i < 2; i++) {
          c.save();
          if (i) { c.translate(256, 360); c.rotate(Math.PI); }
          c.font = "bold 43px Arial"; c.fillText(rankLabel(card.rank), 17, 49);
          c.font = "36px Arial"; c.fillText(glyph[card.suit], 18, 85);
          c.restore();
        }
        c.textAlign = "center"; c.textBaseline = "middle";
        c.font = "118px Arial"; c.fillText(glyph[card.suit], 128, 185);
      } else {
        const skin = CARD_BACK_STYLES[key] ?? CARD_BACK_STYLES.cb_default;
        c.fillStyle = color(skin.base); c.fillRect(0, 0, 256, 360);
        c.strokeStyle = color(skin.weave); c.lineWidth = 2;
        for (let x = -360; x < 620; x += 16) {
          c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 360, 360); c.stroke();
          c.beginPath(); c.moveTo(x, 0); c.lineTo(x - 360, 360); c.stroke();
        }
        c.strokeStyle = color(skin.ring); c.lineWidth = 4;
        c.strokeRect(9, 9, 238, 342); c.lineWidth = 2; c.strokeRect(16, 16, 224, 328);
        c.save(); c.translate(128, 180); c.rotate(Math.PI / 4);
        c.fillStyle = color(skin.base); c.fillRect(-49, -49, 98, 98); c.strokeRect(-49, -49, 98, 98); c.restore();
        c.fillStyle = color(skin.ring); c.textAlign = "center"; c.textBaseline = "middle";
        c.font = "bold 64px Georgia"; c.fillText(CARD_BACK_MARKS[key] ?? "T", 128, 185);
      }
      const result = new THREE.CanvasTexture(canvas);
      result.colorSpace = THREE.SRGBColorSpace;
      result.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      textures.set(key, result); return result;
    }
    const w = 1.35, h = 1.9, r = .085;
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2 + r, -h / 2);
    shape.lineTo(w / 2 - r, -h / 2); shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    shape.lineTo(w / 2, h / 2 - r); shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    shape.lineTo(-w / 2 + r, h / 2); shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    shape.lineTo(-w / 2, -h / 2 + r); shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    const bodyGeometry = new THREE.ExtrudeGeometry(shape, { depth: .025, bevelEnabled: true, bevelSize: .012, bevelThickness: .008, bevelSegments: 2, steps: 1 });
    bodyGeometry.translate(0, 0, -.0125);
    const faceGeometry = new THREE.ShapeGeometry(shape);
    const positions = faceGeometry.getAttribute("position"), uv = faceGeometry.getAttribute("uv");
    for (let i = 0; i < positions.count; i++) uv.setXY(i, positions.getX(i) / w + .5, positions.getY(i) / h + .5);
    const edge = new THREE.MeshStandardMaterial({ color: "#dfd7bc", roughness: .65 });
    const gold = new THREE.MeshStandardMaterial({ color: "#ffcf66", metalness: .8, roughness: .24, emissive: "#92611a", emissiveIntensity: .25 });
    const materials = new Map<string, THREE.MeshBasicMaterial>();
    function material(key: string, seat?: SeatIndex) {
      if (!materials.has(key)) materials.set(key, new THREE.MeshBasicMaterial({ map: texture(key, seat), toneMapped: false }));
      return materials.get(key)!;
    }
    function card(back: string, seat?: SeatIndex) {
      const group = new THREE.Group();
      const body = new THREE.Mesh(bodyGeometry, seat === draw.winner ? gold : edge);
      group.add(body);
      const rear = new THREE.Mesh(faceGeometry, material(back));
      rear.position.z = -.022; rear.rotation.y = Math.PI; group.add(rear);
      if (seat !== undefined) {
        const front = new THREE.Mesh(faceGeometry, material(`face-${seat}`, seat));
        front.position.z = .022; group.add(front);
      }
      group.rotation.x = Math.PI / 2;
      scene.add(group); return group;
    }
    const deckBack = backs[viewer] ?? "cb_default";
    const deck = Array.from({ length: 24 }, () => card(deckBack));
    const drawn = seats.map(seat => card(backs[seat] ?? "cb_default", seat));
    const flights = Array.from({ length: 12 }, (_, i) => card(backs[seats[i % seats.length]] ?? "cb_default"));
    colorProbe.remove();

    // Soft contact shadows move with the cards, without a costly shadow map.
    const shadowCanvas = document.createElement("canvas"); shadowCanvas.width = shadowCanvas.height = 128;
    const s = shadowCanvas.getContext("2d")!;
    s.filter = "blur(10px)"; s.fillStyle = "#000b"; s.fillRect(24, 18, 80, 92);
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeometry = new THREE.PlaneGeometry(2.1, 2.6);
    const shadows = drawn.map(() => {
      const mesh = new THREE.Mesh(shadowGeometry, new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, opacity: .5 }));
      mesh.rotation.x = -Math.PI / 2; mesh.position.y = .21; scene.add(mesh); return mesh;
    });
    const point = new THREE.Vector3();
    function target(i: number) {
      return compact && seats.length === 4
        ? { x: i % 2 === 0 ? -compactX : compactX, z: i < 2 ? -3.1 : 3.1 }
        : { x: (i - (seats.length - 1) / 2) * spread, z: .7 };
    }
    return {
      resize(width, height) {
        compact = width < 650;
        const worldWidth = compact ? Math.max(7.7, 9.6 * width / height) : Math.max(15.5, 6.5 * width / height);
        spread = worldWidth * .155;
        compactX = worldWidth * .208;
        const worldHeight = worldWidth * height / width;
        camera.left = -worldWidth / 2; camera.right = worldWidth / 2;
        camera.top = worldHeight / 2; camera.bottom = -worldHeight / 2;
        camera.updateProjectionMatrix();
      },
      update() {
        const t = elapsed();
        deck.forEach((mesh, i) => {
          const side = i < 12 ? -1 : 1;
          const split = Math.sin(clamp(t / T.fan) * Math.PI);
          const fan = Math.sin(clamp((t - T.fan) / (T.draw - T.fan)) * Math.PI);
          const angle = (i / 23 - .5) * 1.9;
          mesh.visible = t < T.draw + 650 || t >= T.dealing;
          mesh.position.set(side * split * 1.15 + Math.sin(angle) * fan * 3.7, .3 + i * .026 + split * .7 + fan * .28, -.1 + (1 - Math.cos(angle)) * fan * 2.2);
          mesh.rotation.set(Math.PI / 2 + side * split * .23, 0, side * split * .12 - angle * fan);
          if (t >= T.draw && t < T.dealing) mesh.scale.setScalar(1 - ease((t - T.draw) / 650));
          else mesh.scale.setScalar(1);
        });
        drawn.forEach((mesh, i) => {
          const seat = seats[i], end = target(i);
          const travel = ease((t - T.draw - i * 135) / 650);
          const flip = ease((t - T.reveal - i * 150) / 620);
          const win = seat === draw.winner ? ease((t - T.winner) / 550) : 0;
          const away = ease((t - T.dealing) / 420);
          mesh.visible = t >= T.draw + i * 135 && away < 1;
          mesh.position.set(mix(0, end.x, travel), .3 + Math.sin(travel * Math.PI) * 1.6 + flip * .78 + win * .55, mix(-.1, end.z, travel));
          mesh.rotation.set(mix(Math.PI / 2, -.87, flip), Math.sin(travel * Math.PI) * .25, (i - (seats.length - 1) / 2) * -.035 * travel);
          mesh.scale.setScalar((1 + win * .14) * (1 - away));
          const shadow = shadows[i]; shadow.visible = mesh.visible;
          shadow.position.x = mesh.position.x; shadow.position.z = mesh.position.z;
          shadow.material.opacity = .48 - win * .15;
          point.set(end.x, .45, end.z + .95).project(camera);
          label(seat, (point.x + 1) * 50, (1 - point.y) * 50, travel > .85 && away < .5);
        });
        flights.forEach((mesh, i) => {
          const progress = clamp((t - T.dealing - i * 65) / 560);
          const seat = seats[i % seats.length];
          const corner = seats.length === 2 ? seat === viewer ? 0 : 2 : (seat - viewer + 4) % 4;
          const destinations = [[0, 4.8], [-6.8, 0], [0, -4.7], [6.8, 0]];
          const [x, z] = destinations[corner];
          mesh.visible = progress > 0 && progress < 1;
          mesh.position.set(x * ease(progress), .7 + Math.sin(progress * Math.PI) * 1.3, mix(-.1, z, ease(progress)));
          mesh.rotation.set(Math.PI / 2, 0, progress * (corner % 2 ? Math.PI / 2 : 0));
          mesh.scale.setScalar(1 - progress * .25);
        });
        return t < T.end;
      },
      dispose() { textures.forEach(value => value.dispose()); shadowTexture.dispose(); },
    };
  };
}
