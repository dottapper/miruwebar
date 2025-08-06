// src/views/select-ar.js
export default function showSelectAR(container) {
  container.innerHTML = `
    <div class="select-ar-container">
      <div class="header">
        <h1>ARタイプを選択</h1>
        <p>作成したいARの種類を選択してください</p>
      </div>
      
      <div class="ar-options">
        <div class="ar-option" data-type="marker">
          <div class="ar-icon">🎯</div>
          <h3>マーカー型AR</h3>
          <p>画像マーカーを認識して3Dモデルを表示</p>
        </div>
        
        <div class="ar-option" data-type="markerless">
          <div class="ar-icon">📱</div>
          <h3>マーカーレスAR</h3>
          <p>平面を認識して3Dモデルを配置</p>
        </div>
        
        <div class="ar-option" data-type="location">
          <div class="ar-icon">📍</div>
          <h3>ロケーションベースAR</h3>
          <p>GPS座標に基づいて3Dモデルを表示</p>
        </div>
        
        <div class="ar-option" data-type="object">
          <div class="ar-icon">🔍</div>
          <h3>物体認識型AR</h3>
          <p>特定の物体を認識して3Dモデルを表示</p>
        </div>
        
        <div class="ar-option" data-type="face">
          <div class="ar-icon">😊</div>
          <h3>フェイスタイプAR</h3>
          <p>顔に重ねて表示するARエフェクト</p>
        </div>
        
        <div class="ar-option" data-type="faceswitch">
          <div class="ar-icon">🎭</div>
          <h3>FaceSwitch AR（ベータ）</h3>
          <p>顔の表情に応じて変化するAR</p>
        </div>
      </div>
      
      <div class="navigation-buttons">
        <button id="back-button">戻る</button>
        <button id="next-button" disabled>次へ</button>
      </div>
    </div>
  `;

  // ARオプションの選択処理
  const arOptions = document.querySelectorAll('.ar-option');
  const nextButton = document.getElementById('next-button');
  let selectedOption = null;

  arOptions.forEach(option => {
    option.addEventListener('click', () => {
      // 既存の選択を解除
      arOptions.forEach(opt => opt.classList.remove('selected'));
      
      // 新しい選択を設定
      option.classList.add('selected');
      selectedOption = option.dataset.type;
      nextButton.disabled = false;
      
      // デバッグモードでのみログを出力
      if (import.meta.env.DEV || window.location.search.includes('debug=true')) {
        console.log('選択されたAR種類:', selectedOption);
      }
    });
  });

  // 次へボタンの処理
  nextButton.addEventListener('click', () => {
    if (selectedOption) {
      window.location.hash = `#/editor?type=${selectedOption}`;
    }
  });

  // 戻るボタンの処理
  document.getElementById('back-button').addEventListener('click', () => {
    window.location.hash = '#/login';
  });
}
  