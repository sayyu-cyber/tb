import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — Thaasbai",
  description: "What Thaasbai collects, why, and how to get your data removed.",
};

/**
 * Privacy Policy.
 *
 * Every claim here was checked against the code rather than copied from a
 * template. In particular it does NOT mention analytics or push
 * notifications: there is no analytics SDK in the project, and although
 * lib/firebase.ts defines requestFCMToken it is never called, so no push
 * tokens are collected today. If either of those is wired up later, this
 * page has to be updated in the same change — and the Play Data safety form
 * with it.
 *
 * PLACEHOLDERS: the contact address and operator name below must be filled
 * in before this is submitted to any store.
 */
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="2026-09-14">
      <p>
        Thaasbai (&ldquo;we&rdquo;, &ldquo;the app&rdquo;) is a card-game service for Mindi and Gin
        Rummy. This policy explains what we collect, why we collect it, and what you can do about
        it. It covers the website and the mobile app, which share one account system.
      </p>

      <h2>Who is responsible</h2>
      <p>
        The app is operated by <strong>[OPERATOR NAME]</strong>, based in the Republic of Maldives.
        For any privacy question or request, contact <strong>[CONTACT EMAIL]</strong>.
      </p>

      <h2>What we collect</h2>
      <p>
        <strong>Account details.</strong> When you sign in we store your user ID, display name and,
        where you provide one, your email address and profile photo. You can sign in with Google,
        with an email address and password, or as a guest. A guest account stores no email address.
      </p>
      <p>
        <strong>Gameplay data.</strong> We store your match results, trophies, rank, wins, losses,
        total matches played, and the state of matches you are taking part in. This is what makes
        ranking, the leaderboard and matchmaking work.
      </p>
      <p>
        <strong>In-game economy.</strong> We store your coin balance, the cosmetic items you own,
        room cards, VIP status, and a record of coin transactions. If you request a coin top-up we
        store that request, including the coin amount, the price in Maldivian Rufiyaa and its
        approval status.
      </p>
      <p>
        <strong>Social data.</strong> We store your friend list and friend requests, club
        membership, and the content of direct messages and club chat messages you send. We also
        store a &ldquo;last seen&rdquo; timestamp so friends can see whether you are online, and a
        short player code so other players can find you.
      </p>
      <p>
        <strong>On your device.</strong> The app stores your settings (language, sound, music),
        a cached copy of your progress, and interface preferences such as whether the sidebar is
        open. This lives in your browser or app storage and is not sent to us as a separate record.
      </p>
      <p>
        We do <strong>not</strong> use analytics or advertising SDKs, we do not track you across
        other apps or websites, and we do not sell personal data.
      </p>

      <h2>Who can see your data</h2>
      <p>
        Your display name, avatar, rank, trophies, match statistics and player code are visible to
        other players — that is what a leaderboard and a public profile are. Your email address is
        never shown to other players.
      </p>
      <p>
        Direct messages are visible to you and the person you are messaging. Club chat is visible
        to members of that club. Administrators of the service can access data where needed to
        operate it, handle abuse reports, or approve coin top-ups.
      </p>

      <h2>Who processes it for us</h2>
      <p>
        <strong>Google Firebase</strong> (Firebase Authentication and Cloud Firestore) stores
        accounts and game data, and runs our server-side game logic.{" "}
        <strong>Netlify</strong> hosts the website and, like any web host, records standard server
        logs including IP addresses. Both are processors acting on our behalf, and both store data
        on servers outside the Maldives.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Account and gameplay data is kept while your account exists. Match records and chat
        messages are kept so that history, rankings and moderation continue to work. Server logs
        are kept for the period set by our hosting provider.
      </p>

      <h2>Your choices</h2>
      <p>
        You can change your display name and avatar in the app at any time. You can ask us to
        export or delete your account and its data by writing to{" "}
        <strong>[CONTACT EMAIL]</strong>. Deleting your account removes your profile, progress and
        economy record. Messages you sent to other people may remain in their copy of the
        conversation, and results of matches you played remain part of other players&rsquo;
        records.
      </p>

      <h2>Children</h2>
      <p>
        Thaasbai is not directed at children under 13, and we do not knowingly collect data from
        them. If you believe a child has created an account, contact us and we will remove it.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes we will update the date at the top of this page. Continuing to use
        the app after a change means you accept the updated policy.
      </p>
    </LegalPage>
  );
}
