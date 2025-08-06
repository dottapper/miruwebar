// src/views/projects.js
import { showNewProjectModal, showConfirmDialog } from '../components/ui.js';
import { getProjects, deleteProject } from '../api/projects-new.js';
import { showVersionInfoModal } from '../components/version-info.js';
import { showLoadingScreenSelector } from '../components/loading-screen-selector.js';
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
        modelSettings: [],
        modelCount: 0,
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
        modelSettings: [],
        modelCount: 0,
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
        <div class="menu-item active" id="projects-menu-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          プロジェクト
        </div>
        <div class="menu-item" id="media-menu-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          メディア一覧
        </div>
        <div class="menu-item" id="analytics-menu-item">
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
        <div class="menu-item" id="loading-screen-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
          </svg>
          ローディング画面一覧
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
  
  // メニュー項目のアクティブ状態を更新
  function updateActiveMenuItem() {
    // 現在のハッシュを取得
    const currentHash = window.location.hash || '#/projects';
    
    // すべてのメニュー項目からアクティブクラスを削除
    document.querySelectorAll('.side-menu .menu-item').forEach(item => {
      item.classList.remove('active');
    });
    
    // 現在のページに対応するメニュー項目をアクティブに設定
    if (currentHash.startsWith('#/projects')) {
      document.getElementById('projects-menu-item')?.classList.add('active');
    } else if (currentHash.startsWith('#/media')) {
      document.getElementById('media-menu-item')?.classList.add('active');
    } else if (currentHash.startsWith('#/analytics')) {
      document.getElementById('analytics-menu-item')?.classList.add('active');
    } else if (currentHash.startsWith('#/loading-screen')) {
      document.getElementById('loading-screen-btn')?.classList.add('active');
    }
  }
  
  // 初期化時とハッシュ変更時にアクティブメニューを更新
  updateActiveMenuItem();
  window.addEventListener('hashchange', updateActiveMenuItem);
  
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

  // ローディング画面一覧ボタンのイベントリスナー設定
  const loadingScreenBtn = document.getElementById('loading-screen-btn');
  if (loadingScreenBtn) {
    loadingScreenBtn.addEventListener('click', () => {
      console.log('ローディング画面一覧ボタンがクリックされました');
      try {
        // ローディング画面選択モーダルを表示
        showLoadingScreenSelector();
      } catch (error) {
        console.error('ローディング画面選択モーダルの表示エラー:', error);
      }
    });
  }

  // グローバルに関数を公開して、デバッグを容易にする
  window.showVersionInfo = showVersionInfoModal;
  
  // デバッグ用：バージョン情報モジュールのパス確認
  console.log("version-info.js のパス：", import.meta.url);
  
  // プロジェクト一覧を表示する関数
  function renderProjectList(page) {
    const projectList = document.getElementById('project-list');
    
    // projectListが存在しない場合のエラーハンドリング
    if (!projectList) {
      console.error('❌ project-list要素が見つかりません');
      return;
    }
    
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
                <span class="date-item">作成 ${formatDate(project.created)}</span>
                <span class="date-separator">•</span>
                <span class="date-item">更新 ${formatDate(project.updated)}</span>
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
          
          <div class="project-info">
            <span class="model-count">3Dモデル: ${project.modelCount || project.modelSettings?.length || project.models?.length || 0}個</span>
            ${project.note ? `<div class="project-note" style="font-size: 0.8em; color: #888; margin-top: 0.5rem;">※ 編集時に3Dモデルの再アップロードが必要</div>` : ''}
          </div>
          
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
      
      // カードのクリックイベント - 編集画面に遷移（メニューボタン除外）
      projectCard.querySelector('.card-content').addEventListener('click', (e) => {
        // メニューボタンやドロップダウンがクリックされた場合は無視
        if (e.target.closest('.card-menu') || e.target.closest('.card-menu-button') || e.target.closest('.card-menu-dropdown')) {
          console.log('メニュー関連のクリックを検出 - カード遷移をキャンセル');
          return;
        }
        console.log('カードクリック - プロジェクト編集画面に遷移:', project.name);
        window.location.hash = `#/editor?id=${project.id}&type=${project.type}`;
      });
      
      // メニューボタンのクリックイベント
      const menuButton = projectCard.querySelector('.card-menu-button');
      const menuDropdown = projectCard.querySelector('.card-menu-dropdown');
      
      console.log('メニューボタンとドロップダウンの要素確認:', {
        menuButton: !!menuButton,
        menuDropdown: !!menuDropdown,
        projectName: project.name
      });
      
      menuButton.addEventListener('click', (e) => {
        console.log('メニューボタンがクリックされました:', project.name);
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation(); // 追加：同一要素の他のイベントリスナーも停止
        
        // 他の全てのドロップダウンを閉じる
        document.querySelectorAll('.card-menu-dropdown.show').forEach(dropdown => {
          if (dropdown !== menuDropdown) {
            dropdown.classList.remove('show');
          }
        });
        
        console.log('ドロップダウンの表示状態を切り替えます');
        menuDropdown.classList.toggle('show');
        console.log('ドロップダウンが表示されました:', menuDropdown.classList.contains('show'));
      });
      
      // ドロップダウンメニューの各項目のクリックイベント
      const dropdownItems = projectCard.querySelectorAll('.dropdown-item');
      dropdownItems.forEach(item => {
        item.addEventListener('click', (e) => {
          console.log('ドロップダウンアイテムがクリックされました:', item.getAttribute('data-action'));
          e.preventDefault();
          e.stopPropagation();
          menuDropdown.classList.remove('show');
          
          const action = item.getAttribute('data-action');
          console.log('実行するアクション:', action);
          
          switch (action) {
            case 'delete':
              console.log('削除処理を開始します:', project.name);
              showConfirmDialog(
                `「${project.name}」を削除してもよろしいですか？`,
                () => {
                  console.log('削除が確認されました。deleteProject関数を呼び出します:', project.id);
                  const success = deleteProject(project.id);
                  console.log('削除結果:', success);
                  
                  if (success) {
                    console.log('削除成功 - プロジェクトリストを更新します');
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
                  } else {
                    console.error('削除に失敗しました');
                    alert('削除に失敗しました。もう一度お試しください。');
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
    
    // 全てのメニューが確実に閉じられているようにする
    document.querySelectorAll('.card-menu-dropdown').forEach(dropdown => {
      dropdown.classList.remove('show');
    });
    
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
      console.log('プロジェクトデータが更新されました');
      renderProjectList(currentPage);
    }
  });

  // ページの表示・非表示切り替え時にプロジェクトリストを更新
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      console.log('ページが表示されました - プロジェクトリストを更新');
      renderProjectList(currentPage);
    }
  });

  // ハッシュ変更時にプロジェクト一覧に戻った場合は更新
  const originalHashChangeHandler = window.onhashchange;
  window.addEventListener('hashchange', (e) => {
    if (originalHashChangeHandler) originalHashChangeHandler(e);
    
    const currentHash = window.location.hash || '#/projects';
    if (currentHash.startsWith('#/projects')) {
      console.log('プロジェクト一覧に戻りました - リストを更新');
      renderProjectList(currentPage);
    }
  });

  // 定期的な更新（他のタブでの変更を検出するため）
  setInterval(() => {
    const currentHash = window.location.hash || '#/projects';
    if (currentHash.startsWith('#/projects')) {
      renderProjectList(currentPage);
    }
  }, 5000); // 5秒ごと

  // ドキュメント全体のクリックイベントでドロップダウンを閉じる
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.card-menu')) {
      document.querySelectorAll('.card-menu-dropdown.show').forEach(dropdown => {
        dropdown.classList.remove('show');
      });
    }
  });

  // 初期化時に全てのメニューが閉じられていることを確保
  setTimeout(() => {
    document.querySelectorAll('.card-menu-dropdown').forEach(dropdown => {
      dropdown.classList.remove('show');
    });
  }, 100);
}