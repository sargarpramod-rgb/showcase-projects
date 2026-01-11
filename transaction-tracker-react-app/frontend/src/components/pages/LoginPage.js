const LoginPage = () => {

  const loginWithGoogle = () => {
    window.location.href =
      "http://localhost:8080/oauth2/authorization/google";
  };

  return (
    <div style={{ textAlign: "center", marginTop: 80 }}>
      <h2>Expense Tracker</h2>

      <button onClick={loginWithGoogle}>
        Login with Google
      </button>
    </div>
  );
};

export default LoginPage;
