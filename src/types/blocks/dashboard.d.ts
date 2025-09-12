import { Brand, Nav } from "./base";

export interface Dashboard {
  sidebar?: Sidebar;
}

export interface Sidebar {
  brand?: Brand;
  navs?: Nav[];
  bottom_nav?: Nav;
  variant?: "inset" | "sidebar" | "floating";
}
