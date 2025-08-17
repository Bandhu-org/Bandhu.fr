export default function ResetSuccessPage() {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>✅ Mot de passe mis à jour !</h1>
        <p style={styles.text}>
          Votre mot de passe a été réinitialisé avec succès.
        </p>
        <p style={styles.subtext}>
          Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
        </p>
        <div style={styles.actions}>
          <a href="/login" style={styles.button}>
            Se connecter
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
    boxShadow: '0 0 20px rgba(0,0,0,0.5)',
  },
  title: {
    fontSize: '28px',
    marginBottom: '20px',
    color: '#4ade80',
  },
  text: {
    fontSize: '18px',
    lineHeight: '1.6',
    marginBottom: '16px',
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
    padding: '14px 28px',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '16px',
    transition: 'background-color 0.2s',
  }
}