/**
 * The turning phone — design/arena/MOBILE.md "The turning phone",
 * design/arena/boards/MRotate.dc.html (`.turn`, 132px) and MPlay.dc.html
 * (`.turn.sm`, 96px on the sheet).
 *
 * A phone outline holding a landscape table, drawn sideways so that it reads
 * correctly once the phone has turned, with a lime arc arrow above showing
 * which way. It turns on `turnPhone` - 2.8s, cubic-bezier(.6,0,.3,1): it
 * holds upright, turns -90 degrees, holds, and turns back. Under reduced
 * motion it rests sideways, which still says "sideways" without the loop.
 *
 * All of that is in the generated CSS. This is only the board's markup, and
 * it is shared because the gate and the sheet draw the same picture at two
 * sizes.
 */
export function TurningPhone({ small = false }: { small?: boolean }) {
  return (
    <span className={small ? "turn sm" : "turn"} aria-hidden="true">
      <svg className="arc" viewBox="0 0 132 132" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M110.4 28.7A58 58 0 0 0 21.6 28.7" />
        <path d="M31.3 26.1L21.6 28.7L22.5 18.7" />
      </svg>
      <span className="ph">
        <span className="scr"><i /><b /></span>
      </span>
    </span>
  );
}
