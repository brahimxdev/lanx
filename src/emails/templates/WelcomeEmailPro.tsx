import { Html, Head, Body, Preview, Container, Heading, Text, Section, Button, Hr } from "react-email";

export interface IWelcomeEmailProProps {
  email: string;
  dashboardUrl?: string;
  connectStripeUrl?: string;
}

/**
 * Sent once after a freelancer completes email confirmation / signup.
 */
export const WelcomeEmailPro = ({ email, dashboardUrl, connectStripeUrl }: IWelcomeEmailProProps) => {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Welcome to Lanx - here's how to get your first client paid</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Lanx</Heading>

          <Text style={paragraph}>Hi {email},</Text>

          <Text style={paragraph}>
            Your account is set up. Lanx takes you from proposal to paid invoice without
            switching tools - here's the fastest path to your first payout.
          </Text>

          <Section style={stepsSection}>
            <Text style={stepText}>
              <strong>1. Connect Stripe</strong> - so invoices can be paid directly to your bank account
            </Text>
            <Text style={stepText}>
              <strong>2. Add a client</strong> - name, email, and you're ready to send
            </Text>
            <Text style={stepText}>
              <strong>3. Send a proposal</strong> - your client accepts with one click, no login required
            </Text>
          </Section>

          <Section style={buttonSection}>
            <Button style={buttonPrimary} href={connectStripeUrl}>
              Connect Stripe
            </Button>
          </Section>

          <Text style={secondaryLink}>
            Or head straight to your{" "}
            <a href={dashboardUrl} style={link}>
              dashboard
            </a>
            .
          </Text>

          <Hr style={divider} />

          <Text style={footer}>
            Questions? Reply to this email and we'll help you get set up.
            <br />
            - The Lanx Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default WelcomeEmailPro;

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

const stepsSection = {
  backgroundColor: "#f9fafb",
  borderRadius: "6px",
  padding: "16px 20px",
  margin: "24px 0",
};

const stepText = { fontSize: "14px", lineHeight: "22px", color: "#333333", margin: "0 0 8px" };

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

const secondaryLink = { fontSize: "13px", color: "#666666", textAlign: "center" as const, margin: "0 0 8px" };

const link = { color: "#111111", textDecoration: "underline" };

const divider = { borderColor: "#eeeeee", margin: "24px 0" };

const footer = { color: "#999999", fontSize: "13px", lineHeight: "20px" };
