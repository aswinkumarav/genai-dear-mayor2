/// <reference types="vite-plugin-svgr/client" />

import { useState, useRef, useEffect } from 'react';
import CaretDown from '../../assets/i-caret-down.svg?react';
import DearMayorLogo from '../../assets/dear-mayor-logo.svg?react';
import ShareIcon from '../../assets/i-share.svg?react';
import DarkModeIcon from '../../assets/i-dark-mode.svg?react';
import LightModeIcon from '../../assets/i-light-mode.svg?react';
import IconList from '../IconList/IconList';
import useDarkMode from '../../hooks/useDarkMode';
import { ListItemWithIcon } from '../../types/common';

const Dropdown = () => {
  const [isDropdown, setIsDropdown] = useState(false);
  const { toggleDarkMode } = useDarkMode();

  const listItemsData: ListItemWithIcon[] = [
    {
      icon: <ShareIcon />,
      label: 'Share',
      action: () => {},
    },
    {
      icon: <DarkModeIcon />,
      label: 'Dark mode',
      action: toggleDarkMode,
    },
    {
      icon: <LightModeIcon />,
      label: 'Light mode',
      action: toggleDarkMode,
    },
  ];

  // Close dropdown when clicking outside
  const dropdownRef = useRef<HTMLDivElement>(null);
  const handleClickOutside = (event: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node)
    ) {
      setIsDropdown(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className={`flex items-center justify-between p-2 md:p-3 gap-1 rounded-lg ${isDropdown ? 'bg-chat-dark fill-chat-default' : 'fill-default-txt bg-transparent '} hover:bg-interactive-secondary hover:fill-default-txt  dark:fill-chat-default dark:bg-secondary-txt transition-all duration-200`}
        onClick={() => setIsDropdown(!isDropdown)}
        title="Menu"
      >
        <span className="fill-inherit">
          <DearMayorLogo />
        </span>
        <span className={`${isDropdown ? 'rotate-180' : ''}`}>
          <CaretDown />
        </span>
      </button>
      {isDropdown && <IconList listItems={listItemsData} />}
    </div>
  );
};

export default Dropdown;
