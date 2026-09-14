import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service — Thaasbai",
  description: "The rules for using Thaasbai, including coins, purchases and fair play.",
};

/**
 * Terms of Service.
 *
 * Two clauses here are load-bearing rather than boilerplate, and should not
 * be softened without understanding why they exist:
 *
 *  - Coins are explicitly one-way and have no cash value. That single
 *    statement is most of what separates a casual card game from real-money
 *    gaming in most jurisdictions. If coins ever become cashable, tradable
 *    between players, or stakeable on a match, this document and the app's
 *    entire regulatory position change.
 *  - Fair play names client modification specifically, because the client is
 *    the thing an attacker controls.
 *
 * PLACEHOLDERS: operator name and contact address must be filled in before
 * submission to any store.
 */
export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="2026-09-14">
      <p>
        These terms apply to Thaasbai, a card-game service for Mindi and Gin Rummy, operated by{" "}
        <strong>[OPERATOR NAME]</strong> in the Republic of Maldives. By creating an account or
        using the app you agree to them.
      </p>

      <h2>Your account</h2>
      <p>
        You are responsible for what happens on your account and for keeping your sign-in details
        private. One person, one account. Do not impersonate another player, and do not use a
        display name that is offensive or misleading.
      </p>

      <h2>Coins and purchases</h2>
      <p>
        Coins are a virtual in-game currency. They have <strong>no cash value</strong>, cannot be
        exchanged for money or anything of value outside the game, cannot be transferred to another
        player, and cannot be wagered against another player. Buying coins buys access to in-game
        content only.
      </p>
      <p>
        Coins and cosmetic items are licensed to you for use within Thaasbai, not sold as property.
        They may be adjusted, withdrawn or reset where needed to correct an error, reverse a
        fraudulent or mistaken transaction, or respond to cheating.
      </p>
      <p>
        Coin purchases are final once the coins are credited, except where a refund is required by
        law. If a top-up is not credited correctly, contact <strong>[CONTACT EMAIL]</strong> and we
        will put it right.
      </p>

      <h2>Fair play</h2>
      <p>
        Do not cheat. That includes modifying the app or its network traffic, automating play,
        exploiting bugs for advantage instead of reporting them, colluding with other players in
        ranked matches, or using more than one account to influence rankings or rewards.
      </p>
      <p>
        Where we find cheating we may reverse affected results and rewards, remove coins or items
        obtained through it, reset rankings, or suspend or close the account.
      </p>

      <h2>Conduct and content</h2>
      <p>
        You are responsible for what you send in direct messages, club chat, and your display name.
        Do not send abusive, harassing, hateful, sexual or illegal content, and do not use the chat
        to advertise or to solicit money from other players. We may remove content and restrict
        accounts that break this rule.
      </p>

      <h2>Availability</h2>
      <p>
        We work to keep the service running, but we do not guarantee it will be uninterrupted or
        error-free. Features, rewards, prices and game rules may change as the game develops. We
        may suspend or discontinue the service, or any part of it.
      </p>

      <h2>Ending your account</h2>
      <p>
        You may stop using Thaasbai and request deletion of your account at any time by writing to{" "}
        <strong>[CONTACT EMAIL]</strong>. We may suspend or close an account that breaks these
        terms. Coins and items are not refunded when an account is closed for a breach.
      </p>

      <h2>Liability</h2>
      <p>
        The service is provided as-is. To the extent permitted by law, we are not liable for
        indirect or consequential loss, or for loss of virtual coins or items. Nothing in these
        terms limits liability that cannot be limited by law.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of the Republic of Maldives.
      </p>

      <h2>Changes</h2>
      <p>
        If these terms change we will update the date at the top of this page. Continuing to use
        the app after a change means you accept the updated terms.
      </p>
    </LegalPage>
  );
}
