// src/views/login.js
export default function showLogin(container) {
  container.innerHTML = `
    <div class="login-container">
      <div class="login-header">
        <h1>miru-webAR</h1>
        <p class="login-subtitle">あなただけの3D世界を現実に</p>
      </div>
      <div class="login-form">
        <div class="form-group">
          <label for="email">メールアドレス</label>
          <input type="email" id="email" placeholder="example@email.com">
        </div>
        <div class="form-group">
          <label for="password">パスワード</label>
          <input type="password" id="password" placeholder="パスワードを入力">
        </div>
        <button id="login-button" class="primary-button">ログイン</button>
        <div class="form-links">
          <a href="#/register" class="form-link">新規登録</a>
          <span class="divider">|</span>
          <a href="#/forgot-password" class="form-link">パスワードを忘れた</a>
        </div>
      </div>
      <div class="login-footer">
        <p>自分だけのARで世界を彩る</p>
      </div>
    </div>
  `;

  // ログインボタンのイベントリスナー
  const loginButton = document.getElementById('login-button');
  if (loginButton) {
    loginButton.addEventListener('click', () => {
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      
      console.log('ログイン処理:', email);
      // select-arからprojectsに遷移先を変更
      window.location.hash = '#/projects';
    });
  }
}