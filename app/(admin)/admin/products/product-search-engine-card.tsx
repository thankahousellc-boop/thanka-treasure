import {
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  Textarea,
} from "@/components/admin/ui";

type ProductSearchEngineCardProps = {
  metaTitle: string;
  metaDescription: string;
  formId?: string;
};

export function ProductSearchEngineCard({
  metaTitle,
  metaDescription,
  formId,
}: ProductSearchEngineCardProps) {
  return (
    <Card>
      <CardHeader
        title="Search engine listing"
        description="Override how this product appears in Google and social previews."
      />
      <CardBody className="grid gap-4 md:grid-cols-2">
        <Field label="Meta title" hint="Recommended 60–70 characters.">
          <Input
            name="metaTitle"
            defaultValue={metaTitle}
            form={formId}
          />
        </Field>
        <Field label="Meta description" hint="Recommended 150–160 characters.">
          <Textarea
            name="metaDescription"
            rows={3}
            defaultValue={metaDescription}
            form={formId}
          />
        </Field>
      </CardBody>
    </Card>
  );
}
