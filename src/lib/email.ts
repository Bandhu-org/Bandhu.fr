export async function sendResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`
  console.log(`[DEBUG] Lien de réinitialisation pour ${email} : ${resetUrl}`)
}
