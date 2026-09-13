import { Club, Crown, Spade, Diamond, Heart, Users, ArrowRight } from "lucide-react";
import type { ClubDoc } from "@/lib/clubs";
import { MAX_MEMBERS } from "@/lib/clubs";
import { Button } from "@/components/ui/Button";

export function ClubCard({ club, uid, hasClub, busy, disabled, onJoin, onOpen }: {
  club: ClubDoc; uid: string; hasClub: boolean; busy: boolean; disabled: boolean;
  onJoin: () => void; onOpen: () => void;
}) {
  const member = club.members.includes(uid);
  const owner = member && club.ownerUid === uid;
  const full = club.members.length >= MAX_MEMBERS;
  const seed = Array.from(club.id).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 4;
  const Suit = [Spade, Diamond, Club, Heart][seed];
  return <article className={"club-card club-tone-" + seed}>
    <div className="club-card-art"><div className="club-crest"><Suit size={42} aria-hidden="true" /></div>
      <span className="club-tag">[{club.tag}]</span>
      {member && <span className="club-role">{owner && <Crown size={13} />}{owner ? "Owner" : "Member"}</span>}
    </div>
    <div className="club-card-content"><h3>{club.name}</h3><p className="club-description">{club.description || "A Thaasbai card-game community."}</p>
      <p className="club-member-count"><Users size={15} /> {club.members.length} / {MAX_MEMBERS} members</p>
      <Button fullWidth variant={member ? "secondary" : "primary"} loading={busy}
        disabled={disabled || (!member && (full || hasClub))} onClick={member ? onOpen : onJoin}>
        {member ? owner ? "Manage Club" : "Open Club" : full ? "Full" : hasClub ? "Already in a club" : "Join Club"}{member && <ArrowRight size={16} />}
      </Button>
    </div>
  </article>;
}
