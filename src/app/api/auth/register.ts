import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${process.env.NEXTAUTH_URL}/emailverify?token=${token}`;

  await resend.emails.send({
    from: "noreply@bandhu.fr",
    to: email,
    subject: "Vérifie ton adresse email",
    html: `<p>Clique ici pour vérifier ton email : <a href="${verifyUrl}">${verifyUrl}</a></p>`,
  });
}

export async function sendVerification(email: string) {
  const token = randomBytes(32).toString("hex");

  await prisma.user.update({
    where: { email },
    data: {
      VerificationToken: token,
      VerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
    },
  });

  await sendVerificationEmail(email, token);
}