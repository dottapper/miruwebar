// src/views/projects.js
import { showNewProjectModal } from '../components/ui.js';
import '../styles/projects.css';

// ダミーデータ - 後でAPIから取得するデータに置き換え
const dummyProjects = [
  { id: 1, date: '2025/03/20', title: '花の3DモデルAR', type: 'マーカー型AR' },
  { id: 2, date: '2025/03/15', title: 'オフィス家具配置', type: 'マーカーレスAR' },
  { id: 3, date: '2025/03/10', title: '公園案内', type: 'ロケーションベースAR' },
  { id: 4, date: '2025/03/05', title: '商品カタログ', type: 'マーカー型AR' },
  { id: 5, date: '2025/03/01', title: '顔認識フィルター', type: 'フェイスタイプAR' },
  { id: 6, date: '2025/02/25', title: '観光スポット案内', type: 'ロケーションベースAR' },
  { id: 7, date: '2025/02/20', title: 'ペットの3Dモデル', type: '物体認識型AR' },
  { id: 8, date: '2025/02/15', title: 'インテリア配置', type: 'マーカーレスAR' },
  { id: 9, date: '2025/02/10', title: '教育用AR教材', type: 'マーカー型AR' }
];

export default function showProjects(container) {
  // プロジェクト一覧画面のHTMLを構築
  container.innerHTML = `
    <div class="app-layout">
      <!-- サイドメニュー -->
      <div class="side-menu">
        <div class="logo-container">
          <div class="logo">Miru WebAR</div>
        </div>
        <div class="menu-item active">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          プロジェクト
        </div>
        <div class="menu-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          メディア一覧
        </div>
        <div class="menu-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 3v18h18"/>
            <path d="M18.4 9l-1.3 1.3"/>
            <path d="M8 9h.01"/>
            <path d="M18 20V9"/>
            <path d="M8 5v4"/>
            <path d="M12 5v14"/>
            <path d="M16 13v7"/>
          </svg>
          分析
        </div>
        <div class="menu-spacer"></div>
        <div class="menu-item" id="logout-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          ログアウト
        </div>
      </div>
      
      <!-- メインコンテンツ -->
      <div class="main-content">
        <div class="content-header">
          <h1>プロジェクト一覧</h1>
          <button id="new-project-btn" class="new-project-button">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            新規作成
          </button>
        </div>
        
        <div class="project-list" id="project-list">
          <!-- プロジェクトカードがここに動的に生成されます -->
        </div>
        
        <div class="pagination" id="pagination">
          <!-- ページネーションボタンがここに動的に生成されます -->
        </div>
      </div>
    </div>
  `;

  // ページネーション設定
  const projectsPerPage = 6; // 1ページあたりのプロジェクト数
  let currentPage = 1;
  
  // プロジェクト一覧を表示する関数
  function renderProjectList(page) {
    const projectList = document.getElementById('project-list');
    projectList.innerHTML = ''; // リストをクリア
    
    // 表示するプロジェクトの範囲を計算
    const startIndex = (page - 1) * projectsPerPage;
    const endIndex = Math.min(startIndex + projectsPerPage, dummyProjects.length);
    
    // プロジェクトがない場合の表示
    if (dummyProjects.length === 0) {
      projectList.innerHTML = `
        <div class="no-projects">
          <p>プロジェクトがありません。新規作成ボタンから作成してください。</p>
        </div>
      `;
      return;
    }
    
    // プロジェクトカードを生成
    for (let i = startIndex; i < endIndex; i++) {
      const project = dummyProjects[i];
      const projectCard = document.createElement('div');
      projectCard.className = 'project-card';
      projectCard.innerHTML = `
        <div class="card-content">
          <div class="project-date">${project.date}</div>
          <div class="project-title">${project.title}</div>
          <div class="project-type">${project.type}</div>
        </div>
        <div class="card-menu">
          <button class="card-menu-button">︙</button>
          <div class="card-menu-dropdown">
            <div class="dropdown-item">削除</div>
            <div class="dropdown-item">複製</div>
            <div class="dropdown-item">共有</div>
          </div>
        </div>
      `;
      
      // カードのクリックイベント - 編集画面に遷移
      projectCard.querySelector('.card-content').addEventListener('click', () => {
        window.location.hash = `#/editor?id=${project.id}`;
      });
      
      // メニューボタンのクリックイベント
      const menuButton = projectCard.querySelector('.card-menu-button');
      const menuDropdown = projectCard.querySelector('.card-menu-dropdown');
      
      menuButton.addEventListener('click', (e) => {
        e.stopPropagation(); // カードクリックイベントが発火しないように
        menuDropdown.classList.toggle('show');
      });
      
      // ドロップダウンメニューの各項目のクリックイベント
      const dropdownItems = projectCard.querySelectorAll('.dropdown-item');
      dropdownItems.forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          menuDropdown.classList.remove('show');
          
          // 各項目の処理
          if (item.textContent === '削除') {
            if (confirm(`「${project.title}」を削除してもよろしいですか？`)) {
              // 実際には削除APIを呼び出し
              alert(`「${project.title}」を削除しました`);
            }
          } else if (item.textContent === '複製') {
            alert(`「${project.title}」を複製します`);
          } else if (item.textContent === '共有') {
            alert(`「${project.title}」を共有します`);
          }
        });
      });
      
      projectList.appendChild(projectCard);
    }
    
    // ページネーションの更新
    updatePagination(page);
  }
  
  // ページネーションを更新する関数
  function updatePagination(activePage) {
    const totalPages = Math.ceil(dummyProjects.length / projectsPerPage);
    const pagination = document.getElementById('pagination');
    
    // ページネーションが必要ない場合は非表示
    if (totalPages <= 1) {
      pagination.style.display = 'none';
      return;
    }
    
    // ページネーションボタンを生成
    pagination.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.className = `pagination-btn ${i === activePage ? 'active' : ''}`;
      pageBtn.textContent = i;
      pageBtn.dataset.page = i;
      
      // ページボタンのクリックイベント
      pageBtn.addEventListener('click', () => {
        currentPage = i;
        renderProjectList(currentPage);
      });
      
      pagination.appendChild(pageBtn);
    }
  }
  
  // 初期表示
  renderProjectList(currentPage);

  // 新規作成ボタンのイベントリスナー設定
  document.getElementById('new-project-btn').addEventListener('click', () => {
    showNewProjectModal();
  });
  
  // ログアウトボタンのイベントリスナー
  document.getElementById('logout-btn').addEventListener('click', () => {
    if (confirm('ログアウトしますか？')) {
      window.location.hash = '#/login';
    }
  });
  
  // メニュー項目のクリックイベント
  const menuItems = document.querySelectorAll('.menu-item');
  menuItems.forEach(item => {
    if (item.id !== 'logout-btn') {
      item.addEventListener('click', () => {
        // 現在アクティブなメニュー項目のクラスを削除
        document.querySelector('.menu-item.active')?.classList.remove('active');
        // クリックしたメニュー項目にアクティブクラスを追加
        item.classList.add('active');
        
        // メニュー項目に応じた画面表示（将来的な拡張用）
        if (item.textContent === 'メディア一覧') {
          alert('メディア一覧機能は準備中です');
        } else if (item.textContent === '分析') {
          alert('分析機能は準備中です');
        }
      });
    }
  });
  
  // ドキュメント全体のクリックイベント（メニュードロップダウンを閉じる）
  document.addEventListener('click', () => {
    document.querySelectorAll('.card-menu-dropdown.show').forEach(dropdown => {
      dropdown.classList.remove('show');
    });
  });
}