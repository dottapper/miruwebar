/**
 * ローディング画面設定のデータベースモデル
 * 
 * このファイルはサンプルコードです。実際の実装時には使用しているORMやデータベース構成に合わせて調整してください。
 */

export default (sequelize, DataTypes) => {
  const LoadingScreenSettings = sequelize.define('LoadingScreenSettings', {
    // ユーザーID（設定の所有者）
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    
    // ブランド名/テキスト
    name: {
      type: DataTypes.STRING,
      defaultValue: 'miru-WebAR'
    },
    
    // ロゴ画像のパス（ファイルシステム上）
    logoPath: {
      type: DataTypes.STRING,
      allowNull: true
    },
    
    // ロゴ画像のURL（公開用）
    logoUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    
    // 背景色
    bgColor: {
      type: DataTypes.STRING,
      defaultValue: 'rgba(0, 0, 0, 0.85)'
    },
    
    // テキスト色
    textColor: {
      type: DataTypes.STRING,
      defaultValue: 'white'
    },
    
    // アクセントカラー（プログレスバーの色）
    accentColor: {
      type: DataTypes.STRING,
      defaultValue: '#00a8ff'
    },
    
    // アニメーションタイプ
    animationType: {
      type: DataTypes.STRING,
      defaultValue: 'fade',
      validate: {
        isIn: [['fade', 'slide', 'zoom']]
      }
    }
  }, {
    tableName: 'loading_screen_settings',
    timestamps: true,
    paranoid: true  // 論理削除を有効化
  });

  // アソシエーション（リレーション）
  LoadingScreenSettings.associate = (models) => {
    // ユーザーとのリレーション
    LoadingScreenSettings.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return LoadingScreenSettings;
}; 