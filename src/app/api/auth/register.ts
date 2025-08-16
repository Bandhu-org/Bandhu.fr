import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";

export async function sendVerification(email: string) {
  const token = randomBytes(32).toString("hex");

  await prisma.user.update({
    where: { email },
    data: {
      emailVerificationToken: token,
    },
  });

  await sendVerificationEmail(email, token);
}
const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;

await resend.emails.send({
  from: "noreply@bandhu.fr",
  to: email,
  subject: "Vérifie ton adresse email",
  html: `<p>Clique ici pour vérifier ton email : <a href="${verifyUrl}">${verifyUrl}</a></p>`,
});

