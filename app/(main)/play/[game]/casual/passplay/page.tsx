import { PassPlayClient } from "@/components/game/PassPlayClient";

export function generateStaticParams() {
  return [
    { game: "mindi" },
    { game: "gin-rummy" },
  ];
}

export default function PassPlayPage({ params }: { params: { game: string } }) {
  return <PassPlayClient gameId={params.game} />;
}
