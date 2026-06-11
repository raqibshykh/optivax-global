import React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

// Assume these icons are imported from an icon library
import {
  ChevronDownIcon,
  GridIcon,
  HorizontalDots,
  UserIcon,
  TaskIcon,
  DollarLineIcon,
  FileIcon,
  MailIcon,
  UserCircleIcon,
} from "../icons";
import SidebarWidget from "./SidebarWidget";

/** Removed stray admin UI block */
import { roleMenu } from "../config/roleMenu";
import { useAuth } from "../context/AuthContext";
import { useSidebar } from "../context/SidebarContext";


type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { user } = useAuth();
  const role = user?.role;
  const location = useLocation();

  // Dynamically generate navigation items based on role using roleMenu config


  const getNavItems = () => {
    const menuKeys = role ? roleMenu[role] || [] : [];
    const iconMap: Record<string, React.ReactNode> = {
      dashboard: <GridIcon />,
      clients: <UserIcon />,
      projects: <TaskIcon />,
      billing: <DollarLineIcon />,
      files: <FileIcon />,
      notifications: <MailIcon />,
      revisions: <TaskIcon />,
      email_marketing: <MailIcon />,
      settings: <UserCircleIcon />,
      leads: <UserIcon />,
      tasks: <TaskIcon />,
      users: <UserIcon />,
      departments: <GridIcon />,
      reports: <FileIcon />,
      // add other icons as needed
    };

    const items: NavItem[] = menuKeys.map((key: string) => {
      const base: NavItem = {
        name: key.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
        icon: iconMap[key] || <GridIcon />, // fallback icon
      };
      // Handle submenus for email marketing
      if (key === "email_marketing") {
        base.subItems = [
          { name: "Campaigns", path: "/admin/email/campaigns" },
          { name: "Templates", path: "/admin/email/templates" },
          { name: "Audience", path: "/admin/email/audience" },
          { name: "Analytics", path: "/admin/email/analytics" },
          { name: "Automation", path: "/admin/email/automation" },
        ];
      }
      if (key === "departments" && role === "super_admin") {
        base.subItems = [
          { name: "Overview", path: "/super-admin/departments" },
          { name: "HR Department", path: "/hr/dashboard" },
          { name: "Production", path: "/production/dashboard" },
          { name: "Sales Department", path: "/sales/dashboard" },
          { name: "Marketing", path: "/marketing/dashboard" },
        ];
      }
      // Assign path for standard items
      if (base.subItems) {
        base.path = undefined;
      } else {
        if (role === 'super_admin' && key === 'dashboard') {
          base.name = "Super Admin";
          base.path = "/super-admin/dashboard";
        } else if (role === 'super_admin' && key === 'departments') {
          base.path = "/super-admin/departments";
        } else if (role === 'sales_admin') {
          base.path = "/sales/" + key.replace(/_/g, "-");
        } else if (role === 'production_admin') {
          base.path = "/production/" + key.replace(/_/g, "-");
        } else if (role === 'marketing_admin') {
          base.path = "/marketing/" + key.replace(/_/g, "-");
        } else if (role === 'hr_admin') {
          base.path = "/hr/" + key.replace(/_/g, "-");
        } else if (role === 'management') {
          base.path = "/management/" + key.replace(/_/g, "-");
        } else if (role === 'client') {
          base.path = "/client/" + key.replace(/_/g, "-");
        } else {
          base.path = "/admin/" + key.replace(/_/g, "-");
        }
      }
      return base;
    });
    return items;
  };


const navItems = getNavItems();

const [openSubmenu, setOpenSubmenu] = useState<{
  type: "main" | "others";
  index: number;
} | null>(null);
const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
  {}
);
const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

// const isActive = (path: string) => location.pathname === path;
const isActive = useCallback(
  (path: string) => location.pathname === path,
  [location.pathname]
);

useEffect(() => {
  let submenuMatched = false;
  navItems.forEach((nav, index) => {
    if (nav.subItems) {
      nav.subItems.forEach((subItem) => {
        if (isActive(subItem.path)) {
          setOpenSubmenu({
            type: "main",
            index,
          });
          submenuMatched = true;
        }
      });
    }
  });

  if (!submenuMatched) {
    setOpenSubmenu(null);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [location.pathname]);

useEffect(() => {
  if (openSubmenu !== null) {
    const key = `${openSubmenu.type}-${openSubmenu.index}`;
    if (subMenuRefs.current[key]) {
      setSubMenuHeight((prevHeights) => ({
        ...prevHeights,
        [key]: subMenuRefs.current[key]?.scrollHeight || 0,
      }));
    }
  }
}, [openSubmenu]);

const handleSubmenuToggle = (index: number) => {
  setOpenSubmenu((prevOpenSubmenu) => {
    if (
      prevOpenSubmenu &&
      prevOpenSubmenu.type === "main" &&
      prevOpenSubmenu.index === index
    ) {
      return null;
    }
    return { type: "main", index };
  });
};

const renderMenuItems = (items: NavItem[]) => (
  <ul className="flex flex-col gap-4">
    {items.map((nav, index) => (
      <li key={nav.name}>
        {nav.subItems ? (
          <button
            onClick={() => handleSubmenuToggle(index)}
            className={`menu-item group ${openSubmenu?.type === "main" && openSubmenu?.index === index
                ? "menu-item-active"
                : "menu-item-inactive"
              } cursor-pointer ${!isExpanded && !isHovered
                ? "lg:justify-center"
                : "lg:justify-start"
              }`}
          >
            <span
              className={`menu-item-icon-size  ${openSubmenu?.type === "main" && openSubmenu?.index === index
                  ? "menu-item-icon-active"
                  : "menu-item-icon-inactive"
                }`}
            >
              {nav.icon}
            </span>
            {(isExpanded || isHovered || isMobileOpen) && (
              <span className="menu-item-text">{nav.name}</span>
            )}
            {(isExpanded || isHovered || isMobileOpen) && (
              <ChevronDownIcon
                className={`ml-auto w-5 h-5 transition-transform duration-200 ${openSubmenu?.type === "main" &&
                    openSubmenu?.index === index
                    ? "rotate-180 text-brand-500"
                    : ""
                  }`}
              />
            )}
          </button>
        ) : (
          nav.path && (
            <Link
              to={nav.path}
              className={`menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
            >
              <span
                className={`menu-item-icon-size ${isActive(nav.path)
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                  }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
            </Link>
          )
        )}
        {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
          <div
            ref={(el) => {
              subMenuRefs.current[`main-${index}`] = el;
            }}
            className="overflow-hidden transition-all duration-300"
            style={{
              height:
                openSubmenu?.type === "main" && openSubmenu?.index === index
                  ? `${subMenuHeight[`main-${index}`]}px`
                  : "0px",
            }}
          >
            <ul className="mt-2 space-y-1 ml-9">
              {nav.subItems.map((subItem) => (
                <li key={subItem.name}>
                  <Link
                    to={subItem.path}
                    className={`menu-dropdown-item ${isActive(subItem.path)
                        ? "menu-dropdown-item-active"
                        : "menu-dropdown-item-inactive"
                      }`}
                  >
                    {subItem.name}
                    <span className="flex items-center gap-1 ml-auto">
                      {subItem.new && (
                        <span
                          className={`ml-auto ${isActive(subItem.path)
                              ? "menu-dropdown-badge-active"
                              : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge`}
                        >
                          new
                        </span>
                      )}
                      {subItem.pro && (
                        <span
                          className={`ml-auto ${isActive(subItem.path)
                              ? "menu-dropdown-badge-active"
                              : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge`}
                        >
                          pro
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </li>
    ))}
  </ul>
);

return (
  <aside
    className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-slate-20 dark:bg-slate-900 dark:border-slate-700 text-white h-screen transition-all duration-300 ease-in-out z-50 border-r border-slate-700
        ${isExpanded || isMobileOpen
        ? "w-[290px]"
        : isHovered
          ? "w-[290px]"
          : "w-[90px]"
      }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
    onMouseEnter={() => !isExpanded && setIsHovered(true)}
    onMouseLeave={() => setIsHovered(false)}
  >
    <div
      className={`py-8 flex ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
    >
      <Link to="/">
        {isExpanded || isHovered || isMobileOpen ? (
          <>
            <img
              className="dark:hidden"
              src="http://localhost/optivax-global/wp-content/uploads/2026/06/logo-icon.png"
              alt="Logo"
              width={150}
              height={40}
            />
            <img
              className="hidden dark:block"
              src="http://localhost/optivax-global/wp-content/uploads/2026/06/logo-icon.png"
              alt="Logo"
              width={150}
              height={40}
            />
          </>
        ) : (
          <img
            src="http://localhost/optivax-global/wp-content/uploads/2026/06/logo-icon.png"
            alt="Logo"
            width={32}
            height={32}
          />
        )}
      </Link>
    </div>
    <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
      <nav className="mb-6">
        <div className="flex flex-col gap-4">
          <div>
            <h2
              className={`mb-4 text-xs uppercase flex leading-[20px] text-blue-200 ${!isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "justify-start"
                }`}
            >
              {isExpanded || isHovered || isMobileOpen ? (
                "Menu"
              ) : (
                <HorizontalDots className="size-6" />
              )}
            </h2>
        </div>
        {renderMenuItems(navItems)}
      </div>
    </nav>
  </div>
  </aside>
);
};

export default AppSidebar;
