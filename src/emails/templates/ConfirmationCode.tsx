import { Html, Head, Body, Preview, Container, Heading, Text, Section, Hr } from "react-email";
import * as React from "react";

interface IConfirmationCodeEmailProps {
  code: string;
}
export const ConfirmationCodeEmail = ({ code }: IConfirmationCodeEmailProps) => {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your temporary Lanx verification code </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading>Lanx</Heading>
          <Text>Enter this temporary verification code to continue. It expires in 10 minutes.</Text>
          <Section style={codeBox}>
            <Text style={codeText}>{code}</Text>
          </Section>
          <Text style={footer}>If you didn't request this, you can safely ignore this email.</Text>
          <Text>
            Best, <Hr /> The Lanx Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

const main = { backgroundColor: "#f6f9fc", fontFamily: "sans-serif", padding: "40px 0" };
const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "32px",
  borderRadius: "8px",
  maxWidth: "480px",
};
const codeBox = {
  backgroundColor: "#f4f4f5",
  borderRadius: "8px",
  textAlign: "center" as const,
  padding: "16px 24px",
  margin: "24px 0",
};
const codeText = { fontSize: "32px", fontWeight: "bold", letterSpacing: "4px", margin: 0 };
const footer = { color: "#999999", fontSize: "12px" };
