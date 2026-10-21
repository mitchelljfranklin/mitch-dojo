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
  footer: string;
  // Absolute URL to the dojo logo (public route) — rendered when the dojo
  // has uploaded one. Must be absolute: email clients have no base URL.
  logoUrl?: string;
  // Which logo variant the URL points at: "primary" renders bare (it is
  // made for light backgrounds and email clients are white); "dark" (a
  // white knockout badge) renders on a dark plate so it stays visible.
  logoVariant?: "primary" | "dark";
};

export function DynamicEmail({
  heading,
  body,
  htmlBody,
  footer,
  logoUrl,
  logoVariant = "primary",
}: DynamicEmailProps) {
  const paragraphs = body.split("\n").filter((line) => line.length > 0);

  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "sans-serif", padding: "32px" }}>
        <Container>
          {logoUrl ? (
            // The primary logo is made for light backgrounds and renders
            // bare (email clients are white). The dark variant is a white
            // knockout badge, so it rides on a dark plate to stay visible.
            // Inline styles — email clients ignore CSS vars.
            logoVariant === "dark" ? (
              <div
                style={{
                  display: "inline-block",
                  backgroundColor: "#18181b",
                  border: "1px solid #3f3f46",
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
            ) : (
              <Img
                src={logoUrl}
                alt="Dojo logo"
                style={{
                  maxHeight: "64px",
                  maxWidth: "200px",
                  objectFit: "contain",
                  marginBottom: "16px",
                }}
              />
            )
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
            {footer}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

DynamicEmail.PreviewProps = {
  heading: "Annual review",
  body: "Welcome to My Dojo.",
  footer:
    "This email was sent by your dojo. If the button does not work, copy and paste the link into your browser.",
  logoUrl: "http://localhost:3000/api/brand/logo?v=demo.png",
  logoVariant: "primary",
} satisfies DynamicEmailProps;
