import {
  Html,
  Head,
  Body,
  Preview,
  Container,
  Heading,
  Text,
  Section,
  Button,
  Hr,
} from "react-email";

export interface IWelcomeEmailWarmProps {
  email: string;
  dashboardUrl?: string;
  connectStripeUrl?: string;
}

/**
 * Sent once after a freelancer completes email confirmation / signup.
 * Tone: warm, personal, indie/solo-builder feel.
 */
export const WelcomeEmailWarm = ({
  email,
  dashboardUrl,
  connectStripeUrl,
}: IWelcomeEmailWarmProps) => {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>You're in, {email} - let's get your first client set up</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Lanx</Heading>

          <Text style={paragraph}>Hey {email},</Text>

          <Text style={paragraph}>
            Welcome - genuinely glad you're here. Lanx exists because freelancing shouldn't mean
            juggling a proposal tool, a contract tool, a timer, and an invoicing app that don't talk
            to each other. Everything here connects: one accepted proposal turns into a contract,
            one signed contract turns into a project, and tracked time turns into an invoice you can
            actually get paid on.
          </Text>

          <Text style={paragraph}>
            The one thing worth doing first is connecting your Stripe account, so that when a client
            pays, the money goes straight to you - we never touch it.
          </Text>

          <Section style={buttonSection}>
            <Button style={buttonPrimary} href={connectStripeUrl}>
              Connect Stripe
            </Button>
          </Section>

          <Text style={paragraph}>
            After that, add your first client and send a proposal - they won't even need an account
            to view and accept it.
          </Text>

          <Text style={secondaryLink}>
            Or just jump into your{" "}
            <a href={dashboardUrl} style={link}>
              dashboard
            </a>{" "}
            and poke around.
          </Text>

          <Hr style={divider} />

          <Text style={footer}>
            Reply any time if something's unclear - a real person reads these.
            <br />- The Lanx Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default WelcomeEmailWarm;

const main = { backgroundColor: "#f6f9fc", fontFamily: "sans-serif", padding: "40px 0" };

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "32px",
  borderRadius: "8px",
  maxWidth: "480px",
};

const heading = { fontSize: "20px", fontWeight: "bold", margin: "0 0 24px" };

const paragraph = { fontSize: "15px", lineHeight: "24px", color: "#333333", margin: "0 0 16px" };

const buttonSection = { textAlign: "center" as const, margin: "24px 0 12px" };

const buttonPrimary = {
  backgroundColor: "#111111",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};

const secondaryLink = {
  fontSize: "13px",
  color: "#666666",
  textAlign: "center" as const,
  margin: "0 0 8px",
};

const link = { color: "#111111", textDecoration: "underline" };

const divider = { borderColor: "#eeeeee", margin: "24px 0" };

const footer = { color: "#999999", fontSize: "13px", lineHeight: "20px" };
