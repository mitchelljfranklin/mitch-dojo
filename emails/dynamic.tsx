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
