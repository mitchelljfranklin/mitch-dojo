import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Text,
} from "@react-email/components";

type DynamicEmailProps = {
  heading: string;
  body: string;
  htmlBody?: string;
  // Absolute URL to the dojo logo (public route) — rendered when the dojo
  // has uploaded one. Must be absolute: email clients have no base URL.
  logoUrl?: string;
};

export function DynamicEmail({
  heading,
  body,
  htmlBody,
  logoUrl,
}: DynamicEmailProps) {
  const paragraphs = body.split("\n").filter((line) => line.length > 0);

  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "sans-serif", padding: "32px" }}>
        <Container>
          {logoUrl ? (
            // The plate mirrors the app's --logo-plate token (white backing,
            // hairline border): a white knockout badge stays visible against
            // the email client's white background, and dark badges keep
            // their contrast. Inline styles — email clients ignore CSS vars.
            <div
              style={{
                display: "inline-block",
                backgroundColor: "#ffffff",
                border: "1px solid #e4e4e7",
                borderRadius: "12px",
                padding: "8px",
                marginBottom: "16px",
              }}
            >
              <Img
                src={logoUrl}
                alt="Dojo logo"
                style={{
                  maxHeight: "48px",
                  maxWidth: "180px",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>
          ) : null}
          <Heading as="h2">{heading}</Heading>
          {htmlBody ? (
            <section
              style={{ lineHeight: "1.6", color: "#333" }}
              dangerouslySetInnerHTML={{ __html: htmlBody }}
            />
          ) : (
            paragraphs.map((line) => (
              <Text key={line.slice(0, 20)}>{line}</Text>
            ))
          )}

          <Text
            style={{
              marginTop: "32px",
              color: "#888",
              fontSize: "12px",
            }}
          >
            This email was sent by your dojo. If the button does not work, copy
            and paste the link into your browser.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

DynamicEmail.PreviewProps = {
  heading: "Annual review",
  body: "Welcome to My Dojo.",
  logoUrl: "http://localhost:3000/api/brand/logo?v=demo.png",
} satisfies DynamicEmailProps;
