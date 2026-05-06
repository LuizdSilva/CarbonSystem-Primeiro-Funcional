async function fazerLogin() {
    const user = document.getElementById('usuario').value;
    const pass = document.getElementById('senha').value;
    const msg  = document.getElementById('mensagem');

    if (user === "admin" && pass === "123") {
        msg.style.color = "green";
        msg.innerText = "Acessando...";
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 1000);
    } else {
        msg.innerText = "Usuário ou senha incorretos!";
    }
}