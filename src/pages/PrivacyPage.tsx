export function PrivacyPage() {
  const h2 = { fontFamily: 'Anton, sans-serif', fontWeight: 400, fontSize: '1.4rem', letterSpacing: '-.01em', textTransform: 'uppercase' as const, marginTop: 40, marginBottom: 12 };
  const h3 = { fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '.25em', textTransform: 'uppercase' as const, color: 'var(--brass)', marginTop: 28, marginBottom: 8 };
  const p  = { fontSize: 14, color: 'var(--stone)', lineHeight: 1.8, marginBottom: 12 };
  const li = { fontSize: 14, color: 'var(--stone)', lineHeight: 1.8, marginBottom: 6 };

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--ink)', color: 'var(--parch)', paddingBottom: 80 }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '60px 32px' }}>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--stone)', marginBottom: 12, textTransform: 'uppercase' }}>
          Legal
        </div>
        <h1 style={{ fontFamily: 'Anton, sans-serif', fontWeight: 400, fontSize: 'clamp(2rem,5vw,3.5rem)', letterSpacing: '-.02em', textTransform: 'uppercase', lineHeight: .9, marginBottom: 8 }}>
          Privacy Policy
        </h1>
        <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--stone)', marginBottom: 40 }}>
          Effective date: 30 May 2026 · Last updated: 30 May 2026
        </p>

        <p style={p}>
          MT Barbershop, operated by Mfanomuhle Tsabedze ("we," "our," or "us"), operates the booking platform at studio-p-prod.vercel.app.
          This Privacy Policy explains how we collect, use, disclose, and protect your personal information
          when you use our services. By using MT Barbershop, you agree to the practices described here.
        </p>
        <p style={p}>
          If you are a California resident, please also read the <strong style={{ color: 'var(--parch)' }}>CCPA Disclosure</strong> section below.
        </p>

        <h2 style={h2}>1. Information We Collect</h2>

        <h3 style={h3}>Information you provide</h3>
        <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
          <li style={li}><strong style={{ color: 'var(--parch)' }}>Account information:</strong> full name, email address, optional phone number, and the profile picture associated with your Google or Apple account (if you sign in via OAuth).</li>
          <li style={li}><strong style={{ color: 'var(--parch)' }}>Booking information:</strong> the service you select, your preferred date and time, and any notes you add to a booking.</li>
          <li style={li}><strong style={{ color: 'var(--parch)' }}>Photos and videos:</strong> images or short videos you choose to upload to the MT Barbershop gallery.</li>
        </ul>

        <h3 style={h3}>Information collected automatically</h3>
        <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
          <li style={li}><strong style={{ color: 'var(--parch)' }}>Usage data:</strong> pages visited, actions taken in the app, timestamps.</li>
          <li style={li}><strong style={{ color: 'var(--parch)' }}>Device/browser data:</strong> browser type, operating system, screen dimensions, IP address.</li>
          <li style={li}><strong style={{ color: 'var(--parch)' }}>Authentication tokens:</strong> session tokens stored in your browser's local storage to keep you signed in.</li>
        </ul>

        <h2 style={h2}>2. How We Use Your Information</h2>
        <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
          <li style={li}>Authenticate your account and keep your session secure.</li>
          <li style={li}>Process and confirm your booking requests.</li>
          <li style={li}>Send booking confirmations and status updates via WhatsApp or email (if you have provided contact details).</li>
          <li style={li}>Display approved gallery photos on the MT Barbershop landing page.</li>
          <li style={li}>Improve the platform, troubleshoot issues, and ensure security.</li>
          <li style={li}>Comply with applicable laws and regulations.</li>
        </ul>
        <p style={p}>
          We do <strong style={{ color: 'var(--parch)' }}>not</strong> sell your personal information to third parties.
          We do not use your data for targeted advertising.
        </p>

        <h2 style={h2}>3. Data Sharing</h2>
        <p style={p}>
          We share your information only with the service providers necessary to operate MT Barbershop:
        </p>
        <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
          <li style={li}><strong style={{ color: 'var(--parch)' }}>Supabase (supabase.com):</strong> database, authentication, and file storage hosted on servers in the EU region. Supabase processes data on our behalf under their Data Processing Agreement.</li>
          <li style={li}><strong style={{ color: 'var(--parch)' }}>Google / Apple:</strong> if you choose to sign in with Google or Apple, those providers authenticate your identity and share your name, email, and profile picture with us. Their respective privacy policies govern that exchange.</li>
          <li style={li}><strong style={{ color: 'var(--parch)' }}>Resend (resend.com):</strong> transactional email delivery for booking notifications.</li>
          <li style={li}><strong style={{ color: 'var(--parch)' }}>Vercel (vercel.com):</strong> hosting platform that serves the application and handles HTTP requests.</li>
        </ul>
        <p style={p}>
          We may disclose your information if required by law, court order, or to protect the rights and
          safety of MT Barbershop, its users, or the public.
        </p>

        <h2 style={h2}>4. Media Retention</h2>
        <p style={p}>
          Photos you upload are stored for up to <strong style={{ color: 'var(--parch)' }}>5 days</strong> and then automatically deleted from our
          storage and database. Videos are stored for up to <strong style={{ color: 'var(--parch)' }}>7 days</strong> and then automatically deleted.
          You may request earlier deletion by contacting us (see Section 8).
        </p>
        <p style={p}>
          Approved gallery photos displayed on the landing page may be visible to any visitor during
          their retention window.
        </p>

        <h2 style={h2}>5. Data Security</h2>
        <p style={p}>
          We implement industry-standard safeguards including HTTPS/TLS encryption in transit, row-level
          security policies on our database, HTTP security headers (Content Security Policy, HSTS, etc.),
          and server-side input validation. Access to production systems is restricted to authorised
          personnel only. No method of electronic storage or transmission is 100% secure; we cannot
          guarantee absolute security.
        </p>

        <h2 style={h2}>6. Cookies and Local Storage</h2>
        <p style={p}>
          MT Barbershop uses browser local storage to maintain your authentication session. We do not use
          third-party tracking cookies, advertising cookies, or analytics cookies.
        </p>

        <h2 style={h2}>7. Children's Privacy</h2>
        <p style={p}>
          MT Barbershop is not directed to children under the age of 13. We do not knowingly collect personal
          information from children under 13. If you believe a child has provided us personal information,
          contact us immediately and we will delete it.
        </p>

        <h2 style={h2}>8. Your Rights and Choices</h2>
        <p style={p}>Depending on where you are located, you may have the right to:</p>
        <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
          <li style={li}><strong style={{ color: 'var(--parch)' }}>Access</strong> the personal information we hold about you.</li>
          <li style={li}><strong style={{ color: 'var(--parch)' }}>Correct</strong> inaccurate or incomplete information.</li>
          <li style={li}><strong style={{ color: 'var(--parch)' }}>Delete</strong> your account and associated personal data.</li>
          <li style={li}><strong style={{ color: 'var(--parch)' }}>Portability</strong> — receive a copy of your data in a machine-readable format.</li>
          <li style={li}><strong style={{ color: 'var(--parch)' }}>Object or restrict</strong> certain processing activities.</li>
        </ul>
        <p style={p}>
          To exercise any of these rights, contact us at the details in Section 10. We will respond within
          30 days.
        </p>

        <h2 style={h2}>9. CCPA Disclosure (California Residents)</h2>
        <p style={p}>
          If you are a California resident, the California Consumer Privacy Act (CCPA) grants you
          additional rights regarding your personal information.
        </p>

        <h3 style={h3}>Categories of personal information collected</h3>
        <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
          <li style={li}><strong style={{ color: 'var(--parch)' }}>Identifiers:</strong> name, email address, IP address, unique account ID.</li>
          <li style={li}><strong style={{ color: 'var(--parch)' }}>Commercial information:</strong> service bookings and transaction history.</li>
          <li style={li}><strong style={{ color: 'var(--parch)' }}>Internet/network activity:</strong> browsing history within the platform, device info.</li>
          <li style={li}><strong style={{ color: 'var(--parch)' }}>Audio/visual data:</strong> photos and videos you choose to upload.</li>
        </ul>

        <h3 style={h3}>Business purpose for collection</h3>
        <p style={p}>
          We collect the above categories to provide and improve MT Barbershop, process bookings, communicate
          with you about your bookings, and maintain security. We do not collect sensitive personal
          information beyond what is listed above.
        </p>

        <h3 style={h3}>Disclosure to third parties</h3>
        <p style={p}>
          We disclose personal information to Supabase, Vercel, Resend, and Google/Apple as described in
          Section 3. These are service providers acting on our behalf, not data brokers. We do not sell
          or share your personal information for cross-context behavioural advertising.
        </p>

        <h3 style={h3}>Your CCPA rights</h3>
        <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
          <li style={li}><strong style={{ color: 'var(--parch)' }}>Right to Know:</strong> you may request disclosure of the categories and specific pieces of personal information we collected about you in the past 12 months.</li>
          <li style={li}><strong style={{ color: 'var(--parch)' }}>Right to Delete:</strong> you may request deletion of your personal information, subject to certain exceptions.</li>
          <li style={li}><strong style={{ color: 'var(--parch)' }}>Right to Correct:</strong> you may request correction of inaccurate personal information.</li>
          <li style={li}><strong style={{ color: 'var(--parch)' }}>Right to Non-Discrimination:</strong> we will not discriminate against you for exercising any of your CCPA rights.</li>
          <li style={li}><strong style={{ color: 'var(--parch)' }}>Right to Opt-Out of Sale/Sharing:</strong> we do not sell or share personal information for cross-context behavioural advertising, so no opt-out is necessary.</li>
        </ul>
        <p style={p}>
          To submit a verified CCPA request, contact us via the details in Section 10. We will verify
          your identity before processing the request and respond within 45 days (with one 45-day
          extension if needed).
        </p>

        <h2 style={h2}>10. Contact Us</h2>
        <p style={p}>
          For privacy questions, data requests, or to exercise your rights, contact MT Barbershop via:
        </p>
        <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
          <li style={li}>WhatsApp: +268 7933 3760</li>
          <li style={li}>Platform: use the Contact button on the MT Barbershop landing page</li>
        </ul>

        <h2 style={h2}>11. Changes to This Policy</h2>
        <p style={p}>
          We may update this Privacy Policy from time to time. We will update the "Last updated" date
          at the top. Continued use of MT Barbershop after changes constitutes acceptance of the revised policy.
          Material changes will be notified via the platform.
        </p>

        <div style={{ borderTop: '1px solid var(--bord)', marginTop: 60, paddingTop: 32, display: 'flex', gap: 24 }}>
          <button onClick={() => { window.history.back(); }} style={{ background: 'none', border: '1px solid var(--bord)', color: 'var(--stone)', padding: '10px 20px', borderRadius: 6, fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '.2em', cursor: 'pointer' }}>
            ← BACK
          </button>
          <a href="/terms" style={{ background: 'none', border: '1px solid var(--bord)', color: 'var(--stone)', padding: '10px 20px', borderRadius: 6, fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '.2em', cursor: 'pointer', textDecoration: 'none' }}>
            TERMS OF SERVICE →
          </a>
        </div>
      </div>
    </div>
  );
}
