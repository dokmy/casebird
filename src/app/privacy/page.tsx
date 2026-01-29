import Link from "next/link";
import { FeatherIcon } from "@/components/ui/feather-icon";

export const metadata = {
  title: "Privacy Policy - Casebird",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-lg font-serif font-medium text-foreground hover:text-primary transition-colors mb-6"
          >
            <FeatherIcon className="w-5 h-5" />
            Casebird
          </Link>
          <h1 className="text-3xl font-serif font-semibold text-foreground">
            Privacy Policy
          </h1>
          <p className="font-serif text-sm text-muted-foreground mt-2">
            Last updated: January 2025
          </p>
        </div>

        {/* Content */}
        <div className="font-serif text-foreground leading-relaxed space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
            <p>
              Casebird (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) is committed to protecting
              your privacy. This Privacy Policy explains how we collect, use, store, and share
              your personal data when you use the Casebird service (&ldquo;the Service&rdquo;).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
            <p className="mb-3">We collect the following types of information:</p>
            <ul className="list-disc pl-6 space-y-3">
              <li>
                <strong>Account information:</strong> Your email address and encrypted password
                when you create an account.
              </li>
              <li>
                <strong>Chat history:</strong> Your research queries and the AI-generated
                responses, stored to enable conversation history and continuity.
              </li>
              <li>
                <strong>Usage data:</strong> Information about how you interact with the Service,
                including pages visited, features used, and timestamps.
              </li>
              <li>
                <strong>Device information:</strong> Browser type, operating system, and IP
                address, collected automatically through standard web protocols.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
            <p className="mb-3">We use your information to:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Provide, maintain, and improve the Service</li>
              <li>Store and display your conversation history</li>
              <li>Authenticate your identity and secure your account</li>
              <li>Analyse usage patterns to improve the quality of our AI responses</li>
              <li>Communicate with you about the Service, including updates and changes</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Third-Party Services</h2>
            <p className="mb-3">
              We use the following third-party services to operate the Service. Your data may be
              processed by these providers in accordance with their respective privacy policies:
            </p>
            <ul className="list-disc pl-6 space-y-3">
              <li>
                <strong>Supabase:</strong> Authentication and database hosting. Your account
                information and chat history are stored securely on Supabase infrastructure.
              </li>
              <li>
                <strong>Google (Gemini API):</strong> AI model provider. Your research queries are
                sent to Google&apos;s Gemini API to generate responses. Google may process this data
                in accordance with their privacy policy.
              </li>
              <li>
                <strong>Pinecone:</strong> Vector database for case law search. Your search
                queries are processed to find relevant legal cases.
              </li>
              <li>
                <strong>Vercel:</strong> Application hosting and deployment.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Data Retention</h2>
            <p>
              We retain your account information and chat history for as long as your account is
              active. You may delete individual conversations at any time through the Service. If
              you wish to delete your account and all associated data, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Your Rights</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate personal data</li>
              <li>Request deletion of your personal data</li>
              <li>Request a copy of your data in a portable format</li>
              <li>Withdraw consent for data processing at any time</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, please contact us at the email address provided
              below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Data Security</h2>
            <p>
              We implement appropriate technical and organisational measures to protect your
              personal data against unauthorised access, alteration, disclosure, or destruction.
              However, no method of transmission over the Internet or electronic storage is
              completely secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Cookies</h2>
            <p>
              The Service uses essential cookies for authentication and session management. These
              cookies are necessary for the Service to function and cannot be disabled. We do not
              use cookies for advertising or tracking purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Children&apos;s Privacy</h2>
            <p>
              The Service is not intended for use by individuals under the age of 18. We do not
              knowingly collect personal data from children. If we become aware that we have
              collected personal data from a child, we will take steps to delete such information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material
              changes by posting the updated policy on this page with a revised &ldquo;Last
              updated&rdquo; date. Your continued use of the Service after any changes constitutes
              acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Contact</h2>
            <p>
              If you have any questions about this Privacy Policy or wish to exercise your data
              rights, please contact us at{" "}
              <a href="mailto:hello@casebird.com" className="text-primary hover:underline">
                hello@casebird.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
