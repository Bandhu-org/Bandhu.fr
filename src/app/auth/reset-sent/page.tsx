export default function ResetSentPage() {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>📧 Email envoyé !</h1>
        <p style={styles.text}>
          Un lien de réinitialisation a été envoyé à votre adresse email.
        </p>
        <p style={styles.subtext}>
          Vérifiez votre boîte mail (et vos spams) puis cliquez sur le lien pour réinitialiser votre mot de passe.
        </p>
        <div style={styles.actions}>
          <a href="/login" style={styles.button}>
            Retour à la connexion
          </a>
        </div>
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#111',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
  },
  card: {
    backgroundColor: '#222',
    padding: '3rem',
    borderRadius: '8px',
    textAlign: 'center',
    maxWidth: '500px',
  },
  title: {
    fontSize: '24px',
    marginBottom: '16px',
  },
  text: {
    fontSize: '16px',
    lineHeight: '1.6',
    marginBottom: '12px',
  },
  subtext: {
    fontSize: '14px',
    color: '#ccc',
    lineHeight: '1.5',
    marginBottom: '32px',
  },
  actions: {
    marginTop: '24px',
  },
  button: {
    display: 'inline-block',
    backgroundColor: '#0070f3',
    color: 'white',
    padding: '12px 24px',
    textDecoration: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
  }
}