import Link from "next/link";
import OrbitMark from "@/components/OrbitMark";
import LegalDisclaimer from "@/components/LegalDisclaimer";

export const metadata = { title: "Terms of Service — Orbit" };

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <Link href="/" className="flex items-center gap-2 mb-8 w-fit">
        <OrbitMark size={24} />
        <span className="font-display italic text-lg">Orbit</span>
      </Link>

      <h1 className="font-display italic text-3xl mb-2">Terms of Service</h1>
      <p className="text-muted text-sm mb-6">Last updated: [date]</p>

      <LegalDisclaimer />

      <div className="flex flex-col gap-6 text-[15px] leading-relaxed text-paper/90">
        <section>
          <h2 className="font-semibold text-lg mb-2">1. Acceptance of terms</h2>
          <p>
            By creating an account or using Orbit, you agree to these terms. If you don&apos;t
            agree, don&apos;t use the service. [Add: governing law, entity name, contact method.]
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-lg mb-2">2. Who can use Orbit</h2>
          <p>
            [Add: minimum age requirement, account eligibility, one-account-per-person rules if
            any, geographic restrictions if any.]
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-lg mb-2">3. Your content</h2>
          <p>
            You retain ownership of what you post. By posting, you grant Orbit a license to
            host, display, and distribute it as part of operating the service. [Add: specifics
            on license scope, what happens to content after account deletion, DMCA/takedown
            process.]
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-lg mb-2">4. Acceptable use</h2>
          <p>
            [Add: prohibited content categories, spam/abuse policy, consequences —
            reference the in-app reporting and blocking tools as the enforcement
            mechanism, and describe what triggers a suspension or ban.]
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-lg mb-2">5. Termination</h2>
          <p>
            You can delete your account at any time from Settings. [Add: grounds on which Orbit
            may suspend or terminate an account, what happens to content on termination.]
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-lg mb-2">6. Disclaimers &amp; limitation of liability</h2>
          <p>[Add: standard &ldquo;as-is&rdquo; disclaimer, liability cap, indemnification if applicable.]</p>
        </section>

        <section>
          <h2 className="font-semibold text-lg mb-2">7. Changes to these terms</h2>
          <p>[Add: how you&apos;ll notify users of changes, and how continued use constitutes acceptance.]</p>
        </section>

        <section>
          <h2 className="font-semibold text-lg mb-2">8. Contact</h2>
          <p>[Add: an actual contact email or address.]</p>
        </section>
      </div>
    </div>
  );
}
