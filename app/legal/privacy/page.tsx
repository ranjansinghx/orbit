import Link from "next/link";
import OrbitMark from "@/components/OrbitMark";
import LegalDisclaimer from "@/components/LegalDisclaimer";

export const metadata = { title: "Privacy Policy — Orbit" };

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <Link href="/" className="flex items-center gap-2 mb-8 w-fit">
        <OrbitMark size={24} />
        <span className="font-display italic text-lg">Orbit</span>
      </Link>

      <h1 className="font-display italic text-3xl mb-2">Privacy Policy</h1>
      <p className="text-muted text-sm mb-6">Last updated: [date]</p>

      <LegalDisclaimer />

      <div className="flex flex-col gap-6 text-[15px] leading-relaxed text-paper/90">
        <section>
          <h2 className="font-semibold text-lg mb-2">1. What we collect</h2>
          <p className="mb-2">
            Based on what the app actually stores today, this section should cover at minimum:
          </p>
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li>Account info: email, username, display name, bio, profile photo</li>
            <li>Content you create: posts, comments, messages, drafts</li>
            <li>Activity: likes, follows, reposts, saves, views, watch time</li>
            <li>Device/technical data: uploaded media files, push notification subscriptions</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-lg mb-2">2. How we use it</h2>
          <p>
            [Add: ranking/recommendation use, notification delivery, abuse prevention via the
            reporting system, and any analytics use — this app uses Vercel Analytics, which
            should be disclosed here along with what it tracks.]
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-lg mb-2">3. Who we share it with</h2>
          <p>
            [Add: sub-processors actually in use — Supabase (database, auth, storage), Vercel
            (hosting, analytics), and any push notification infrastructure. Name them
            specifically; &ldquo;third parties&rdquo; alone isn&apos;t sufficient in most jurisdictions.]
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-lg mb-2">4. Your rights</h2>
          <p>
            You can download a copy of your data at any time from Settings, and delete your
            account and all associated data at any time from Settings. [Add: applicable
            regional rights — GDPR/CCPA language if you have users in those regions, and how
            long deletion takes to fully propagate.]
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-lg mb-2">5. Data retention</h2>
          <p>[Add: how long data is kept after account deletion, backup retention windows.]</p>
        </section>

        <section>
          <h2 className="font-semibold text-lg mb-2">6. Cookies &amp; similar technology</h2>
          <p>
            [Add: session cookies used for authentication (Supabase Auth), and any analytics
            cookies/identifiers from Vercel Analytics.]
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-lg mb-2">7. Children&apos;s privacy</h2>
          <p>[Add: minimum age and what happens if an underage account is discovered.]</p>
        </section>

        <section>
          <h2 className="font-semibold text-lg mb-2">8. Contact</h2>
          <p>[Add: an actual contact email or address for privacy requests.]</p>
        </section>
      </div>
    </div>
  );
}
