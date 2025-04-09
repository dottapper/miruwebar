// src/views/projects.js
import { showNewProjectModal, showConfirmDialog } from '../components/ui.js';
import { getProjects, deleteProject } from '../api/projects.js';
import { showVersionInfoModal } from '../components/version-info.js';
import '../styles/projects.css';
import '../styles/version-info.css'; // バージョン情報モーダル用のスタイル

// フォーマット関数
function formatDate(timestamp) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
}

// ARタイプの日本語表示マッピング
const AR_TYPE_NAMES = {
  'marker': 'マーカー型AR',
  'markerless': 'マーカーレスAR',
  'location': 'ロケーションベースAR',
  'object': '物体認識型AR',
  'face': 'フェイスタイプAR',
  'faceswitch': 'FaceSwitch AR'
};

// デバッグ用：サンプルプロジェクトの作成
function createSampleProjects() {
  const existingProjects = getProjects();
  if (existingProjects.length === 0) {
    const now = Date.now();
    const sampleProjects = [
      {
        id: `project_${now}_1`,
        name: "サンプルプロジェクト1",
        type: "marker",
        settings: {
          isPublic: false
        },
        stats: {
          views: 0
        },
        created: now,
        updated: now
      },
      {
        id: `project_${now}_2`,
        name: "サンプルプロジェクト2",
        type: "markerless",
        settings: {
          isPublic: true
        },
        stats: {
          views: 5
        },
        created: now - 86400000, // 1日前
        updated: now
      }
    ];
    localStorage.setItem('miruwebAR_projects', JSON.stringify(sampleProjects));
    console.log("サンプルプロジェクトを作成しました");
    return sampleProjects;
  }
  return existingProjects;
}

export default function showProjects(container) {
  console.log('showProjects 関数が呼び出されました。');
  
  // サンプルプロジェクトを作成（デバッグ用）
  const projects = createSampleProjects();
  console.log('現在のプロジェクト:', projects);

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
        <!-- バージョン情報ボタン (divに変更) -->
        <div id="version-info-btn" class="version-button">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          バージョン情報
        </div>
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
  
  // バージョン情報ボタンのイベントリスナー設定
  const versionInfoBtn = document.getElementById('version-info-btn');
  if (versionInfoBtn) {
    console.log('バージョン情報ボタンを検出しました');
    versionInfoBtn.addEventListener('click', () => {
      console.log('バージョン情報ボタンがクリックされました');
      try {
        showVersionInfoModal();
      } catch (error) {
        console.error('バージョン情報モーダル表示エラー:', error);
      }
    });
  } else {
    console.warn('バージョン情報ボタンが見つかりません');
  }

  // グローバルに関数を公開して、デバッグを容易にする
  window.showVersionInfo = showVersionInfoModal;
  
  // デバッグ用：バージョン情報モジュールのパス確認
  console.log("version-info.js のパス：", import.meta.url);
  
  // プロジェクト一覧を表示する関数
  function renderProjectList(page) {
    const projectList = document.getElementById('project-list');
    projectList.innerHTML = ''; // リストをクリア
    
    // プロジェクトデータを取得
    let projects = getProjects();
    console.log('表示するプロジェクト:', projects);
    
    // 更新日の降順で並び替え
    projects.sort((a, b) => b.updated - a.updated);
    
    // 表示するプロジェクトの範囲を計算
    const startIndex = (page - 1) * projectsPerPage;
    const endIndex = Math.min(startIndex + projectsPerPage, projects.length);
    
    // プロジェクトがない場合の表示
    if (projects.length === 0) {
      projectList.innerHTML = `
        <div class="no-projects">
          <p>プロジェクトがありません。新規作成ボタンから作成してください。</p>
        </div>
      `;
      return;
    }
    
    // プロジェクトカードを生成
    for (let i = startIndex; i < endIndex; i++) {
      const project = projects[i];
      const projectCard = document.createElement('div');
      projectCard.className = `project-card ${project.settings?.isPublic ? 'public' : 'private'}`;
      
      // カードのHTMLを設定
      projectCard.innerHTML = `
        <div class="card-content">
          <div class="card-header">
            <div class="project-date">
              <div class="date-row">
                <span>作成: ${formatDate(project.created)}</span>
                <span class="date-separator">|</span>
                <span>更新: ${formatDate(project.updated)}</span>
              </div>
            </div>
            <div class="card-menu">
              <button class="card-menu-button" type="button" aria-label="プロジェクトメニュー">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="1"></circle>
                  <circle cx="12" cy="5" r="1"></circle>
                  <circle cx="12" cy="19" r="1"></circle>
                </svg>
              </button>
              <div class="card-menu-dropdown">
                <div class="dropdown-item" data-action="duplicate">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  <span>複製する</span>
                </div>
                <div class="dropdown-item delete" data-action="delete">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                  <span>削除する</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="project-title">${project.name}</div>
          
          <div class="project-type">${AR_TYPE_NAMES[project.type] || project.type}</div>
          
          <div class="card-footer">
            <div class="public-status">
              <label class="switch">
                <input type="checkbox" ${project.settings?.isPublic ? 'checked' : ''}>
                <span class="slider round"></span>
              </label>
              <span class="status-label">${project.settings?.isPublic ? '公開中' : '非公開'}</span>
            </div>
            
            <div class="access-count">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              <span>${project.stats?.views || 0} 回表示</span>
            </div>
          </div>
        </div>
      `;
      
      // カードのクリックイベント - 編集画面に遷移
      projectCard.querySelector('.card-content').addEventListener('click', () => {
        window.location.hash = `#/editor?id=${project.id}&type=${project.type}`;
      });
      
      // メニューボタンのクリックイベント
      const menuButton = projectCard.querySelector('.card-menu-button');
      const menuDropdown = projectCard.querySelector('.card-menu-dropdown');
      
      menuButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 他の全てのドロップダウンを閉じる
        document.querySelectorAll('.card-menu-dropdown.show').forEach(dropdown => {
          if (dropdown !== menuDropdown) {
            dropdown.classList.remove('show');
          }
        });
        
        menuDropdown.classList.toggle('show');
      });
      
      // ドロップダウンメニューの各項目のクリックイベント
      const dropdownItems = projectCard.querySelectorAll('.dropdown-item');
      dropdownItems.forEach(item => {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          menuDropdown.classList.remove('show');
          
          const action = item.getAttribute('data-action');
          switch (action) {
            case 'delete':
              showConfirmDialog(
                `「${project.name}」を削除してもよろしいですか？`,
                () => {
                  const success = deleteProject(project.id);
                  if (success) {
                    renderProjectList(currentPage);
                    const notification = document.createElement('div');
                    notification.className = 'notification success';
                    notification.textContent = `「${project.name}」を削除しました`;
                    document.body.appendChild(notification);
                    setTimeout(() => {
                      if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                      }
                    }, 3000);
                  }
                }
              );
              break;
              
            case 'duplicate':
              // 複製処理（今後実装）
              console.log(`プロジェクト "${project.name}" を複製します`);
              break;
          }
        });
      });
      
      projectList.appendChild(projectCard);
    }
    
    // ページネーションの更新
    updatePagination(page, projects.length);
  }
  
  // ページネーションを更新する関数
  function updatePagination(activePage, totalProjects) {
    const totalPages = Math.ceil(totalProjects / projectsPerPage);
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
  
  // ローカルストレージの変更を監視し、プロジェクトリストを更新
  window.addEventListener('storage', (e) => {
    if (e.key === 'miruwebAR_projects') {
      renderProjectList(currentPage);
    }
  });

  // ドキュメント全体のクリックイベントでドロップダウンを閉じる
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.card-menu')) {
      document.querySelectorAll('.card-menu-dropdown.show').forEach(dropdown => {
        dropdown.classList.remove('show');
      });
    }
  });
}