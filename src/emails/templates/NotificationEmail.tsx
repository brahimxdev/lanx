import { Html, Head, Body, Preview, Container, Heading, Text, Section, Hr } from "react-email";

interface INotificationEmailProps {
  preview: string;
  title: string;
  description: string;
  warning?: string;
}

export const NotificationEmail = ({
  preview,
  title,
  description,
  warning,
}: INotificationEmailProps) => {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading>Lanx</Heading>
          <Text style={titleText}>{title}</Text>
          <Text>{description}</Text>
          {warning && (
            <Section style={noticeBox}>
              <Text style={noticeText}>{warning}</Text>
            </Section>
          )}
          <Hr />
          <Text>
            Best, <br /> The Lanx Team
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
const titleText = { fontSize: "18px", fontWeight: "bold", margin: "16px 0 8px" };
const noticeBox = {
  backgroundColor: "#fef2f2",
  borderRadius: "8px",
  padding: "16px 24px",
  margin: "24px 0",
};
const noticeText = { color: "#b91c1c", fontSize: "14px", margin: 0 };
