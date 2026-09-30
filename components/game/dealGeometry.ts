/**
 * Where the opening deal happens on the table - the GEO constants and place()
 * from design/arena/boards/Cut.dc.html (desktop) and PCut.dc.html (phone).
 *
 * Everything is in TABLE space: the 1200x740 `.table` element, before the
 * table's own `rotateX(..) scale(..)`. Cards pivot on their near edge
 * (transform-origin 50% 100%) so they can stand up, and place() turns a
 * card's centre on the felt into the translate that pivot needs.
 */

/** A seat as the viewer sees it: you at the bottom, then clockwise. */
export type Spot = "S" | "W" | "N" | "E";
export const SPOTS: Spot[] = ["S", "W", "N", "E"];

type Point = [number, number];
type Placed = [number, number, number];

export interface DealGeo {
  /** The table's own tilt, which the standing winner leans back against. */
  rx: number;
  sm: Point;
  lg: Point;
  /** How the winner shows: tilt, scale and height off the felt. */
  winRx?: number;
  winS?: number;
  winZ?: number;
  /** Desktop stands a "First to play" plate over the winner; the phone does not. */
  standee: boolean;
  /** Where your pile lifts away to as your hand comes up. */
  goneY?: number;
  goneZ?: number;
  /** The riffle and the spread happen around this point. */
  deck: Point;
  arc: { half: number; y: number; bow: number; tilt: number };
  riffle: number;
  /** Which of the spread's 26 cards each seat draws, in drawing order. */
  slots: { four: number[]; two: number[] };
  cut: Record<Spot, Placed>;
  center: Point;
  pile: Record<Spot, Placed>;
  /** The dealer's deck, per the dealer's seat, and its turn on the felt. */
  dealDeck: Record<Spot, Placed>;
  stock: Point;
  upcard: Point;
}

/**
 * Desktop, 1440x900, table at rotateX(52deg) scale(.86).
 *
 * The board draws Shifa (E) dealing Mindi and Hussain (N) dealing Gin, so
 * those two decks are its own numbers. A real dealer can sit anywhere, so
 * the other two are the same decks mirrored across the table: W is E's deck
 * reflected left to right, S is N's reflected through the table's centre.
 */
export const GEO_DESKTOP: DealGeo = {
  rx: 52,
  sm: [96, 134],
  lg: [120, 168],
  standee: true,
  deck: [600, 372],
  arc: { half: 222, y: 404, bow: 44, tilt: 14 },
  riffle: 80,
  slots: { four: [14, 4, 10, 21], two: [14, 9] },
  cut: { S: [600, 584, 0], W: [256, 404, -4], N: [600, 190, 3], E: [944, 404, 4] },
  center: [600, 404],
  pile: { S: [600, 742, 0], W: [176, 372, 90], N: [600, 94, 180], E: [1024, 372, -90] },
  dealDeck: { E: [966, 262, -90], N: [780, 150, 180], W: [234, 262, 90], S: [420, 590, 0] },
  stock: [530, 372],
  upcard: [676, 378],
};

/**
 * Phone held sideways, 844x390, table at rotateX(50deg) scale(.5). Cards in
 * table space are drawn at twice their screen size, and the winner floats
 * flat and lifted rather than standing (PCut.dc.html).
 */
export const GEO_PHONE: DealGeo = {
  rx: 50,
  sm: [96, 134],
  lg: [124, 174],
  winRx: 0,
  winS: 1.28,
  winZ: 64,
  standee: false,
  goneY: 160,
  goneZ: 24,
  deck: [600, 404],
  arc: { half: 200, y: 440, bow: 20, tilt: 12 },
  riffle: 80,
  slots: { four: [14, 4, 10, 21], two: [14, 9] },
  cut: { S: [600, 590, 0], W: [238, 440, -4], N: [600, 252, 3], E: [962, 440, 4] },
  center: [600, 424],
  pile: { S: [600, 742, 0], W: [244, 372, 90], N: [600, 268, 180], E: [956, 372, -90] },
  dealDeck: { E: [1000, 262, -90], N: [860, 290, 180], W: [200, 262, 90], S: [340, 450, 0] },
  stock: [530, 404],
  upcard: [676, 408],
};

/** The pack stands in for itself with 26 cards while it is shuffled and spread. */
export const NDECK = 26;

const f1 = (v: number) => Math.round(v * 10) / 10;

/** place() from the board. */
export function place(cx: number, cy: number, z: number, rz: number, rx: number, ry: number, s: number, w: number, h: number): string {
  const a = (rz * Math.PI) / 180, hh = (h / 2) * s;
  const bx = cx - hh * Math.sin(a), by = cy + hh * Math.cos(a);
  return `translate3d(${f1(bx - w / 2)}px,${f1(by - h)}px,${f1(z)}px) rotateZ(${f1(rz)}deg) rotateX(${f1(rx)}deg) rotateY(${f1(ry)}deg) scale(${s})`;
}

/** Where card k of the ribbon spread lies. */
export function arcAt(geo: DealGeo, k: number) {
  const u = (k / (NDECK - 1)) * 2 - 1;
  return {
    x: geo.deck[0] + u * geo.arc.half,
    y: geo.arc.y - geo.arc.bow * (1 - u * u),
    rz: u * geo.arc.tilt,
    z: 1 + k * 0.35,
  };
}

/** A small card lying flat at a point. */
export function flat(geo: DealGeo, p: Point, z: number, rz = 0): string {
  return place(p[0], p[1], z, rz, 0, 0, 1, geo.sm[0], geo.sm[1]);
}
