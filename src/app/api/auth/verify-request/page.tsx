export default function VerifyRequest() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#111',
      color: '#fff',
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        backgroundColor: '#222',
        padding: '3rem',
        borderRadius: '8px',
        textAlign: 'center',
        maxWidth: '500px'
      }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
          📧 Vérifie tes mails !
        </h1>
        <p style={{ fontSize: '1.1rem', lineHeight: '1.5', marginBottom: '2rem' }}>
          Un email de vérification a été envoyé à ton adresse. 
          Clique sur le lien dans l'email pour activer ton compte.
        </p>
        <p style={{ color: '#888' }}>
          Pas reçu ? Vérifie tes spams ou réessaie dans quelques minutes.
        </p>
      </div>
    </div>
  )
}