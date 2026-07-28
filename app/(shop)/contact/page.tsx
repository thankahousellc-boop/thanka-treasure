import { ContactForm } from "@/components/shop/contact-form";
import { getStoreContact, normalizeWhatsAppNumber } from "@/lib/site-settings";

export default async function ContactPage() {
  const contact = await getStoreContact();
  const addressLines = [contact.addressLine1, contact.addressLine2].filter(
    (line) => line && line.length > 0,
  );
  const emails = [contact.supportEmail, contact.secondaryEmail].filter(
    (email) => email && email.length > 0,
  );

  return (
    <div>
      <section className="bg-[radial-gradient(circle_at_top,#fdf8f4,#ffffff_60%)] py-16 md:py-20">
        <div className="container-page">
          <p className="text-xs uppercase tracking-[0.12em] text-maroon-700">
            Contact
          </p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl text-maroon-900 md:text-5xl">
            Reach our Kathmandu gallery and support team
          </h1>
          <p className="mt-4 max-w-2xl text-base text-warm-gray-700">
            Questions about a painting, shipping estimate, or custom requests?
            Send us a message and we will respond as soon as possible.
          </p>
        </div>
      </section>

      <section className="container-page py-12 md:py-16">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-5 rounded border border-border-light bg-white p-6 md:p-8">
            <h2 className="font-serif text-2xl text-maroon-900">
              Contact details
            </h2>

            {addressLines.length > 0 ? (
              <div className="space-y-1 text-sm text-warm-gray-700">
                <p className="text-xs uppercase tracking-[0.08em] text-warm-gray-500">
                  Address
                </p>
                {addressLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            ) : null}

            {contact.phone || contact.whatsapp ? (
              <div className="space-y-2 text-sm text-warm-gray-700">
                <p className="text-xs uppercase tracking-[0.08em] text-warm-gray-500">
                  Phone & WhatsApp
                </p>
                {contact.phone ? (
                  <p>
                    <a
                      href={`tel:${contact.phone.replace(/\s+/g, "")}`}
                      className="font-medium text-maroon-700 hover:text-maroon-600"
                    >
                      {contact.phone}
                    </a>
                  </p>
                ) : null}
                {contact.whatsapp ? (
                  <p>
                    <a
                      href={`https://wa.me/${normalizeWhatsAppNumber(contact.whatsapp)}`}
                      className="font-medium text-maroon-700 hover:text-maroon-600"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {contact.whatsapp}
                    </a>
                  </p>
                ) : null}
              </div>
            ) : null}

            {emails.length > 0 ? (
              <div className="space-y-2 text-sm text-warm-gray-700">
                <p className="text-xs uppercase tracking-[0.08em] text-warm-gray-500">
                  Email
                </p>
                {emails.map((email) => (
                  <p key={email}>
                    <a
                      href={`mailto:${email}`}
                      className="font-medium text-maroon-700 hover:text-maroon-600"
                    >
                      {email}
                    </a>
                  </p>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded border border-border-light bg-maroon-50 p-6 md:p-8">
            <h2 className="font-serif text-2xl text-maroon-900">
              Send inquiry
            </h2>
            <p className="mt-2 text-sm text-warm-gray-700">
              We typically respond within one business day.
            </p>
            <div className="mt-5">
              <ContactForm />
            </div>
          </div>
        </div>

        <div className="mt-8 rounded border border-border-light bg-white p-4 md:p-6">
          <h2 className="font-serif text-2xl text-maroon-900">
            Find us in Thamel
          </h2>
          <p className="mt-2 text-sm text-warm-gray-700">
            Visit our gallery at Paryatan Marg, Thamel, Kathmandu.
          </p>
          <div className="mt-4 overflow-hidden rounded border border-border-light">
            <iframe
              title="thanka Treasure map"
              src="https://maps.google.com/maps?q=Thamel%2C%20Kathmandu&t=&z=15&ie=UTF8&iwloc=&output=embed"
              className="h-80 w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
