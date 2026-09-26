/**
 * The Arena shared layer.
 *
 * Every piece here renders the board's own classes from
 * styles/arena-app.css (generated from design/arena/app-reference.css), so
 * a screen never hand-writes them and the markup cannot drift from the
 * reference. They all assume they are inside the app shell, which carries
 * the `arena-app` namespace class.
 *
 * Both agents building app screens import from here. If something you need
 * is missing, say so rather than restyling a shared piece in place - see
 * design/arena/WORKSPLIT.md.
 */
export { Panel, PanelHead } from "./Panel";
export type { PanelProps } from "./Panel";

export { PageHeader } from "./PageHeader";
export type { PageHeaderProps } from "./PageHeader";

export { Tabs } from "./Tabs";
export type { TabItem, TabsProps } from "./Tabs";

export { Pill } from "./Pill";
export type { PillProps, PillTone } from "./Pill";

export { RankLabel, RankHex, CrownGlyph } from "./RankBadge";
export type { RankTier } from "./RankBadge";

export { Meter } from "./Meter";
export type { MeterProps } from "./Meter";

export { Avatar, AvatarStack, toneFor } from "./Avatar";
export type { AvatarProps, AvatarTone, Presence } from "./Avatar";

export { CoinGem, CoinCount } from "./CoinGem";

export { StatTile, StatRow } from "./StatTile";

export { CardBackArt, cardBackArtFor, CARD_BACK_ART } from "./CardBackArt";
export type { CardBackArtName, CardBackArtProps } from "./CardBackArt";

export { TableSwatch, tableArtFor, TABLE_ART } from "./TableSwatch";
export type { TableArtName, TableSwatchProps } from "./TableSwatch";
