import React, { useState, useRef, useEffect } from 'react';
import { FiMoreVertical, FiCopy, FiTrash2, FiEye } from 'react-icons/fi';

const ProjectCard = ({ project, onDuplicate, onDelete }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        !buttonRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (e) => {
    e.stopPropagation();
    setShowDropdown(!showDropdown);
  };

  const handleDuplicate = (e) => {
    e.stopPropagation();
    onDuplicate(project);
    setShowDropdown(false);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(project);
    setShowDropdown(false);
  };

  return (
    <div className="project-card">
      <div className="card-content">
        <h3 className="project-title">{project.title}</h3>
        <p className="project-description">{project.description}</p>
        
        <div className="project-stats">
          <div className="access-count">
            <FiEye />
            <span>{project.viewCount} 回表示</span>
          </div>
        </div>
      </div>

      <div className="card-menu">
        <button
          ref={buttonRef}
          className="card-menu-button"
          onClick={toggleDropdown}
          aria-label="プロジェクトメニュー"
        >
          <FiMoreVertical size={20} />
        </button>

        <div
          ref={dropdownRef}
          className={`card-menu-dropdown ${showDropdown ? 'show' : ''}`}
        >
          <div className="dropdown-item" onClick={handleDuplicate}>
            <FiCopy size={16} />
            <span>複製する</span>
          </div>
          <div className="dropdown-item delete" onClick={handleDelete}>
            <FiTrash2 size={16} />
            <span>削除する</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard; 