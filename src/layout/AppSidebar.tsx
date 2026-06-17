import React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import {
  ChevronDownIcon,
  GridIcon,
  HorizontalDots,
  UserIcon,
  TaskIcon,
  DollarLineIcon,
  FileIcon,
  FolderIcon,
  MailIcon,
  EnvelopeIcon,
  UserCircleIcon,
  BoltIcon,
  LockIcon,
  PieChartIcon,
} from "../icons";

import { MENU_CONFIG, MenuItem } from "../config/menuConfig";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../hooks/useNotifications";
import { useSidebar } from "../context/SidebarContext";

// ── Icon resolver ─────────────────────────────────────────────────────────
const resolveIcon = (icon: MenuItem["icon"]): React.ReactNode => {
  switch (icon) {
    case "grid":        return <GridIcon />;
    case "users":       return <UserIcon />;
    case "task":        return <TaskIcon />;
    case "dollar":      return <DollarLineIcon />;
    case "file":        return <FileIcon />;
    case "folder":      return <FolderIcon />;
    case "mail":        return <MailIcon />;
    case "user-circle": return <UserCircleIcon />;
    case "bell":        return <EnvelopeIcon />;
    case "settings":    return <BoltIcon />;
    case "shield":      return <LockIcon />;
    case "chart":       return <PieChartIcon />;
    default:            return <GridIcon />;
  }
};

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();

  const logoUrl: string = (import.meta.env.VITE_LOGO_URL as string | undefined) ?? "";

  // Derive menu items from the central config
  const navItems: MenuItem[] = user?.role ? (MENU_CONFIG[user.role] ?? []) : [];

  const [openSubmenu, setOpenSubmenu] = useState<{ index: number } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  // Auto-open submenu when a child route is active
  useEffect(() => {
    let matched = false;
    navItems.forEach((item, idx) => {
      if (item.subItems?.some((sub) => isActive(sub.path))) {
        setOpenSubmenu({ index: idx });
        matched = true;
      }
    });
    if (!matched) setOpenSubmenu(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Calculate submenu height for animation
  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `sub-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prev) => ({
          ...prev,
          [key]: subMenuRefs.current[key]?.scrollHeight ?? 0,
        }));
      }
    }
  }, [openSubmenu]);

  const toggleSubmenu = (index: number) => {
    setOpenSubmenu((prev) =>
      prev?.index === index ? null : { index }
    );
  };

  const showLabel = isExpanded || isHovered || isMobileOpen;

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-screen transition-all duration-300 ease-in-out z-50
        ${isExpanded || isMobileOpen ? "w-[290px]" : isHovered ? "w-[290px]" : "w-[90px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo */}
      <div className={`py-8 flex ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}>
        <Link to="/">
          {showLabel ? (
            <>
              {logoUrl && <img className="dark:hidden" src={logoUrl} alt="Logo" width={150} height={40} />}
              {logoUrl && <img className="hidden dark:block" src={logoUrl} alt="Logo" width={150} height={40} />}
            </>
          ) : (
            logoUrl ? <img src={logoUrl} alt="Logo" width={32} height={32} /> : null
          )}
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 dark:text-gray-500 font-semibold tracking-wider ${
                  !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
                }`}
              >
                {showLabel ? "Menu" : <HorizontalDots className="size-6" />}
              </h2>
            </div>

            <ul className="flex flex-col gap-4">
              {navItems.map((item, index) => (
                <li key={item.key}>
                  {item.subItems ? (
                    /* ── Submenu trigger ── */
                    <>
                      <button
                        onClick={() => toggleSubmenu(index)}
                        className={`menu-item group ${
                          openSubmenu?.index === index ? "menu-item-active" : "menu-item-inactive"
                        } cursor-pointer ${!showLabel ? "lg:justify-center" : "lg:justify-start"}`}
                      >
                        <span
                          className={`menu-item-icon-size ${
                            openSubmenu?.index === index ? "menu-item-icon-active" : "menu-item-icon-inactive"
                          }`}
                        >
                          {resolveIcon(item.icon)}
                        </span>
                        {showLabel && <span className="menu-item-text">{item.label}</span>}
                        {showLabel && (
                          <ChevronDownIcon
                            className={`ml-auto w-5 h-5 transition-transform duration-200 ${
                              openSubmenu?.index === index ? "rotate-180 text-brand-500" : ""
                            }`}
                          />
                        )}
                      </button>

                      {showLabel && (
                        <div
                          ref={(el) => { subMenuRefs.current[`sub-${index}`] = el; }}
                          className="overflow-hidden transition-all duration-300"
                          style={{
                            height: openSubmenu?.index === index
                              ? `${subMenuHeight[`sub-${index}`]}px`
                              : "0px",
                          }}
                        >
                          <ul className="mt-2 space-y-1 ml-9">
                            {item.subItems.map((sub) => (
                              <li key={sub.key}>
                                <Link
                                  to={sub.path}
                                  className={`menu-dropdown-item ${
                                    isActive(sub.path)
                                      ? "menu-dropdown-item-active"
                                      : "menu-dropdown-item-inactive"
                                  }`}
                                >
                                  {sub.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    /* ── Direct link ── */
                    item.path && (
                      <Link
                        to={item.path}
                        className={`menu-item group ${
                          isActive(item.path) ? "menu-item-active" : "menu-item-inactive"
                        }`}
                      >
                        <span
                          className={`menu-item-icon-size ${
                            isActive(item.path) ? "menu-item-icon-active" : "menu-item-icon-inactive"
                          }`}
                        >
                          {resolveIcon(item.icon)}
                        </span>
                        {showLabel && <span className="menu-item-text">{item.label}</span>}
                        {showLabel && item.key === "notifications" && unreadCount > 0 && (
                          <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold rounded-full bg-red-600 text-white">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                      </Link>
                    )
                  )}
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
