export function TermsPage() {
  const h2 = { fontFamily: 'Anton, sans-serif', fontWeight: 400, fontSize: '1.4rem', letterSpacing: '-.01em', textTransform: 'uppercase' as const, marginTop: 40, marginBottom: 12 };
  const p  = { fontSize: 14, color: 'var(--stone)', lineHeight: 1.8, marginBottom: 12 };
  const li = { fontSize: 14, color: 'var(--stone)', lineHeight: 1.8, marginBottom: 6 };

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--ink)', color: 'var(--parch)', paddingBottom: 80 }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '60px 32px' }}>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--stone)', marginBottom: 12, textTransform: 'uppercase' }}>
          Legal
        </div>
        <h1 style={{ fontFamily: 'Anton, sans-serif', fontWeight: 400, fontSize: 'clamp(2rem,5vw,3.5rem)', letterSpacing: '-.02em', textTransform: 'uppercase', lineHeight: .9, marginBottom: 8 }}>
          Terms of Service
        </h1>
        <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--stone)', marginBottom: 40 }}>
          Effective date: 30 May 2026 · Last updated: 30 May 2026
        </p>

        <p style={p}>
          Please read these Terms of Service ("Terms") carefully before using Fano Barbershop / Studio-P (the "Service"),
          operated by Mfanomuhle Tsabedze trading as Fano Barbershop ("we," "our," or "us"). By creating an account or
          using any part of the Service, you agree to be bound by these Terms.
        </p>

        <h2 style={h2}>1. The Service</h2>
        <p style={p}>
          Studio P is an online platform that allows clients to browse services, submit booking requests,
          upload photos and short videos to a moderated gallery, and communicate with Studio P staff.
          Bookings submitted through the platform are requests only — they are not confirmed until
          a Studio P team member approves them and contacts you.
        </p>

        <h2 style={h2}>2. Eligibility</h2>
        <p style={p}>
          You must be at least 13 years old to create an account. If you are between 13 and 18, you
          represent that you have the consent of a parent or legal guardian. By using the Service, you
          represent that all information you provide is accurate and that you have the authority to
          agree to these Terms.
        </p>

        <h2 style={h2}>3. Account Registration</h2>
        <p style={p}>
          You are responsible for maintaining the confidentiality of your account credentials and for all
          activity that occurs under your account. Notify us immediately via WhatsApp (+268 7933 3760) if
          you suspect unauthorised access. We reserve the right to suspend or terminate accounts that
          violate these Terms.
        </p>

        <h2 style={h2}>4. Bookings</h2>
        <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
          <li style={li}>Booking requests are subject to staff availability and approval.</li>
          <li style={li}>Once confirmed, if you need to cancel or reschedule, please contact Studio P at least 2 hours before your appointment via WhatsApp (+268 7933 3760).</li>
          <li style={li}>Repeated no-shows may result in restricted booking access.</li>
          <li style={li}>Prices displayed are in Eswatini Lilangeni (SWL/E) and are subject to change without prior notice on the platform, though booked prices will be honoured.</li>
        </ul>

        <h2 style={h2}>5. User Content</h2>
        <p style={p}>
          You may upload photos and short videos ("User Content") to the Studio P gallery. By uploading
          User Content, you grant Studio P a non-exclusive, royalty-free, worldwide licence to display
          that content on the Studio P platform for as long as it is retained (up to 5 days for photos,
          7 days for videos).
        </p>
        <p style={p}>You represent and warrant that:</p>
        <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
          <li style={li}>You own or have the necessary rights to the content you upload.</li>
          <li style={li}>Your content does not infringe any third-party intellectual property, privacy, or other rights.</li>
          <li style={li}>Your content does not contain nudity, graphic violence, hate speech, or illegal material.</li>
          <li style={li}>You have the consent of any identifiable persons depicted in your content.</li>
        </ul>
        <p style={p}>
          All uploaded content is subject to review and may be rejected or removed by Studio P staff at
          their discretion. We are not obligated to display any content.
        </p>

        <h2 style={h2}>6. Prohibited Conduct</h2>
        <p style={p}>You agree not to:</p>
        <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
          <li style={li}>Use the Service for any unlawful purpose.</li>
          <li style={li}>Attempt to gain unauthorised access to any part of the Service or its systems.</li>
          <li style={li}>Reverse engineer, scrape, or copy the Service.</li>
          <li style={li}>Submit false booking requests or impersonate another person.</li>
          <li style={li}>Upload malicious files or attempt to disrupt the Service.</li>
          <li style={li}>Harass, threaten, or harm other users or Studio P staff.</li>
        </ul>

        <h2 style={h2}>7. Intellectual Property</h2>
        <p style={p}>
          All content, design, trademarks, logos, and software comprising the Studio P platform are
          owned by Studio P or its licensors and are protected by applicable intellectual property laws.
          You may not use, copy, or distribute any part of the platform without express written
          permission.
        </p>

        <h2 style={h2}>8. Disclaimer of Warranties</h2>
        <p style={p}>
          The Service is provided "as is" and "as available" without warranties of any kind, express or
          implied, including warranties of merchantability, fitness for a particular purpose, or
          non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or
          free of viruses. Your use of the Service is at your own risk.
        </p>

        <h2 style={h2}>9. Limitation of Liability</h2>
        <p style={p}>
          To the maximum extent permitted by applicable law, Studio P and its operators shall not be
          liable for any indirect, incidental, special, consequential, or punitive damages, or loss of
          profits, data, goodwill, or other intangible losses, arising out of or related to your use of
          the Service. Our total liability to you for any claim shall not exceed the amount you paid to
          Studio P in the 12 months preceding the claim, or E100 (one hundred Eswatini Lilangeni),
          whichever is greater.
        </p>

        <h2 style={h2}>10. Privacy</h2>
        <p style={p}>
          Our collection and use of personal information is described in our <a href="/privacy" style={{ color: 'var(--brass)', textDecoration: 'none' }}>Privacy Policy</a>, which
          forms part of these Terms. By using the Service, you agree to our Privacy Policy.
        </p>

        <h2 style={h2}>11. Termination</h2>
        <p style={p}>
          We may suspend or terminate your access to the Service at any time, with or without notice, for
          conduct that we believe violates these Terms or is harmful to other users, Studio P, or third
          parties. You may delete your account at any time by contacting us.
        </p>

        <h2 style={h2}>12. Governing Law</h2>
        <p style={p}>
          These Terms are governed by the laws of the Kingdom of Eswatini. Any disputes arising from
          these Terms or your use of the Service shall be resolved in the courts of Eswatini, and you
          consent to the personal jurisdiction of those courts. Nothing in this section limits your
          statutory rights as a consumer in your jurisdiction.
        </p>

        <h2 style={h2}>13. Changes to These Terms</h2>
        <p style={p}>
          We may update these Terms from time to time. Continued use of the Service after the updated
          Terms take effect constitutes your acceptance of the new Terms. Material changes will be
          announced on the platform.
        </p>

        <h2 style={h2}>14. Contact</h2>
        <p style={p}>
          Questions about these Terms? Contact Studio P via WhatsApp at +268 7933 3760 or through the
          Contact button on the Studio P landing page.
        </p>

        <div style={{ borderTop: '1px solid var(--bord)', marginTop: 60, paddingTop: 32, display: 'flex', gap: 24 }}>
          <button onClick={() => { window.history.back(); }} style={{ background: 'none', border: '1px solid var(--bord)', color: 'var(--stone)', padding: '10px 20px', borderRadius: 6, fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '.2em', cursor: 'pointer' }}>
            ← BACK
          </button>
          <a href="/privacy" style={{ background: 'none', border: '1px solid var(--bord)', color: 'var(--stone)', padding: '10px 20px', borderRadius: 6, fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '.2em', cursor: 'pointer', textDecoration: 'none' }}>
            PRIVACY POLICY →
          </a>
        </div>
      </div>
    </div>
  );
}
