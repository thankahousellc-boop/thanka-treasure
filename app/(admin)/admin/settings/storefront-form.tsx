import {
  Card,
  CardBody,
  CardHeader,
  DirtyForm,
  Field,
  Input,
  ShowWhenDirty,
  SubmitButton,
} from "@/components/admin/ui";
import type { Storefront } from "@/lib/site-settings";

const MAX_MESSAGES = 5;

type StorefrontFormProps = {
  values: Storefront;
  action: (formData: FormData) => Promise<void>;
};

export function StorefrontForm({ values, action }: StorefrontFormProps) {
  const slots = Array.from({ length: MAX_MESSAGES }, (_, index) => {
    return values.announcementMessages[index] ?? { text: "", highlight: "" };
  });

  return (
    <DirtyForm action={action}>
      <Card>
        <CardHeader
          title="Announcement bar"
          description="Up to five rotating messages shown at the top of every storefront page. Empty rows are ignored."
        />
        <CardBody className="space-y-4">
          {slots.map((message, index) => (
            <div
              key={index}
              className="grid gap-3 md:grid-cols-[2fr_1fr] md:items-end"
            >
              <Field label={`Message ${index + 1}`}>
                <Input
                  name={`messageText_${index}`}
                  defaultValue={message.text}
                  placeholder={
                    index === 0 ? "Free worldwide shipping over" : "Optional"
                  }
                  maxLength={120}
                />
              </Field>
              <Field
                label="Highlight"
                hint="Optional. Rendered in bold next to the message (e.g. a price)."
              >
                <Input
                  name={`messageHighlight_${index}`}
                  defaultValue={message.highlight ?? ""}
                  placeholder="$500"
                  maxLength={40}
                />
              </Field>
            </div>
          ))}
        </CardBody>
        <ShowWhenDirty>
          <div
            className="flex justify-end px-5 py-3"
            style={{ borderTop: "1px solid var(--admin-border)" }}
          >
            <SubmitButton>Save storefront</SubmitButton>
          </div>
        </ShowWhenDirty>
      </Card>
    </DirtyForm>
  );
}
