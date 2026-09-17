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
  // Which logo variant the URL points at: "primary" renders on the white
  // plate, "dark" (a white knockout badge) renders on a dark plate so it
  // stays visible against email clients' white background.
  logoVariant?: "primary" | "dark";
};

export function DynamicEmail({
  heading,
  body,
  htmlBody,
  logoUrl,
  logoVariant = "primary",
}: DynamicEmailProps) {
  const paragraphs = body.split("\n").filter((line) => line.length > 0);
  const plateStyle =
    logoVariant === "dark"
      ? { backgroundColor: "#18181b", borderColor: "#3f3f46" }
      : { backgroundColor: "#ffffff", borderColor: "#e4e4e7" };

  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "sans-serif", padding: "32px" }}>
        <Container>
          {logoUrl ? (
            // The plate mirrors the app's --logo-plate token (primary) or a
            // dark plate (dark variant) so either badge keeps its contrast.
            // Inline styles — email clients ignore CSS vars.
            <div
              style={{
                display: "inline-block",
                ...plateStyle,
                border: `1px solid ${plateStyle.borderColor}`,
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
  logoVariant: "primary",
} satisfies DynamicEmailProps;
