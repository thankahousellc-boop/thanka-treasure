import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
} from "@/components/admin/ui";
import type { StoreContact } from "@/lib/site-settings";

type ContactFormProps = {
  values: StoreContact;
  action: (formData: FormData) => Promise<void>;
};

export function ContactForm({ values, action }: ContactFormProps) {
  return (
    <form action={action}>
      <Card>
        <CardHeader
          title="Store contact"
          description="Used in the storefront footer, contact page, transactional emails, and the WhatsApp button."
        />
        <CardBody className="grid gap-4 md:grid-cols-2">
          <Field label="Support email">
            <Input
              type="email"
              name="supportEmail"
              defaultValue={values.supportEmail}
              placeholder="hello@example.com"
            />
          </Field>
          <Field
            label="Secondary email"
            hint="Optional. Shown alongside the primary on the contact page."
          >
            <Input
              type="email"
              name="secondaryEmail"
              defaultValue={values.secondaryEmail}
              placeholder="support@example.com"
            />
          </Field>
          <Field label="Phone">
            <Input name="phone" defaultValue={values.phone} placeholder="+977 1 4480 220" />
          </Field>
          <Field
            label="WhatsApp number"
            hint="Used by the floating WhatsApp button. Include country code."
          >
            <Input
              name="whatsapp"
              defaultValue={values.whatsapp}
              placeholder="+9779800000000"
            />
          </Field>
          <Field label="Address line 1" className="md:col-span-2">
            <Input
              name="addressLine1"
              defaultValue={values.addressLine1}
              placeholder="Boudhanath, Kathmandu"
            />
          </Field>
          <Field label="Address line 2" className="md:col-span-2">
            <Input
              name="addressLine2"
              defaultValue={values.addressLine2}
              placeholder="Optional second line"
            />
          </Field>
          <Field label="Instagram URL">
            <Input
              name="instagram"
              defaultValue={values.instagram}
              placeholder="https://instagram.com/yourbrand"
            />
          </Field>
          <Field label="Facebook URL">
            <Input
              name="facebook"
              defaultValue={values.facebook}
              placeholder="https://facebook.com/yourbrand"
            />
          </Field>
        </CardBody>
        <div
          className="flex justify-end px-5 py-3"
          style={{ borderTop: "1px solid var(--admin-border)" }}
        >
          <Button type="submit">Save contact details</Button>
        </div>
      </Card>
    </form>
  );
}
