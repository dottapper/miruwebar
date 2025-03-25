// src/views/select-ar.js
export default function showSelectAR(container) {
  container.innerHTML = `
    <div class="select-ar-container">
      <h1>AR種類を選択</h1>
      <p>作成したいARの種類を選んでください</p>
      
      <div class="ar-options">
        <div class="ar-option" id="marker-ar">
          <div class="ar-icon">📍</div>
          <h3>マーカー型AR</h3>
          <p>特定の画像をカメラで認識すると、その上に3Dモデルを表示します</p>
        </div>
        
        <div class="ar-option" id="markerless-ar">
          <div class="ar-icon">🌐</div>
          <h3>マーカーレス型AR</h3>
          <p>周囲の平面を検出して、3Dモデルを自由に配置できます</p>
        </div>
        
        <div class="ar-option" id="location-ar">
          <div class="ar-icon">🗺️</div>
          <h3>位置情報AR</h3>
          <p>特定の位置情報と連動して3Dモデルを表示します</p>
        </div>
      </div>
      
      <div class="navigation-buttons">
        <button id="back-button">戻る</button>
        <button id="next-button" class="primary-button" disabled>次へ</button>
      </div>
    </div>
  `;

  // オプション選択処理
  const arOptions = document.querySelectorAll('.ar-option');
  const nextButton = document.getElementById('next-button');
  let selectedOption = null;

  arOptions.forEach(option => {
    option.addEventListener('click', () => {
      // 選択状態の解除
      arOptions.forEach(opt => opt.classList.remove('selected'));
      
      // 新しい選択
      option.classList.add('selected');
      selectedOption = option.id;
      
      // 次へボタンを有効化
      if (nextButton) nextButton.disabled = false;
    });
  });

  // 次へボタンのイベントリスナー
  if (nextButton) {
    nextButton.addEventListener('click', () => {
      if (selectedOption) {
        // 選択したAR種類を保存（後でAPI実装時に使用）
        console.log('選択されたAR種類:', selectedOption);
        
        // プロジェクト一覧画面へ遷移
        window.location.hash = '#/projects';
      }
    });
  }

  // 戻るボタンのイベントリスナー
  const backButton = document.getElementById('back-button');
  if (backButton) {
    backButton.addEventListener('click', () => {
      window.location.hash = '#/login';
    });
  }
}
  